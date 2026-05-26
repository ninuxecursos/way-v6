
create or replace function public.reservation_group_join_paid(
  _coupon text,
  _order_id uuid,
  _user_id uuid,
  _full_name text,
  _email text,
  _phone text
) returns reservation_group_members
language plpgsql
security definer
set search_path = public
as $$
declare
  _group public.reservation_groups;
  _used int;
  _existing public.reservation_group_members;
  _member public.reservation_group_members;
begin
  if _coupon is null or btrim(_coupon) = '' then raise exception 'coupon_required'; end if;
  if _order_id is null then raise exception 'order_required'; end if;
  if _user_id is null then raise exception 'user_required'; end if;

  select * into _group
    from public.reservation_groups
    where coupon_code = upper(btrim(_coupon))
    for update;

  if _group.id is null then raise exception 'coupon_not_found'; end if;
  if _group.status <> 'open' then raise exception 'group_closed'; end if;

  select count(*) into _used from public.reservation_group_members
    where group_id = _group.id;
  if _used >= _group.capacity then raise exception 'group_full'; end if;

  select * into _existing from public.reservation_group_members
    where group_id = _group.id and user_id = _user_id
    limit 1;
  if _existing.id is not null then
    update public.orders set group_id = _group.id where id = _order_id;
    return _existing;
  end if;

  insert into public.reservation_group_members
    (group_id, order_id, user_id, full_name, email, phone, role, payment_status)
  values
    (_group.id, _order_id, _user_id, _full_name, _email, _phone, 'member', 'paid')
  returning * into _member;

  update public.orders set group_id = _group.id where id = _order_id;

  return _member;
end;
$$;

revoke execute on function public.reservation_group_join_paid(text,uuid,uuid,text,text,text) from anon, authenticated;
grant execute on function public.reservation_group_join_paid(text,uuid,uuid,text,text,text) to service_role;
comment on function public.reservation_group_join_paid is 'Vincula um pedido pago a um grupo Galera de forma atômica (lock + capacity check). Server-only.';

create or replace function public.get_group_coupon_public(_coupon text)
returns table(
  coupon_code text,
  holder_first_name text,
  product_slug text,
  product_name text,
  capacity int,
  used int,
  available int,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with g as (
    select * from public.reservation_groups
    where coupon_code = upper(btrim(_coupon))
    limit 1
  ),
  m as (
    select count(*)::int as used from public.reservation_group_members
    where group_id = (select id from g)
  ),
  p as (
    select (translations->'pt'->>'name') as name
    from public.products
    where slug = (select product_slug from g)
    limit 1
  )
  select
    g.coupon_code,
    split_part(g.holder_name, ' ', 1) as holder_first_name,
    g.product_slug,
    coalesce((select name from p), g.product_slug) as product_name,
    g.capacity,
    (select used from m),
    greatest(0, g.capacity - (select used from m)) as available,
    g.status::text,
    g.created_at
  from g;
$$;

grant execute on function public.get_group_coupon_public(text) to anon, authenticated;
comment on function public.get_group_coupon_public is 'Preview publico (anon) de cupom Galera - apenas dados nao sensiveis.';
