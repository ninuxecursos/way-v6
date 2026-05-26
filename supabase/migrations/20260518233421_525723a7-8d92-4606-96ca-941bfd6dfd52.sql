
create or replace function public.get_auth_user_basic(_user_id uuid)
returns table (
  email text,
  phone text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  provider text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    u.email::text,
    u.phone::text,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.created_at,
    (u.raw_app_meta_data->>'provider')::text as provider
  from auth.users u
  where u.id = _user_id
    and exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.role in ('super_admin','admin','financeiro')
    );
$$;

revoke all on function public.get_auth_user_basic(uuid) from public, anon;
grant execute on function public.get_auth_user_basic(uuid) to authenticated;
