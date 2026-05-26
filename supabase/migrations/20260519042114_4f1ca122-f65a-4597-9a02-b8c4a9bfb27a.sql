-- participants extras
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS reservation_type text,
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1;

-- terms_acceptance extras
ALTER TABLE public.terms_acceptance
  ADD COLUMN IF NOT EXISTS participant_id uuid,
  ADD COLUMN IF NOT EXISTS accepted_terms boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepted_privacy boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepted_image_rights boolean DEFAULT false;

-- event_reviews extras
ALTER TABLE public.event_reviews ADD COLUMN IF NOT EXISTS legacy boolean DEFAULT false;

-- products extras
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS event_starts_at timestamptz;

-- orders extras (lembretes)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS reminder_30_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_7_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_1_sent_at timestamptz;

-- register_participant atualizado com cpf
DROP FUNCTION IF EXISTS public.register_participant(text,text,text,text,text,date);
CREATE OR REPLACE FUNCTION public.register_participant(
  _full_name text, _email text, _gender text, _document text, _phone text, _birthdate date, _cpf text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.participants(user_id, full_name, email, gender, document, phone, birthdate, cpf)
  VALUES (auth.uid(), _full_name, _email, _gender, _document, _phone, _birthdate, _cpf)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.register_participant(text,text,text,text,text,date,text) TO authenticated;

-- reservation_group_create aceita _holder_order_id opcional
DROP FUNCTION IF EXISTS public.reservation_group_create(text,uuid,text,text,text,text,integer);
CREATE OR REPLACE FUNCTION public.reservation_group_create(
  _coupon_code text, _holder_user_id uuid, _holder_name text, _holder_email text,
  _product_slug text, _product_name text, _capacity integer, _holder_order_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.reservation_groups(coupon_code, holder_user_id, holder_name, holder_email, product_slug, product_name, capacity)
  VALUES (upper(_coupon_code), _holder_user_id, _holder_name, _holder_email, _product_slug, _product_name, _capacity)
  RETURNING id INTO _id;
  IF _holder_order_id IS NOT NULL THEN
    INSERT INTO public.reservation_group_members(group_id, user_id, full_name, email, role, payment_status, order_id)
    VALUES (_id, _holder_user_id, _holder_name, _holder_email, 'holder', 'paid', _holder_order_id);
  END IF;
  RETURN _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.reservation_group_create(text,uuid,text,text,text,text,integer,uuid) TO authenticated;