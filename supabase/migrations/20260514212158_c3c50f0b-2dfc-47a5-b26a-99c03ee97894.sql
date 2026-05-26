
-- 1) Tabela principal: grupo/quarto Galera
create table public.reservation_groups (
  id uuid primary key default gen_random_uuid(),
  coupon_code text not null unique,
  holder_user_id uuid not null,
  holder_name text not null,
  holder_order_id uuid,
  product_id uuid not null,
  product_slug text not null,
  capacity int not null check (capacity between 2 and 20),
  status text not null default 'open'
    check (status in ('open','completed','closed_manual','cancelled')),
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reservation_groups_holder_idx on public.reservation_groups(holder_user_id);
create index reservation_groups_status_idx on public.reservation_groups(status);

alter table public.reservation_groups enable row level security;

-- 2) Membros do grupo (1 linha por pessoa)
create table public.reservation_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.reservation_groups(id) on delete cascade,
  order_id uuid not null unique,
  user_id uuid not null,
  participant_id uuid,
  full_name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('holder','member')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','failed','refunded')),
  joined_at timestamptz not null default now()
);

create index reservation_group_members_group_idx on public.reservation_group_members(group_id);
create index reservation_group_members_user_idx on public.reservation_group_members(user_id);
create unique index reservation_group_members_unique_user on public.reservation_group_members(group_id, user_id);

alter table public.reservation_group_members enable row level security;

-- 3) Coluna em orders
alter table public.orders add column if not exists group_id uuid references public.reservation_groups(id);
create index if not exists orders_group_idx on public.orders(group_id);

-- 4) Helpers (security definer) para evitar recursão em RLS
create or replace function public.is_group_member(_group_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.reservation_group_members
    where group_id = _group_id and user_id = _user_id
  );
$$;

-- 5) RLS policies
-- reservation_groups
create policy "Holder and members view group"
on public.reservation_groups
for select
to authenticated
using (
  holder_user_id = auth.uid()
  or public.is_group_member(id, auth.uid())
  or public.is_admin(auth.uid())
  or public.has_role(auth.uid(), 'financeiro'::app_role)
);

create policy "Admins manage groups"
on public.reservation_groups
for all
to authenticated
using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'financeiro'::app_role))
with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'financeiro'::app_role));

-- reservation_group_members
create policy "Members view own group members"
on public.reservation_group_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_group_member(group_id, auth.uid())
  or public.is_admin(auth.uid())
  or public.has_role(auth.uid(), 'financeiro'::app_role)
);

create policy "Admins manage group members"
on public.reservation_group_members
for all
to authenticated
using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'financeiro'::app_role))
with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'financeiro'::app_role));

-- 6) Função: gerar slug de cupom a partir do nome
create or replace function public.generate_group_coupon(_name text, _capacity int)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  _first text;
  _slug text;
  _candidate text;
  _suffix int := 0;
begin
  _first := split_part(btrim(_name), ' ', 1);
  -- normaliza: tira acentos e não-letras, uppercase
  _slug := upper(regexp_replace(translate(_first,
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  ), '[^A-Za-z]', '', 'g'));
  if _slug = '' then _slug := 'GRUPO'; end if;

  _candidate := 'GRUPO' || _slug || lpad(_capacity::text, 2, '0');
  while exists (select 1 from public.reservation_groups where coupon_code = _candidate) loop
    _suffix := _suffix + 1;
    _candidate := 'GRUPO' || _slug || lpad(_capacity::text, 2, '0') || '-' || _suffix::text;
  end loop;
  return _candidate;
end;
$$;

-- 7) Função: criar grupo (titular) — chamada pelo webhook após pagamento confirmado
create or replace function public.reservation_group_create(
  _holder_user_id uuid,
  _holder_name text,
  _holder_order_id uuid,
  _product_id uuid,
  _product_slug text,
  _capacity int,
  _email text,
  _phone text
) returns public.reservation_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  _coupon text;
  _group public.reservation_groups;
begin
  if _capacity is null or _capacity < 2 then
    raise exception 'invalid_capacity';
  end if;

  _coupon := public.generate_group_coupon(_holder_name, _capacity);

  insert into public.reservation_groups
    (coupon_code, holder_user_id, holder_name, holder_order_id, product_id, product_slug, capacity)
  values
    (_coupon, _holder_user_id, _holder_name, _holder_order_id, _product_id, _product_slug, _capacity)
  returning * into _group;

  insert into public.reservation_group_members
    (group_id, order_id, user_id, full_name, email, phone, role, payment_status)
  values
    (_group.id, _holder_order_id, _holder_user_id, _holder_name, _email, _phone, 'holder', 'paid');

  update public.orders set group_id = _group.id where id = _holder_order_id;

  return _group;
end;
$$;

-- 8) Função: validar cupom e juntar (chamada no checkout do membro)
create or replace function public.reservation_group_join(
  _coupon text,
  _order_id uuid,
  _full_name text,
  _email text,
  _phone text
) returns public.reservation_group_members
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _group public.reservation_groups;
  _count int;
  _member public.reservation_group_members;
begin
  if _uid is null then raise exception 'unauthorized'; end if;
  select * into _group from public.reservation_groups where coupon_code = upper(btrim(_coupon)) for update;
  if _group.id is null then raise exception 'coupon_not_found'; end if;
  if _group.status <> 'open' then raise exception 'group_closed'; end if;

  select count(*) into _count from public.reservation_group_members where group_id = _group.id;
  if _count >= _group.capacity then raise exception 'group_full'; end if;

  if exists (select 1 from public.reservation_group_members where group_id = _group.id and user_id = _uid) then
    raise exception 'already_member';
  end if;

  insert into public.reservation_group_members
    (group_id, order_id, user_id, full_name, email, phone, role, payment_status)
  values
    (_group.id, _order_id, _uid, _full_name, _email, _phone, 'member', 'pending')
  returning * into _member;

  update public.orders set group_id = _group.id where id = _order_id;

  return _member;
end;
$$;

-- 9) Trigger: quando order vira "paid", marca o member como paid e fecha grupo se completo
create or replace function public.reservation_group_on_order_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _paid_count int;
  _capacity int;
begin
  if new.status = 'paid' and (old.status is distinct from 'paid') and new.group_id is not null then
    update public.reservation_group_members
      set payment_status = 'paid'
      where order_id = new.id;

    select count(*) filter (where payment_status = 'paid'), max(rg.capacity)
      into _paid_count, _capacity
    from public.reservation_group_members m
    join public.reservation_groups rg on rg.id = m.group_id
    where m.group_id = new.group_id;

    if _paid_count >= _capacity then
      update public.reservation_groups
        set status = 'completed', closed_at = now(), updated_at = now()
        where id = new.group_id and status = 'open';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reservation_group_on_order_paid on public.orders;
create trigger trg_reservation_group_on_order_paid
after update of status on public.orders
for each row
execute function public.reservation_group_on_order_paid();

-- 10) updated_at trigger no reservation_groups
drop trigger if exists trg_reservation_groups_updated_at on public.reservation_groups;
create trigger trg_reservation_groups_updated_at
before update on public.reservation_groups
for each row
execute function public.update_updated_at_column();
