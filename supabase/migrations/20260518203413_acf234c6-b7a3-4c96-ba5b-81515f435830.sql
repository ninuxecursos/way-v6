
-- 1) Adiciona colunas em orders ANTES de qualquer função/política que as referencia
create table if not exists public.accommodation_rooms (
  id uuid primary key default gen_random_uuid(),
  room_number integer not null unique,
  capacity integer not null default 8 check (capacity > 0 and capacity <= 50),
  kind text not null default 'individual' check (kind in ('individual','galera')),
  status text not null default 'available' check (status in ('available','partial','full','blocked','maintenance')),
  active boolean not null default true,
  group_id uuid references public.reservation_groups(id) on delete set null,
  gender_policy text not null default 'mixed' check (gender_policy in ('mixed','male','female')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists room_id uuid references public.accommodation_rooms(id) on delete set null,
  add column if not exists allocation_status text;

create index if not exists idx_accommodation_rooms_kind on public.accommodation_rooms(kind);
create index if not exists idx_accommodation_rooms_status on public.accommodation_rooms(status);
create index if not exists idx_accommodation_rooms_group on public.accommodation_rooms(group_id);
create index if not exists idx_orders_room on public.orders(room_id);

alter table public.accommodation_rooms enable row level security;

create policy "Admins manage accommodation rooms"
  on public.accommodation_rooms
  for all to authenticated
  using (is_admin(auth.uid()) or has_role(auth.uid(), 'financeiro'::app_role))
  with check (is_admin(auth.uid()) or has_role(auth.uid(), 'financeiro'::app_role));

create policy "Users view own room"
  on public.accommodation_rooms
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.room_id = accommodation_rooms.id and o.user_id = auth.uid()
    )
  );

drop trigger if exists trg_accommodation_rooms_updated_at on public.accommodation_rooms;
create trigger trg_accommodation_rooms_updated_at
  before update on public.accommodation_rooms
  for each row execute function public.update_updated_at_column();

-- Seed 55 quartos (idempotente)
insert into public.accommodation_rooms (room_number, capacity, kind, gender_policy)
select n, 8, 'individual', 'mixed' from generate_series(1, 55) as n
on conflict (room_number) do nothing;

-- 2) Recalcula status
create or replace function public.accommodation_room_recompute_status(_room_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  _room public.accommodation_rooms;
  _occupied int;
begin
  select * into _room from public.accommodation_rooms where id = _room_id;
  if _room.id is null then return; end if;
  if _room.status in ('blocked','maintenance') then return; end if;

  select count(*) into _occupied from public.orders
    where room_id = _room_id and status = 'paid';

  update public.accommodation_rooms
    set status = case
      when _occupied = 0 then 'available'
      when _occupied >= _room.capacity then 'full'
      else 'partial'
    end,
    updated_at = now()
    where id = _room_id;
end;
$$;

-- 3) Aloca quarto Galera (inteiro)
create or replace function public.allocate_galera_room(_group_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _room_id uuid;
begin
  if _group_id is null then return null; end if;
  select id into _room_id from public.accommodation_rooms where group_id = _group_id limit 1;
  if _room_id is not null then return _room_id; end if;

  select id into _room_id
  from public.accommodation_rooms
  where active = true
    and kind = 'individual'
    and status = 'available'
    and group_id is null
    and not exists (select 1 from public.orders o where o.room_id = accommodation_rooms.id and o.status = 'paid')
  order by room_number
  limit 1
  for update skip locked;

  if _room_id is null then return null; end if;

  update public.accommodation_rooms
    set kind = 'galera', group_id = _group_id, status = 'partial', updated_at = now()
    where id = _room_id;

  update public.orders o
    set room_id = _room_id, allocation_status = 'allocated'
    where exists (
      select 1 from public.reservation_group_members m
      where m.order_id = o.id and m.group_id = _group_id
    );

  perform public.accommodation_room_recompute_status(_room_id);
  return _room_id;
end;
$$;

-- 4) Aloca quarto individual
create or replace function public.allocate_individual_room(_order_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _order public.orders;
  _participant public.participants;
  _gender text;
  _room_id uuid;
begin
  select * into _order from public.orders where id = _order_id;
  if _order.id is null then return null; end if;
  if _order.room_id is not null then return _order.room_id; end if;

  if _order.participant_id is not null then
    select * into _participant from public.participants where id = _order.participant_id;
    _gender := _participant.gender;
  end if;

  select c.id into _room_id from (
    select r.id, r.capacity, r.room_number,
           (select count(*) from public.orders o where o.room_id = r.id and o.status = 'paid') as occupied
    from public.accommodation_rooms r
    where r.active = true
      and r.kind = 'individual'
      and r.status not in ('full','blocked','maintenance')
      and r.group_id is null
      and (
        r.gender_policy = 'mixed'
        or (r.gender_policy = 'male' and _gender = 'm')
        or (r.gender_policy = 'female' and _gender = 'f')
        or _gender is null
      )
  ) c
  where c.occupied < c.capacity
  order by c.room_number
  limit 1
  for update skip locked;

  if _room_id is null then
    update public.orders set allocation_status = 'pending_manual' where id = _order_id;
    return null;
  end if;

  update public.orders
    set room_id = _room_id, allocation_status = 'allocated'
    where id = _order_id;

  perform public.accommodation_room_recompute_status(_room_id);
  return _room_id;
end;
$$;

-- 5) Triggers em orders
create or replace function public.orders_on_paid_allocate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and (old.status is distinct from 'paid') then
    if new.group_id is not null then
      perform public.allocate_galera_room(new.group_id);
    elsif new.room_id is null and coalesce(new.reservation_type, 'individual') = 'individual' then
      perform public.allocate_individual_room(new.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_on_paid_allocate on public.orders;
create trigger trg_orders_on_paid_allocate
  after update of status on public.orders
  for each row execute function public.orders_on_paid_allocate();

create or replace function public.orders_on_room_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.room_id is distinct from new.room_id then
    if old.room_id is not null then
      perform public.accommodation_room_recompute_status(old.room_id);
    end if;
    if new.room_id is not null then
      perform public.accommodation_room_recompute_status(new.room_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_on_room_change on public.orders;
create trigger trg_orders_on_room_change
  after update of room_id on public.orders
  for each row execute function public.orders_on_room_change();

-- 6) Patch em reservation_group_create para reservar quarto físico
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
language plpgsql security definer set search_path = public as $$
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

  perform public.allocate_galera_room(_group.id);

  return _group;
end;
$$;

-- 7) Proteção: não trocar kind de quarto ocupado
create or replace function public.accommodation_rooms_guard_kind()
returns trigger language plpgsql set search_path = public as $$
declare _occupied int;
begin
  if old.kind is distinct from new.kind then
    select count(*) into _occupied from public.orders where room_id = new.id and status = 'paid';
    if _occupied > 0 then
      raise exception 'cannot_change_kind_of_occupied_room';
    end if;
    if new.kind = 'individual' then
      new.group_id := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_accommodation_rooms_guard_kind on public.accommodation_rooms;
create trigger trg_accommodation_rooms_guard_kind
  before update on public.accommodation_rooms
  for each row execute function public.accommodation_rooms_guard_kind();
