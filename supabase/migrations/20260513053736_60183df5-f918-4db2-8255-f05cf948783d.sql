create table if not exists public.reservation_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists reservation_drafts_user_id_unique on public.reservation_drafts(user_id);

alter table public.reservation_drafts enable row level security;

create policy "Users select own draft"
  on public.reservation_drafts
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users insert own draft"
  on public.reservation_drafts
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users update own draft"
  on public.reservation_drafts
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users delete own draft"
  on public.reservation_drafts
  for delete
  to authenticated
  using (user_id = auth.uid());

drop trigger if exists reservation_drafts_set_updated_at on public.reservation_drafts;
create trigger reservation_drafts_set_updated_at
  before update on public.reservation_drafts
  for each row execute function public.update_updated_at_column();