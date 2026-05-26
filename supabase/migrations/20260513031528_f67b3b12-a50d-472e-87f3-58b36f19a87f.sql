ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_retry_at timestamptz;

CREATE INDEX IF NOT EXISTS webhook_events_retry_idx
  ON public.webhook_events (next_retry_at)
  WHERE processed = false AND next_retry_at IS NOT NULL;