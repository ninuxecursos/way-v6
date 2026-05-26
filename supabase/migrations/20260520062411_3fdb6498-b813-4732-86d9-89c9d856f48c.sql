
-- Exige usuário autenticado em register_participant
CREATE OR REPLACE FUNCTION public.register_participant(_full_name text, _cpf text, _phone text, _email text, _city text, _gender text, _reservation_type text, _quantity integer, _metadata jsonb DEFAULT '{}'::jsonb, _product_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING HINT = 'Faça login para concluir a reserva.';
  END IF;
  INSERT INTO public.participants(
    user_id, full_name, cpf, phone, email, city, gender,
    reservation_type, product_id, quantity, metadata
  )
  VALUES (
    _uid, _full_name, _cpf, _phone, _email, _city, _gender,
    _reservation_type, _product_id, COALESCE(_quantity, 1), COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO _id;
  RETURN _id;
END;
$function$;

-- Exige usuário autenticado em register_terms_acceptance
CREATE OR REPLACE FUNCTION public.register_terms_acceptance(_participant_id uuid, _accepted_terms boolean, _accepted_privacy boolean, _accepted_image_rights boolean, _terms_version text, _user_agent text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING HINT = 'Faça login para concluir a reserva.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.participants WHERE id = _participant_id) THEN
    RAISE EXCEPTION 'participant_not_found';
  END IF;
  INSERT INTO public.terms_acceptance(
    user_id, participant_id, accepted_terms, accepted_privacy,
    accepted_image_rights, terms_version, user_agent
  )
  VALUES (
    _uid, _participant_id, COALESCE(_accepted_terms, true),
    COALESCE(_accepted_privacy, true), COALESCE(_accepted_image_rights, false),
    _terms_version, _user_agent
  )
  RETURNING id INTO _id;
  RETURN _id;
END;
$function$;
