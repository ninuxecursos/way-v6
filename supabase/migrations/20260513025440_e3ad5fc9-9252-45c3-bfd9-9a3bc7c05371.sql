
-- Tabela de participantes (cadastro pré-checkout do fluxo de reserva)
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  full_name text not null,
  cpf text not null,
  phone text not null,
  email text not null,
  city text not null,
  gender text not null,
  reservation_type text not null,
  product_id uuid,
  quantity integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint participants_gender_check check (gender in ('m','f','other')),
  constraint participants_cpf_check check (char_length(regexp_replace(cpf, '\D', '', 'g')) = 11),
  constraint participants_quantity_check check (quantity between 1 and 50)
);

create index if not exists participants_email_idx on public.participants (lower(email));
create index if not exists participants_cpf_idx on public.participants (cpf);
create index if not exists participants_created_at_idx on public.participants (created_at desc);

alter table public.participants enable row level security;

-- Cadastro público (pré-checkout, antes de autenticar)
create policy "Public can insert participants"
  on public.participants
  for insert
  to anon, authenticated
  with check (true);

-- Admins / financeiro veem tudo
create policy "Admins view participants"
  on public.participants
  for select
  to authenticated
  using (is_admin(auth.uid()) or has_role(auth.uid(), 'financeiro'::app_role));

create policy "Admins update participants"
  on public.participants
  for update
  to authenticated
  using (is_admin(auth.uid()) or has_role(auth.uid(), 'financeiro'::app_role))
  with check (is_admin(auth.uid()) or has_role(auth.uid(), 'financeiro'::app_role));

create policy "Admins delete participants"
  on public.participants
  for delete
  to authenticated
  using (is_admin(auth.uid()));

-- Usuário autenticado vê seus próprios cadastros (por user_id ou email)
create policy "Users view own participants"
  on public.participants
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );

-- Trigger updated_at
drop trigger if exists set_participants_updated_at on public.participants;
create trigger set_participants_updated_at
before update on public.participants
for each row execute function public.update_updated_at_column();
