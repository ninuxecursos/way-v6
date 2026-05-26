create or replace function public.get_public_avatars(_ids uuid[])
returns table(id uuid, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.avatar_url
  from public.profiles p
  where p.id = any(_ids);
$$;
grant execute on function public.get_public_avatars(uuid[]) to anon, authenticated;