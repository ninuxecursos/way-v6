CREATE TABLE IF NOT EXISTS public.auth_lockouts (
  email text PRIMARY KEY,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked boolean NOT NULL DEFAULT false,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_lockouts ENABLE ROW LEVEL SECURITY;

-- No policies = no client access. Service role bypasses RLS.

CREATE TRIGGER trg_auth_lockouts_updated
  BEFORE UPDATE ON public.auth_lockouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();