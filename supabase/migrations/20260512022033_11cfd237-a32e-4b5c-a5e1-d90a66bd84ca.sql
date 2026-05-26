
-- Singleton company data
CREATE TABLE public.fiscal_company (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  legal_name text NOT NULL,
  trade_name text,
  cnpj text NOT NULL,
  ie text,
  im text,
  tax_regime text NOT NULL DEFAULT 'simples_nacional',
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_service_code text,
  default_cnae text,
  default_iss_rate numeric(5,2),
  email text,
  phone text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_fcompany_updated BEFORE UPDATE ON public.fiscal_company
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Admins manage fiscal company" ON public.fiscal_company
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Public reads fiscal company" ON public.fiscal_company
  FOR SELECT TO anon, authenticated USING (true);

-- Future-ready provider registry (Focus NFe, NFE.io, eNotas, ...)
CREATE TABLE public.fiscal_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider_type text NOT NULL, -- focus_nfe | nfe_io | enotas | manual
  active boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  is_test boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_ref text,
  supports text[] NOT NULL DEFAULT ARRAY['nfse']::text[], -- nfe | nfse | nfce
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_fprov_updated BEFORE UPDATE ON public.fiscal_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Admins manage fiscal providers" ON public.fiscal_providers
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Invoices
CREATE TABLE public.fiscal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  provider_id uuid,
  invoice_type text NOT NULL DEFAULT 'nfse', -- nfse | nfe | nfce
  status text NOT NULL DEFAULT 'pending', -- pending | processing | issued | rejected | cancelled
  number text,
  series text,
  access_key text,
  rps_number text,
  rps_series text,
  issued_at timestamptz,
  cancelled_at timestamptz,
  amount_cents bigint NOT NULL DEFAULT 0,
  customer_name text,
  customer_doc text,
  customer_email text,
  xml_url text,
  pdf_url text,
  external_id text,
  raw_request jsonb,
  raw_response jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_finvoices_order ON public.fiscal_invoices(order_id);
CREATE INDEX idx_finvoices_status ON public.fiscal_invoices(status);
CREATE TRIGGER trg_finvoice_updated BEFORE UPDATE ON public.fiscal_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Finance manages fiscal invoices" ON public.fiscal_invoices
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Users view own fiscal invoices" ON public.fiscal_invoices
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = fiscal_invoices.order_id AND (o.user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'))));

-- Append-only events
CREATE TABLE public.fiscal_invoice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.fiscal_invoices(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fevents_invoice ON public.fiscal_invoice_events(invoice_id);

CREATE POLICY "Finance views fiscal events" ON public.fiscal_invoice_events
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'));
