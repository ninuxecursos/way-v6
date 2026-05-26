CREATE OR REPLACE FUNCTION public.check_auth_lockout(_email text)
RETURNS TABLE(locked boolean, attempts_left integer, max_attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _normalized text := lower(trim(_email));
  _failed integer := 0;
  _locked boolean := false;
  _max integer := 5;
BEGIN
  SELECT failed_attempts, auth_lockouts.locked
    INTO _failed, _locked
  FROM public.auth_lockouts
  WHERE email = _normalized;

  _failed := COALESCE(_failed, 0);
  _locked := COALESCE(_locked, false) OR _failed >= _max;

  RETURN QUERY SELECT _locked, GREATEST(0, _max - _failed), _max;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_failed_login(_email text)
RETURNS TABLE(locked boolean, attempts_left integer, max_attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _normalized text := lower(trim(_email));
  _failed integer := 0;
  _already_locked boolean := false;
  _locked boolean := false;
  _max integer := 5;
  _now timestamptz := now();
BEGIN
  SELECT failed_attempts, auth_lockouts.locked
    INTO _failed, _already_locked
  FROM public.auth_lockouts
  WHERE email = _normalized;

  _failed := COALESCE(_failed, 0) + 1;
  _already_locked := COALESCE(_already_locked, false);
  _locked := _already_locked OR _failed >= _max;

  INSERT INTO public.auth_lockouts (email, failed_attempts, locked, last_attempt_at, locked_at)
  VALUES (_normalized, _failed, _locked, _now, CASE WHEN _locked THEN _now ELSE NULL END)
  ON CONFLICT (email) DO UPDATE SET
    failed_attempts = EXCLUDED.failed_attempts,
    locked = EXCLUDED.locked,
    last_attempt_at = EXCLUDED.last_attempt_at,
    locked_at = CASE
      WHEN public.auth_lockouts.locked THEN public.auth_lockouts.locked_at
      WHEN EXCLUDED.locked THEN _now
      ELSE NULL
    END;

  RETURN QUERY SELECT _locked, GREATEST(0, _max - _failed), _max;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_auth_lockout(_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.auth_lockouts
  WHERE email = lower(trim(_email));

  SELECT true;
$$;

REVOKE ALL ON FUNCTION public.check_auth_lockout(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_failed_login(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_auth_lockout(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.check_auth_lockout(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_failed_login(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_auth_lockout(text) TO anon, authenticated;