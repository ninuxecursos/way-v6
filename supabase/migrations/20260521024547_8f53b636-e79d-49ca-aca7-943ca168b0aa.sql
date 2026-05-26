
-- 1) RPC que vincula um pedido pago a um grupo via cupom de forma atômica.
CREATE OR REPLACE FUNCTION public.reservation_group_join_paid(
  _coupon text,
  _order_id uuid,
  _user_id uuid,
  _full_name text,
  _email text,
  _phone text
) RETURNS TABLE(group_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _g public.reservation_groups;
  _existing public.reservation_group_members;
  _count int;
BEGIN
  IF _coupon IS NULL OR length(trim(_coupon)) = 0 THEN
    RAISE EXCEPTION 'coupon_not_found';
  END IF;

  -- Lock da row do grupo para evitar race de capacidade.
  SELECT * INTO _g
  FROM public.reservation_groups
  WHERE upper(coupon_code) = upper(trim(_coupon))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'coupon_not_found';
  END IF;

  IF _g.status <> 'open' THEN
    RAISE EXCEPTION 'group_closed';
  END IF;

  -- Idempotência: se o pedido já está vinculado a algum membro, retorna o grupo.
  SELECT * INTO _existing
  FROM public.reservation_group_members
  WHERE order_id = _order_id
  LIMIT 1;
  IF FOUND THEN
    -- Garante que o pedido também tenha o group_id atualizado.
    UPDATE public.orders SET group_id = _existing.group_id WHERE id = _order_id AND (group_id IS NULL OR group_id <> _existing.group_id);
    group_id := _existing.group_id;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO _count
  FROM public.reservation_group_members
  WHERE reservation_group_members.group_id = _g.id;

  IF _count >= _g.capacity THEN
    RAISE EXCEPTION 'group_full';
  END IF;

  INSERT INTO public.reservation_group_members(
    group_id, user_id, full_name, email, phone, role, payment_status, order_id
  ) VALUES (
    _g.id, _user_id, COALESCE(NULLIF(trim(_full_name), ''), _email), _email,
    NULLIF(trim(_phone), ''), 'member', 'paid', _order_id
  );

  UPDATE public.orders SET group_id = _g.id WHERE id = _order_id;

  group_id := _g.id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.reservation_group_join_paid(text, uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reservation_group_join_paid(text, uuid, uuid, text, text, text) TO service_role;

-- 2) Backfill: vincula pedidos pagos órfãos que tinham cupom de grupo no metadata.
DO $$
DECLARE
  o record;
  meta jsonb;
  cup text;
BEGIN
  FOR o IN
    SELECT id, user_id, customer_email, metadata
    FROM public.orders
    WHERE status = 'paid'
      AND reservation_type = 'shared'
      AND group_id IS NULL
      AND COALESCE((metadata->>'is_group_holder')::boolean, false) = false
      AND COALESCE(metadata->>'group_coupon_code','') <> ''
  LOOP
    meta := COALESCE(o.metadata, '{}'::jsonb);
    cup  := upper(trim(meta->>'group_coupon_code'));
    BEGIN
      PERFORM public.reservation_group_join_paid(
        cup,
        o.id,
        o.user_id,
        COALESCE(meta->>'customer_name', o.customer_email),
        o.customer_email,
        COALESCE(meta->>'customer_phone','')
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'backfill skip order %: %', o.id, SQLERRM;
    END;
  END LOOP;
END $$;
