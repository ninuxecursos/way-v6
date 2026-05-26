
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
  stock integer,
  max_per_order integer,
  cover_image_url text,
  gallery text[] DEFAULT ARRAY[]::text[],
  -- traduções como jsonb { pt: {name, description, features:[]}, en: {...}, es: {...} }
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
  -- Para MP: { public_key, webhook_secret_ref }. Para generic: { create_endpoint, status_endpoint, auth_header_name, auth_token_ref, webhook_signature_header, webhook_secret_ref, payload_template }
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Nome do secret que guarda o token (NUNCA o token em si)
  secret_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ATUALIZAÇÕES EM ORDERS / ORDER_ITEMS ============
ALTER TABLE public.orders
  ADD COLUMN gateway_id uuid REFERENCES public.payment_gateways(id),
  ADD COLUMN external_reference text,
  ADD COLUMN coupon_code text,
  ADD COLUMN discount_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN notes text;

ALTER TABLE public.order_items
  ADD COLUMN product_id uuid REFERENCES public.products(id);

-- ============ PAYMENT INTENTS ============
CREATE TABLE public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  gateway_id uuid NOT NULL REFERENCES public.payment_gateways(id),
  external_id text,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','pending','approved','rejected','refunded','cancelled','failed')),
  amount_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  checkout_url text,
  raw_request jsonb,
  raw_response jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_intents_order ON public.payment_intents(order_id);
CREATE INDEX idx_payment_intents_external ON public.payment_intents(external_id);

-- ============ WEBHOOK EVENTS ============
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id uuid REFERENCES public.payment_gateways(id),
  provider text NOT NULL,
  event_type text,
  signature text,
  signature_valid boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processing_error text,
  related_order_id uuid REFERENCES public.orders(id),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX idx_webhook_events_provider ON public.webhook_events(provider, received_at DESC);

-- ============ RECEIPT TEMPLATES ============
CREATE TABLE public.receipt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_default boolean NOT NULL DEFAULT false,
  -- HTML com variáveis {{order.number}}, {{customer.name}}, {{items}}, etc.
  html_template text NOT NULL,
  css_styles text,
  paper_size text NOT NULL DEFAULT 'A4',
  -- Variáveis disponíveis para preview no admin
  variables_doc jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Garantir apenas um default
CREATE UNIQUE INDEX uniq_default_receipt_template ON public.receipt_templates(is_default) WHERE is_default = true;

-- ============ RECEIPTS ============
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.receipt_templates(id),
  number text NOT NULL UNIQUE,
  pdf_url text,
  html_snapshot text,
  verification_hash text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- ============ TRIGGERS UPDATED_AT ============
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payment_gateways_updated_at BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payment_intents_updated_at BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_receipt_templates_updated_at BEFORE UPDATE ON public.receipt_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS ============
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Products
CREATE POLICY "Public reads active products" ON public.products FOR SELECT TO anon, authenticated
  USING (active = true);
CREATE POLICY "Editors view all products" ON public.products FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));
CREATE POLICY "Editors manage products" ON public.products FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));

-- Gateways: SOMENTE admin/financeiro (contém credenciais)
CREATE POLICY "Finance views gateways" ON public.payment_gateways FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Admin manages gateways" ON public.payment_gateways FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Payment intents
CREATE POLICY "Users view own payment intents" ON public.payment_intents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))));
CREATE POLICY "Finance manages payment intents" ON public.payment_intents FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));

-- Webhook events: apenas admin/financeiro
CREATE POLICY "Finance views webhook events" ON public.webhook_events FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));

-- Receipt templates
CREATE POLICY "Public reads receipt templates" ON public.receipt_templates FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor') OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Admin manages receipt templates" ON public.receipt_templates FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Receipts
CREATE POLICY "Users view own receipts" ON public.receipts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))));
CREATE POLICY "Finance manages receipts" ON public.receipts FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
