
-- 1) Permitir kind NULL (quarto "neutro" sem tipo definido)
alter table public.accommodation_rooms
  alter column kind drop not null,
  alter column kind drop default;

alter table public.accommodation_rooms
  drop constraint if exists accommodation_rooms_kind_check;

alter table public.accommodation_rooms
  add constraint accommodation_rooms_kind_check
  check (kind is null or kind in ('individual','galera'));

-- 2) allocate_individual_room: prefere quartos individuais, depois neutros; carimba neutros
create or replace function public.allocate_individual_room(_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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
    select r.id, r.capacity, r.room_number, r.kind,
           (select count(*) from public.orders o where o.room_id = r.id and o.status = 'paid') as occupied
    from public.accommodation_rooms r
    where r.active = true
      and (r.kind = 'individual' or r.kind is null)
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
  -- prefere quartos já carimbados como individual; depois neutros
  order by (case when c.kind = 'individual' then 0 else 1 end), c.room_number
  limit 1
  for update skip locked;

  if _room_id is null then
    update public.orders set allocation_status = 'pending_manual' where id = _order_id;
    return null;
  end if;

  -- carimba se neutro
  update public.accommodation_rooms
    set kind = 'individual', updated_at = now()
    where id = _room_id and kind is null;

  update public.orders
    set room_id = _room_id, allocation_status = 'allocated'
    where id = _order_id;

  perform public.accommodation_room_recompute_status(_room_id);
  return _room_id;
end;
$$;

-- 3) allocate_galera_room: prefere quarto já do grupo; depois neutro vazio; depois individual vazio
create or replace function public.allocate_galera_room(_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _room_id uuid;
begin
  if _group_id is null then return null; end if;
  select id into _room_id from public.accommodation_rooms where group_id = _group_id limit 1;
  if _room_id is not null then return _room_id; end if;

  -- 1ª tentativa: quarto neutro vazio
  select id into _room_id
  from public.accommodation_rooms
  where active = true
    and kind is null
    and status = 'available'
    and group_id is null
    and not exists (select 1 from public.orders o where o.room_id = accommodation_rooms.id and o.status = 'paid')
  order by room_number
  limit 1
  for update skip locked;

  -- 2ª tentativa: quarto individual vazio (fallback)
  if _room_id is null then
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
  end if;

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

-- 4) guard atualizado: permite ciclo neutro <-> tipo; bloqueia apenas individual<->galera com hóspedes
create or replace function public.accommodation_rooms_guard_kind()
returns trigger
language plpgsql
set search_path = public
as $$
declare _occupied int;
begin
  if old.kind is distinct from new.kind then
    -- só bloqueia troca entre individual e galera quando há hóspedes
    if old.kind is not null and new.kind is not null then
      select count(*) into _occupied from public.orders where room_id = new.id and status = 'paid';
      if _occupied > 0 then
        raise exception 'cannot_change_kind_of_occupied_room';
      end if;
    end if;
    if new.kind = 'individual' or new.kind is null then
      new.group_id := null;
    end if;
  end if;
  return new;
end;
$$;

-- 5) trigger: quando o último ocupante sai, reseta kind/group para neutro
create or replace function public.accommodation_room_reset_on_empty(_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare _occupied int;
begin
  if _room_id is null then return; end if;
  select count(*) into _occupied from public.orders
    where room_id = _room_id and status = 'paid';
  if _occupied = 0 then
    update public.accommodation_rooms
      set kind = null, group_id = null, status = 'available', updated_at = now()
      where id = _room_id
        and status not in ('blocked','maintenance');
  end if;
end;
$$;

-- Reaproveita orders_on_room_change para também resetar
create or replace function public.orders_on_room_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.room_id is distinct from new.room_id then
    if old.room_id is not null then
      perform public.accommodation_room_recompute_status(old.room_id);
      perform public.accommodation_room_reset_on_empty(old.room_id);
    end if;
    if new.room_id is not null then
      perform public.accommodation_room_recompute_status(new.room_id);
    end if;
  end if;
  return new;
end;
$$;

-- Também ao mudar status do pedido (paid -> cancelled/refunded/etc.)
create or replace function public.orders_on_status_change_reset_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status and old.status = 'paid' and new.room_id is not null then
    perform public.accommodation_room_recompute_status(new.room_id);
    perform public.accommodation_room_reset_on_empty(new.room_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_status_reset_room on public.orders;
create trigger trg_orders_status_reset_room
  after update of status on public.orders
  for each row execute function public.orders_on_status_change_reset_room();
