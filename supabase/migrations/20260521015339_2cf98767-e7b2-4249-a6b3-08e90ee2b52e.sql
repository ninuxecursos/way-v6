
CREATE OR REPLACE FUNCTION public.admin_delete_auth_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_auth_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_auth_user(uuid) TO authenticated;
