ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bus_checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS bus_checked_in_by uuid,
  ADD COLUMN IF NOT EXISTS lodging_checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS lodging_checked_in_by uuid;

-- Retro-compatibilidade: pedidos que já tinham checked_in_at marcado contam como
-- "lodging" validado (comportamento anterior do botão único de check-in).
UPDATE public.orders
SET lodging_checked_in_at = checked_in_at,
    lodging_checked_in_by = checked_in_by
WHERE checked_in_at IS NOT NULL AND lodging_checked_in_at IS NULL;