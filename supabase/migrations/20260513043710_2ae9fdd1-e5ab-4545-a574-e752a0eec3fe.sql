-- 1. Remove política temporária de diagnóstico
DROP POLICY IF EXISTS tmp_open_insert_participants ON public.participants;

-- 2. Função SECURITY DEFINER para inserir participantes (fallback à RLS)
CREATE OR REPLACE FUNCTION public.register_participant(
  _full_name text,
  _cpf text,
  _phone text,
  _email text,
  _city text,
  _gender text,
  _reservation_type text,
  _product_id uuid DEFAULT NULL,
  _quantity integer DEFAULT 1,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.participants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.participants;
  _uid uuid := auth.uid();
BEGIN
  IF _full_name IS NULL OR length(btrim(_full_name)) < 2 THEN
    RAISE EXCEPTION 'invalid_full_name';
  END IF;
  IF _email IS NULL OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF _cpf IS NULL OR length(regexp_replace(_cpf, '\D', '', 'g')) <> 11 THEN
    RAISE EXCEPTION 'invalid_cpf';
  END IF;
  IF _gender NOT IN ('m','f','other') THEN
    RAISE EXCEPTION 'invalid_gender';
  END IF;
  IF _quantity IS NULL OR _quantity < 1 OR _quantity > 50 THEN
    RAISE EXCEPTION 'invalid_quantity';
  END IF;

  INSERT INTO public.participants (
    user_id, full_name, cpf, phone, email, city, gender,
    reservation_type, product_id, quantity, metadata
  ) VALUES (
    _uid,
    btrim(_full_name),
    regexp_replace(_cpf, '\D', '', 'g'),
    btrim(_phone),
    lower(btrim(_email)),
    btrim(_city),
    _gender,
    _reservation_type,
    _product_id,
    _quantity,
    COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.register_participant(
  text, text, text, text, text, text, text, uuid, integer, jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_participant(
  text, text, text, text, text, text, text, uuid, integer, jsonb
) TO anon, authenticated;