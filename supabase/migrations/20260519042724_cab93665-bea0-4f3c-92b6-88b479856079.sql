-- 1) reservation_groups: closed_at / closed_by
ALTER TABLE public.reservation_groups
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid;

-- 2) webhook_events: retry + idempotência
ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_event_uniq
  ON public.webhook_events (provider, external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS webhook_events_retry_idx
  ON public.webhook_events (next_retry_at)
  WHERE processed = false AND next_retry_at IS NOT NULL;

-- 3) terms_acceptance: user_id nullable
ALTER TABLE public.terms_acceptance
  ALTER COLUMN user_id DROP NOT NULL;

-- 4) register_participant alinhado ao código (cpf, city, reservation_type, product_id, quantity, metadata)
DROP FUNCTION IF EXISTS public.register_participant(text,text,text,text,text,date,text);
DROP FUNCTION IF EXISTS public.register_participant(text,text,text,text,text,date);

CREATE OR REPLACE FUNCTION public.register_participant(
  _full_name text,
  _cpf text,
  _phone text,
  _email text,
  _city text,
  _gender text,
  _reservation_type text,
  _quantity integer,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _product_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.participants(
    user_id, full_name, cpf, phone, email, city, gender,
    reservation_type, product_id, quantity, metadata
  )
  VALUES (
    auth.uid(), _full_name, _cpf, _phone, _email, _city, _gender,
    _reservation_type, _product_id, COALESCE(_quantity, 1), COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_participant(text,text,text,text,text,text,text,integer,jsonb,uuid) TO authenticated;

-- 5) reservation_group_create alinhado ao código (product_id, email, phone)
DROP FUNCTION IF EXISTS public.reservation_group_create(text,uuid,text,text,text,text,integer,uuid);
DROP FUNCTION IF EXISTS public.reservation_group_create(text,uuid,text,text,text,text,integer);

CREATE OR REPLACE FUNCTION public.reservation_group_create(
  _holder_user_id uuid,
  _holder_name text,
  _holder_order_id uuid,
  _product_id uuid,
  _product_slug text,
  _capacity integer,
  _email text,
  _phone text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _code text;
BEGIN
  -- Gera um cupom único de 6 chars
  LOOP
    _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.reservation_groups WHERE coupon_code = _code);
  END LOOP;

  INSERT INTO public.reservation_groups(
    coupon_code, holder_user_id, holder_name, holder_email, product_slug, capacity, metadata
  )
  VALUES (
    _code, _holder_user_id, _holder_name, _email, _product_slug, _capacity,
    jsonb_build_object('product_id', _product_id, 'phone', _phone)
  )
  RETURNING id INTO _id;

  IF _holder_order_id IS NOT NULL THEN
    INSERT INTO public.reservation_group_members(group_id, user_id, full_name, email, role, payment_status, order_id)
    VALUES (_id, _holder_user_id, _holder_name, _email, 'holder', 'paid', _holder_order_id);
  END IF;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reservation_group_create(uuid,text,uuid,uuid,text,integer,text,text) TO authenticated;