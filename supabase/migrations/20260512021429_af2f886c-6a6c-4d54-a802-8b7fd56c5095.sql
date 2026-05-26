
-- Customer segments (dynamic via filter rules stored as JSONB)
CREATE TABLE public.customer_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  color text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_segments_updated BEFORE UPDATE ON public.customer_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins manage segments" ON public.customer_segments
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'));

-- Manual segment membership (in addition to dynamic rules)
CREATE TABLE public.customer_segment_members (
  segment_id uuid NOT NULL REFERENCES public.customer_segments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_by uuid,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (segment_id, user_id)
);
CREATE POLICY "Admins manage segment members" ON public.customer_segment_members
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'));

-- Internal notes attached to a customer
CREATE TABLE public.customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  author_id uuid,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_notes_user ON public.customer_notes(user_id);
CREATE TRIGGER trg_cnotes_updated BEFORE UPDATE ON public.customer_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins manage customer notes" ON public.customer_notes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'));

-- Customer profile extras (marketing consent, locale, tags)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale text DEFAULT 'pt',
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Transactional email templates (multi-locale via JSONB)
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE, -- e.g. order_paid, welcome, password_reset
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  -- translations: { pt: { subject, html, text }, en: {...}, es: {...} }
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  variables_doc jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_etpl_updated BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins manage email templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Staff read email templates" ON public.email_templates
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'financeiro'));

-- Email provider configuration (one row per provider; future: resend, sendgrid, smtp)
CREATE TABLE public.email_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider_type text NOT NULL, -- resend | sendgrid | smtp | mock
  active boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb, -- { from_email, from_name, api_endpoint, smtp_host, ... }
  secret_ref text, -- name of secret env var (e.g. RESEND_API_KEY)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_eprov_updated BEFORE UPDATE ON public.email_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins manage email providers" ON public.email_providers
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Outbox queue (ready to dispatch when provider is connected)
CREATE TABLE public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_slug text,
  to_email text NOT NULL,
  to_name text,
  user_id uuid,
  locale text NOT NULL DEFAULT 'pt',
  subject text NOT NULL,
  html text NOT NULL,
  text_body text,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | failed | skipped
  provider_id uuid,
  provider_message_id text,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_outbox_status ON public.email_outbox(status, scheduled_for);
CREATE INDEX idx_outbox_user ON public.email_outbox(user_id);
CREATE TRIGGER trg_outbox_updated BEFORE UPDATE ON public.email_outbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins manage outbox" ON public.email_outbox
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Users view own emails" ON public.email_outbox
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Aggregated customer stats view (server-side via security definer fn for safety)
CREATE OR REPLACE FUNCTION public.get_customer_stats(_user_id uuid)
RETURNS TABLE (
  orders_count bigint,
  paid_orders_count bigint,
  total_spent_cents bigint,
  last_order_at timestamptz,
  first_order_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE status = 'paid')::bigint,
    COALESCE(SUM(CASE WHEN status = 'paid' THEN total_cents ELSE 0 END), 0)::bigint,
    MAX(created_at),
    MIN(created_at)
  FROM public.orders
  WHERE user_id = _user_id;
$$;
