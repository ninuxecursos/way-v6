-- ============ ROOMS / HOSPEDAGEM ============
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  capacity integer NOT NULL DEFAULT 1,
  base_price_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_image_url text,
  gallery text[] DEFAULT ARRAY[]::text[],
  position integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active rooms" ON public.rooms FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "Editors manage rooms" ON public.rooms FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'editor')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'editor'));
CREATE POLICY "Editors view all rooms" ON public.rooms FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'editor'));
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.room_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  locale text NOT NULL,
  name text NOT NULL,
  description text,
  highlights jsonb DEFAULT '[]'::jsonb,
  meta_title text,
  meta_description text,
  UNIQUE (room_id, locale)
);
ALTER TABLE public.room_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads room translations" ON public.room_translations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editors manage room translations" ON public.room_translations FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'editor')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'editor'));

CREATE TABLE public.room_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  date date NOT NULL,
  available_units integer NOT NULL DEFAULT 0,
  price_cents bigint,
  notes text,
  UNIQUE (room_id, date)
);
ALTER TABLE public.room_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads availability" ON public.room_availability FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff manage availability" ON public.room_availability FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'financeiro'));

CREATE TABLE public.room_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid,
  customer_email text NOT NULL,
  customer_name text,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  total_cents bigint NOT NULL DEFAULT 0,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bookings" ON public.room_bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Staff manage bookings" ON public.room_bookings FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'));
CREATE TRIGGER room_bookings_updated_at BEFORE UPDATE ON public.room_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AI PROVIDERS ============
CREATE TABLE public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider_type text NOT NULL, -- 'kling','gemini','openai','custom'
  capability text NOT NULL, -- 'image','video','text','audio'
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_ref text,
  active boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage AI providers" ON public.ai_providers FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  user_id uuid,
  capability text NOT NULL,
  prompt text,
  tokens_input integer,
  tokens_output integer,
  cost_cents bigint,
  status text NOT NULL DEFAULT 'ok',
  error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view AI usage" ON public.ai_usage_logs FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link_url text,
  data jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read_at);
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY,
  email_marketing boolean NOT NULL DEFAULT true,
  email_orders boolean NOT NULL DEFAULT true,
  email_comments boolean NOT NULL DEFAULT true,
  inapp_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prefs" ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view all prefs" ON public.notification_preferences FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- ============ MFA ============
CREATE TABLE public.mfa_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  factor_type text NOT NULL DEFAULT 'totp',
  friendly_name text,
  secret_encrypted text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mfa_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own factors" ON public.mfa_factors FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Super admins view factors" ON public.mfa_factors FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

-- ============ COUPONS ============
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percent', -- 'percent' | 'fixed'
  discount_value numeric NOT NULL DEFAULT 0,
  min_amount_cents bigint DEFAULT 0,
  max_uses integer,
  max_uses_per_user integer,
  uses_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active coupons" ON public.coupons FOR SELECT TO anon, authenticated
  USING (active = true AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "Staff manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'));
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid,
  discount_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Staff manage redemptions" ON public.coupon_redemptions FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'));