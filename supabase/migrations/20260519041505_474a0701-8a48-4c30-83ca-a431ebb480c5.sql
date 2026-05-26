-- ============ BLOG ============
CREATE TABLE public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  position integer NOT NULL DEFAULT 0,
  icon text, color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.blog_category_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('pt','en','es')),
  name text NOT NULL, description text, meta_title text, meta_description text,
  UNIQUE (category_id, locale)
);

CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','archived')),
  author_id uuid, cover_image_url text, cover_alt text,
  featured boolean NOT NULL DEFAULT false,
  reading_time_min integer,
  views_count bigint NOT NULL DEFAULT 0,
  comments_count bigint NOT NULL DEFAULT 0,
  geo_score integer,
  geo_keywords text[] DEFAULT ARRAY[]::text[],
  published_at timestamptz, scheduled_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_posts_status_published ON public.blog_posts(status, published_at DESC);
CREATE INDEX idx_blog_posts_featured ON public.blog_posts(featured) WHERE featured = true;

CREATE TABLE public.blog_post_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('pt','en','es')),
  title text NOT NULL, slug text NOT NULL, excerpt text,
  content_markdown text NOT NULL DEFAULT '',
  content_html text, meta_title text, meta_description text,
  og_image_url text, canonical_url text, schema_jsonld jsonb,
  geo_summary text, geo_faq jsonb DEFAULT '[]'::jsonb,
  geo_entities text[] DEFAULT ARRAY[]::text[],
  UNIQUE (post_id, locale), UNIQUE (locale, slug)
);

CREATE TABLE public.blog_post_categories (
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  customer_email text NOT NULL,
  total_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','refunded','cancelled','failed')),
  payment_provider text, payment_provider_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user_status ON public.orders(user_id, status);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_type text NOT NULL, product_ref text, description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents bigint NOT NULL DEFAULT 0,
  total_cents bigint NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ COMMENTS ============
CREATE TABLE public.blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 5000),
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected','flagged')),
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_comments_post ON public.blog_comments(post_id, created_at DESC);

CREATE TABLE public.blog_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id, reaction)
);

CREATE OR REPLACE FUNCTION public.is_buyer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.orders WHERE user_id = _user_id AND status = 'paid')
$$;

CREATE OR REPLACE FUNCTION public.set_published_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN NEW.published_at = now(); END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_blog_posts_published_at BEFORE INSERT OR UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.set_published_at();
CREATE TRIGGER trg_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_blog_categories_updated_at BEFORE UPDATE ON public.blog_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_blog_comments_updated_at BEFORE UPDATE ON public.blog_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.refresh_post_comments_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    UPDATE public.blog_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN
    UPDATE public.blog_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    IF NEW.status = 'approved' THEN UPDATE public.blog_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF OLD.status = 'approved' THEN UPDATE public.blog_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = NEW.post_id; END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_blog_comments_count AFTER INSERT OR UPDATE OR DELETE ON public.blog_comments FOR EACH ROW EXECUTE FUNCTION public.refresh_post_comments_count();

CREATE OR REPLACE FUNCTION public.increment_post_views(_slug text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.blog_posts SET views_count = views_count + 1 WHERE slug = _slug;
$$;

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads categories" ON public.blog_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editors manage categories" ON public.blog_categories FOR ALL TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));
CREATE POLICY "Public reads category translations" ON public.blog_category_translations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editors manage category translations" ON public.blog_category_translations FOR ALL TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));
CREATE POLICY "Public reads published posts" ON public.blog_posts FOR SELECT TO anon, authenticated USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));
CREATE POLICY "Editors view all posts" ON public.blog_posts FOR SELECT TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));
CREATE POLICY "Editors manage posts" ON public.blog_posts FOR ALL TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));
CREATE POLICY "Public reads translations of published posts" ON public.blog_post_translations FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.blog_posts p WHERE p.id = post_id AND p.status = 'published' AND (p.published_at IS NULL OR p.published_at <= now())));
CREATE POLICY "Editors manage translations" ON public.blog_post_translations FOR ALL TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));
CREATE POLICY "Public reads post-category links" ON public.blog_post_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editors manage post-category links" ON public.blog_post_categories FOR ALL TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));
CREATE POLICY "Public reads approved comments on published posts" ON public.blog_comments FOR SELECT TO anon, authenticated USING (status = 'approved' AND EXISTS (SELECT 1 FROM public.blog_posts p WHERE p.id = post_id AND p.status='published'));
CREATE POLICY "Admins view all comments" ON public.blog_comments FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Buyers create comments" ON public.blog_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_buyer(auth.uid()));
CREATE POLICY "Users edit own comments" ON public.blog_comments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND status IN ('pending','approved'));
CREATE POLICY "Admins moderate comments" ON public.blog_comments FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users delete own comments" ON public.blog_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Public reads reactions" ON public.blog_comment_reactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated react" ON public.blog_comment_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own reaction" ON public.blog_comment_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))));
CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_comment_reactions;
ALTER TABLE public.blog_comments REPLICA IDENTITY FULL;
ALTER TABLE public.blog_comment_reactions REPLICA IDENTITY FULL;

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('suite','camping','addon','transfer','other')),
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  price_cents bigint NOT NULL DEFAULT 0,
  compare_at_cents bigint,
  currency text NOT NULL DEFAULT 'BRL',
  stock integer, max_per_order integer,
  cover_image_url text,
  gallery text[] DEFAULT ARRAY[]::text[],
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_active ON public.products(active, position);

