CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _has_admin boolean;
  _role app_role;
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'full_name'
  );

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE role IN ('super_admin', 'admin')
  ) INTO _has_admin;

  IF _has_admin THEN
    _role := 'customer';
  ELSE
    _role := 'super_admin';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);

  RETURN NEW;
END;
$function$;