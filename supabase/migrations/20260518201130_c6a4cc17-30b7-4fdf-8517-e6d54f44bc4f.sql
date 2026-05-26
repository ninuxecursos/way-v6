-- Extende a tabela existente event_reviews com os campos da nova UI
alter table public.event_reviews
  add column if not exists display_name text,
  add column if not exists city text,
  add column if not exists avatar_url text,
  add column if not exists photos text[] not null default array[]::text[],
  add column if not exists video_url text,
  add column if not exists title text,
  add column if not exists featured boolean not null default false,
  add column if not exists moderator_note text,
  add column if not exists approved_at timestamp with time zone,
  add column if not exists approved_by uuid;

-- Garante uma avaliação por pedido (regra de negócio)
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'event_reviews_order_id_unique'
  ) then
    alter table public.event_reviews
      add constraint event_reviews_order_id_unique unique (order_id);
  end if;
end $$;

-- Garante que o pedido pertence ao usuário e está pago — validação via trigger
create or replace function public.event_reviews_validate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _order public.orders;
begin
  if new.order_id is null then
    raise exception 'order_required';
  end if;
  select * into _order from public.orders where id = new.order_id;
  if _order.id is null then
    raise exception 'order_not_found';
  end if;
  if _order.user_id is distinct from new.user_id then
    raise exception 'order_not_owned';
  end if;
  if _order.status <> 'paid' then
    raise exception 'order_not_paid';
  end if;
  if new.rating < 1 or new.rating > 5 then
    raise exception 'invalid_rating';
  end if;
  return new;
end;
$$;

drop trigger if exists event_reviews_validate_trg on public.event_reviews;
create trigger event_reviews_validate_trg
  before insert or update of order_id, user_id, rating on public.event_reviews
  for each row execute function public.event_reviews_validate();

-- Marca quando vira approved
create or replace function public.event_reviews_stamp_approved()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    new.approved_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists event_reviews_stamp_approved_trg on public.event_reviews;
create trigger event_reviews_stamp_approved_trg
  before update on public.event_reviews
  for each row execute function public.event_reviews_stamp_approved();

create index if not exists event_reviews_featured_idx
  on public.event_reviews (featured desc, approved_at desc nulls last)
  where status = 'approved';
