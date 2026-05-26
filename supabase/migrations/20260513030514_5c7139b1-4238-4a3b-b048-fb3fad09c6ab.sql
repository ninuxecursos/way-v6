
alter table public.orders
  add column if not exists participant_id uuid references public.participants(id) on delete set null,
  add column if not exists reservation_type text,
  add column if not exists base_price_cents bigint,
  add column if not exists final_price_cents bigint,
  add column if not exists payment_method text,
  add column if not exists installment_quantity integer,
  add column if not exists payment_status text;

create index if not exists orders_participant_idx on public.orders (participant_id);
create index if not exists orders_payment_status_idx on public.orders (payment_status);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_payment_method_check') then
    alter table public.orders
      add constraint orders_payment_method_check
      check (payment_method is null or payment_method in ('pix','credit_card','boleto','manual'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_payment_status_check') then
    alter table public.orders
      add constraint orders_payment_status_check
      check (payment_status is null or payment_status in ('pending','processing','paid','failed','refunded','cancelled'));
  end if;
end $$;
