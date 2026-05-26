
-- Backfill profiles for any auth.users sem profile (defensivo).
INSERT INTO public.profiles (id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Backfill role 'customer' para users sem nenhum papel.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'customer'::app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id);

-- RPC para super_admin promover/rebaixar papéis (nunca mexe em super_admin).
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_target uuid, _role app_role, _add boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _role = 'super_admin' THEN
    RAISE EXCEPTION 'cannot modify super_admin role';
  END IF;
  IF _add THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_target, _role)
      ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _target AND role = _role;
  END IF;
END;
$$;
