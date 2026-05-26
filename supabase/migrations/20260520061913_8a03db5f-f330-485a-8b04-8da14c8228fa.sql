CREATE OR REPLACE FUNCTION public.register_terms_acceptance(
  _participant_id uuid,
  _accepted_terms boolean,
  _accepted_privacy boolean,
  _accepted_image_rights boolean,
  _terms_version text,
  _user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.participants WHERE id = _participant_id) THEN
    RAISE EXCEPTION 'participant_not_found';
  END IF;

  INSERT INTO public.terms_acceptance(
    user_id, participant_id, accepted_terms, accepted_privacy,
    accepted_image_rights, terms_version, user_agent
  )
  VALUES (
    auth.uid(), _participant_id, COALESCE(_accepted_terms, true),
    COALESCE(_accepted_privacy, true), COALESCE(_accepted_image_rights, false),
    _terms_version, _user_agent
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_terms_acceptance(uuid, boolean, boolean, boolean, text, text) TO anon, authenticated;