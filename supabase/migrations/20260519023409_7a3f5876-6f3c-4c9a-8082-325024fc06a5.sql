-- Gap 1: janela de evento com data + hora
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS event_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS event_ends_at timestamptz;

-- Backfill a partir de event_date (00:00 / 23:59 do dia, fuso America/Sao_Paulo)
UPDATE public.products
SET event_starts_at = (event_date::text || ' 00:00:00-03')::timestamptz,
    event_ends_at   = (event_date::text || ' 23:59:59-03')::timestamptz
WHERE event_date IS NOT NULL AND event_starts_at IS NULL;

-- Gap 2: cupons promocionais
CREATE TABLE IF NOT EXISTS public.promo_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value integer NOT NULL CHECK (discount_value > 0),
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  min_order_cents bigint NOT NULL DEFAULT 0,
  product_slugs text[],
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promo coupons"
  ON public.promo_coupons FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Finance reads promo coupons"
  ON public.promo_coupons FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE TRIGGER trg_promo_coupons_updated
  BEFORE UPDATE ON public.promo_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_promo_coupons_code ON public.promo_coupons (code);
CREATE INDEX IF NOT EXISTS idx_promo_coupons_active ON public.promo_coupons (active) WHERE active = true;

-- RPC pública: valida cupom e retorna desconto em centavos
CREATE OR REPLACE FUNCTION public.validate_promo_coupon(
  _code text,
  _product_slug text,
  _amount_cents bigint
) RETURNS TABLE(
  valid boolean,
  reason text,
  code text,
  discount_type text,
  discount_value integer,
  discount_cents bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _c public.promo_coupons;
  _disc bigint := 0;
BEGIN
  SELECT * INTO _c FROM public.promo_coupons
    WHERE code = upper(btrim(_code)) LIMIT 1;

  IF _c.id IS NULL THEN
    RETURN QUERY SELECT false, 'not_found'::text, null::text, null::text, null::int, 0::bigint; RETURN;
  END IF;
  IF NOT _c.active THEN
    RETURN QUERY SELECT false, 'inactive'::text, _c.code, _c.discount_type, _c.discount_value, 0::bigint; RETURN;
  END IF;
  IF _c.starts_at IS NOT NULL AND _c.starts_at > now() THEN
    RETURN QUERY SELECT false, 'not_started'::text, _c.code, _c.discount_type, _c.discount_value, 0::bigint; RETURN;
  END IF;
  IF _c.ends_at IS NOT NULL AND _c.ends_at < now() THEN
    RETURN QUERY SELECT false, 'expired'::text, _c.code, _c.discount_type, _c.discount_value, 0::bigint; RETURN;
  END IF;
  IF _c.max_uses IS NOT NULL AND _c.used_count >= _c.max_uses THEN
    RETURN QUERY SELECT false, 'exhausted'::text, _c.code, _c.discount_type, _c.discount_value, 0::bigint; RETURN;
  END IF;
  IF _c.min_order_cents > 0 AND _amount_cents < _c.min_order_cents THEN
    RETURN QUERY SELECT false, 'min_order'::text, _c.code, _c.discount_type, _c.discount_value, 0::bigint; RETURN;
  END IF;
  IF _c.product_slugs IS NOT NULL AND array_length(_c.product_slugs, 1) > 0
     AND (_product_slug IS NULL OR NOT (_product_slug = ANY (_c.product_slugs))) THEN
    RETURN QUERY SELECT false, 'product_not_eligible'::text, _c.code, _c.discount_type, _c.discount_value, 0::bigint; RETURN;
  END IF;

  IF _c.discount_type = 'percent' THEN
    _disc := (_amount_cents * _c.discount_value) / 100;
  ELSE
    _disc := _c.discount_value;
  END IF;
  IF _disc > _amount_cents THEN _disc := _amount_cents; END IF;

  RETURN QUERY SELECT true, 'ok'::text, _c.code, _c.discount_type, _c.discount_value, _disc;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_promo_coupon(text, text, bigint) TO anon, authenticated;

-- Função para incrementar used_count após pagamento (usada por webhook server-side)
CREATE OR REPLACE FUNCTION public.increment_promo_coupon_usage(_code text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.promo_coupons
  SET used_count = used_count + 1, updated_at = now()
  WHERE code = upper(btrim(_code));
$$;