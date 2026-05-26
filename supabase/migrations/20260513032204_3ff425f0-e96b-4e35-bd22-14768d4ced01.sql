-- 1) Defense-in-depth: explicit RESTRICTIVE policies on user_roles
-- Even without a permissive INSERT/UPDATE/DELETE policy (which would already
-- default-deny), a RESTRICTIVE policy guarantees no future permissive policy
-- can accidentally let a non-super-admin assign roles to themselves.
DROP POLICY IF EXISTS "Only super admins can insert roles" ON public.user_roles;
CREATE POLICY "Only super admins can insert roles"
  ON public.user_roles AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Only super admins can update roles" ON public.user_roles;
CREATE POLICY "Only super admins can update roles"
  ON public.user_roles AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Only super admins can delete roles" ON public.user_roles;
CREATE POLICY "Only super admins can delete roles"
  ON public.user_roles AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 2) Stop public listing of media-public bucket while keeping direct URL access.
-- Public buckets remain readable via the public CDN URL even without an
-- explicit SELECT policy on storage.objects, so removing this policy only
-- blocks the storage.list() API (file enumeration), which is the warning.
DROP POLICY IF EXISTS "Public reads media-public files" ON storage.objects;