-- ============ PAYMENT GATEWAYS ============
CREATE TABLE public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider_type text NOT NULL CHECK (provider_type IN ('mercadopago','generic_rest')),
  active boolean NOT NULL DEFAULT true,
  is_test boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders
  ADD COLUMN gateway_id uuid REFERENCES public.payment_gateways(id),
  ADD COLUMN external_reference text,
  ADD COLUMN coupon_code text,
  ADD COLUMN discount_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN notes text;

ALTER TABLE public.order_items
  ADD COLUMN product_id uuid REFERENCES public.products(id);

CREATE TABLE public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  gateway_id uuid NOT NULL REFERENCES public.payment_gateways(id),
  external_id text,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','pending','approved','rejected','refunded','cancelled','failed')),
  amount_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  checkout_url text, raw_request jsonb, raw_response jsonb, last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_intents_order ON public.payment_intents(order_id);
CREATE INDEX idx_payment_intents_external ON public.payment_intents(external_id);

CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id uuid REFERENCES public.payment_gateways(id),
  provider text NOT NULL,
  event_type text, signature text,
  signature_valid boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processing_error text,
  related_order_id uuid REFERENCES public.orders(id),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX idx_webhook_events_provider ON public.webhook_events(provider, received_at DESC);

CREATE TABLE public.receipt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, slug text NOT NULL UNIQUE,
  is_default boolean NOT NULL DEFAULT false,
  html_template text NOT NULL, css_styles text,
  paper_size text NOT NULL DEFAULT 'A4',
  variables_doc jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uniq_default_receipt_template ON public.receipt_templates(is_default) WHERE is_default = true;

CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.receipt_templates(id),
  number text NOT NULL UNIQUE,
  pdf_url text, html_snapshot text,
  verification_hash text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payment_gateways_updated_at BEFORE UPDATE ON public.payment_gateways FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payment_intents_updated_at BEFORE UPDATE ON public.payment_intents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_receipt_templates_updated_at BEFORE UPDATE ON public.receipt_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active products" ON public.products FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Editors view all products" ON public.products FOR SELECT TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));
CREATE POLICY "Editors manage products" ON public.products FOR ALL TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));
CREATE POLICY "Finance views gateways" ON public.payment_gateways FOR SELECT TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Admin manages gateways" ON public.payment_gateways FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users view own payment intents" ON public.payment_intents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))));
CREATE POLICY "Finance manages payment intents" ON public.payment_intents FOR ALL TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Finance views webhook events" ON public.webhook_events FOR SELECT TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Public reads receipt templates" ON public.receipt_templates FOR SELECT TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor') OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Admin manages receipt templates" ON public.receipt_templates FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users view own receipts" ON public.receipts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))));
CREATE POLICY "Finance manages receipts" ON public.receipts FOR ALL TO authenticated USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));

-- ============ CUSTOMER segments / notes / email infra ============
CREATE TABLE public.customer_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE, name text NOT NULL, description text,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  color text, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_segments_updated BEFORE UPDATE ON public.customer_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Admins manage segments" ON public.customer_segments FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'));

CREATE TABLE public.customer_segment_members (
  segment_id uuid NOT NULL REFERENCES public.customer_segments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, added_by uuid,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (segment_id, user_id)
);
ALTER TABLE public.customer_segment_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage segment members" ON public.customer_segment_members FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'));

