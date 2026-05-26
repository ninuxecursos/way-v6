
ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS external_event_id text,
  ADD COLUMN IF NOT EXISTS raw_body text;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_event_uniq
  ON public.webhook_events (provider, external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx
  ON public.user_roles (user_id);
