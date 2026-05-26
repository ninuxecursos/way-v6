
-- ============================================================
-- Analytics first-party
-- ============================================================

-- Sessions
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  session_id text PRIMARY KEY,
  visitor_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address text,
  ip_country text,
  ip_region text,
  ip_city text,
  ip_lat numeric,
  ip_lng numeric,
  user_agent text,
  device_type text,
  os text,
  os_version text,
  browser text,
  browser_version text,
  screen_w integer,
  screen_h integer,
  viewport_w integer,
  viewport_h integer,
  language text,
  timezone text,
  referrer text,
  referrer_domain text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  landing_path text,
  exit_path text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  pageviews_count integer NOT NULL DEFAULT 0,
  events_count integer NOT NULL DEFAULT 0,
  is_bot boolean NOT NULL DEFAULT false,
  is_admin_excluded boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at
  ON public.analytics_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor
  ON public.analytics_sessions (visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user
  ON public.analytics_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_last_seen
  ON public.analytics_sessions (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_country
  ON public.analytics_sessions (ip_country);

ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read analytics sessions"
  ON public.analytics_sessions
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES public.analytics_sessions(session_id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  path text,
  page_title text,
  element_tag text,
  element_id text,
  element_class text,
  element_text text,
  element_selector text,
  x integer,
  y integer,
  scroll_depth_pct integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON public.analytics_events (session_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_time
  ON public.analytics_events (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_path
  ON public.analytics_events (path);
CREATE INDEX IF NOT EXISTS idx_analytics_events_occurred
  ON public.analytics_events (occurred_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read analytics events"
  ON public.analytics_events
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Admin exclusions
CREATE TABLE IF NOT EXISTS public.analytics_admin_exclusions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.analytics_admin_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage analytics exclusions"
  ON public.analytics_admin_exclusions
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Settings (singleton)
CREATE TABLE IF NOT EXISTS public.analytics_settings (
  id boolean PRIMARY KEY DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  retention_days integer NOT NULL DEFAULT 365,
  anonymize_ip boolean NOT NULL DEFAULT false,
  exclude_bots boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_settings_singleton CHECK (id)
);

INSERT INTO public.analytics_settings (id) VALUES (true)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.analytics_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read analytics settings"
  ON public.analytics_settings
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins update analytics settings"
  ON public.analytics_settings
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Seed: exclui todos os super_admin e admin atuais.
INSERT INTO public.analytics_admin_exclusions (user_id, reason)
  SELECT DISTINCT ur.user_id, 'auto: admin role'
  FROM public.user_roles ur
  WHERE ur.role IN ('super_admin','admin')
  ON CONFLICT (user_id) DO NOTHING;