CREATE TABLE public.customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, author_id uuid, body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_notes_user ON public.customer_notes(user_id);
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_cnotes_updated BEFORE UPDATE ON public.customer_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Admins manage customer notes" ON public.customer_notes FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale text DEFAULT 'pt',
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE, name text NOT NULL, description text,
  active boolean NOT NULL DEFAULT true,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  variables_doc jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_etpl_updated BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Admins manage email templates" ON public.email_templates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Staff read email templates" ON public.email_templates FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'financeiro'));

CREATE TABLE public.email_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, provider_type text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_providers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_eprov_updated BEFORE UPDATE ON public.email_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Admins manage email providers" ON public.email_providers FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_slug text, to_email text NOT NULL, to_name text, user_id uuid,
  locale text NOT NULL DEFAULT 'pt',
  subject text NOT NULL, html text NOT NULL, text_body text,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  provider_id uuid, provider_message_id text,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_outbox_status ON public.email_outbox(status, scheduled_for);
CREATE INDEX idx_outbox_user ON public.email_outbox(user_id);
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_outbox_updated BEFORE UPDATE ON public.email_outbox FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Admins manage outbox" ON public.email_outbox FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Users view own emails" ON public.email_outbox FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_customer_stats(_user_id uuid)
RETURNS TABLE (orders_count bigint, paid_orders_count bigint, total_spent_cents bigint, last_order_at timestamptz, first_order_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::bigint, COUNT(*) FILTER (WHERE status = 'paid')::bigint,
    COALESCE(SUM(CASE WHEN status = 'paid' THEN total_cents ELSE 0 END), 0)::bigint,
    MAX(created_at), MIN(created_at)
  FROM public.orders WHERE user_id = _user_id;
$$;

-- ============ FISCAL ============
CREATE TABLE public.fiscal_company (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  legal_name text NOT NULL, trade_name text,
  cnpj text NOT NULL, ie text, im text,
  tax_regime text NOT NULL DEFAULT 'simples_nacional',
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_service_code text, default_cnae text,
  default_iss_rate numeric(5,2),
  email text, phone text, logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fiscal_company ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fcompany_updated BEFORE UPDATE ON public.fiscal_company FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Admins manage fiscal company" ON public.fiscal_company FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro')) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Public reads fiscal company" ON public.fiscal_company FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.fiscal_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, provider_type text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  is_test boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_ref text,
  supports text[] NOT NULL DEFAULT ARRAY['nfse']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fiscal_providers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fprov_updated BEFORE UPDATE ON public.fiscal_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Admins manage fiscal providers" ON public.fiscal_providers FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.fiscal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL, provider_id uuid,
  invoice_type text NOT NULL DEFAULT 'nfse',
  status text NOT NULL DEFAULT 'pending',
  number text, series text, access_key text,
  rps_number text, rps_series text,
  issued_at timestamptz, cancelled_at timestamptz,
  amount_cents bigint NOT NULL DEFAULT 0,
  customer_name text, customer_doc text, customer_email text,
  xml_url text, pdf_url text, external_id text,
  raw_request jsonb, raw_response jsonb, last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_finvoices_order ON public.fiscal_invoices(order_id);
CREATE INDEX idx_finvoices_status ON public.fiscal_invoices(status);
ALTER TABLE public.fiscal_invoices ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_finvoice_updated BEFORE UPDATE ON public.fiscal_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Finance manages fiscal invoices" ON public.fiscal_invoices FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Users view own fiscal invoices" ON public.fiscal_invoices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = fiscal_invoices.order_id AND (o.user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'))));

CREATE TABLE public.fiscal_invoice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.fiscal_invoices(id) ON DELETE CASCADE,
  event_type text NOT NULL, message text, payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fevents_invoice ON public.fiscal_invoice_events(invoice_id);
ALTER TABLE public.fiscal_invoice_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance views fiscal events" ON public.fiscal_invoice_events FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'));

-- Trigger: vincular orders sem user_id ao usuário pelo e-mail
CREATE OR REPLACE FUNCTION public.orders_link_user_by_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.customer_email IS NOT NULL THEN
    SELECT id INTO NEW.user_id FROM auth.users WHERE lower(email) = lower(NEW.customer_email) LIMIT 1;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_orders_link_user_by_email BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_link_user_by_email();

-- handle_new_user atualizado: primeiro usuário vira super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE _has_admin boolean; _role app_role;
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'full_name');
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role IN ('super_admin', 'admin')) INTO _has_admin;
  IF _has_admin THEN _role := 'customer'; ELSE _role := 'super_admin'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END; $$;

CREATE TABLE public.auth_lockouts (
  email text PRIMARY KEY,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked boolean NOT NULL DEFAULT false,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.auth_lockouts ENABLE ROW LEVEL SECURITY;