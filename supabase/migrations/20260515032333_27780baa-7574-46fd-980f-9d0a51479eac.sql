ALTER TABLE public.reservation_groups
  ADD COLUMN IF NOT EXISTS notified_complete_at timestamptz;