
create table if not exists public.terms_acceptance (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  accepted_terms boolean not null default false,
  accepted_privacy boolean not null default false,
  accepted_image_rights boolean not null default false,
  terms_version text not null default 'v1.0',
  ip_address text,
  user_agent text,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists terms_acceptance_participant_idx on public.terms_acceptance (participant_id);
create index if not exists terms_acceptance_accepted_at_idx on public.terms_acceptance (accepted_at desc);

alter table public.terms_acceptance enable row level security;

create policy "Public can insert terms acceptance"
  on public.terms_acceptance
  for insert
  to anon, authenticated
  with check (accepted_terms = true and accepted_privacy = true);

create policy "Admins view terms acceptance"
  on public.terms_acceptance
  for select
  to authenticated
  using (is_admin(auth.uid()) or has_role(auth.uid(), 'financeiro'::app_role));

create policy "Admins update terms acceptance"
  on public.terms_acceptance
  for update
  to authenticated
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create policy "Admins delete terms acceptance"
  on public.terms_acceptance
  for delete
  to authenticated
  using (is_admin(auth.uid()));

create policy "Users view own terms acceptance"
  on public.terms_acceptance
  for select
  to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.id = terms_acceptance.participant_id
        and (
          p.user_id = auth.uid()
          or lower(p.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
        )
    )
  );
