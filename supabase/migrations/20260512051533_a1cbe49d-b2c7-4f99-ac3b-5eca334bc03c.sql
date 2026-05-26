REVOKE EXECUTE ON FUNCTION public.clear_auth_lockout(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.clear_auth_lockout(text) TO authenticated;