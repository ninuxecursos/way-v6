
-- Tabela de fila para pings ao Google/Bing/IndexNow após publicações.
CREATE TABLE IF NOT EXISTS public.seo_ping_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target text NOT NULL CHECK (target IN ('sitemap','indexnow','gsc')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seo_ping_queue_status ON public.seo_ping_queue(status, scheduled_at);
ALTER TABLE public.seo_ping_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin reads seo_ping_queue" ON public.seo_ping_queue;
CREATE POLICY "admin reads seo_ping_queue" ON public.seo_ping_queue FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Cache de métricas do Search Console (preenchido por cron).
CREATE TABLE IF NOT EXISTS public.seo_search_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  range_days int NOT NULL DEFAULT 28,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  top_queries jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_pages jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.seo_search_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin reads seo_search_metrics" ON public.seo_search_metrics;
CREATE POLICY "admin reads seo_search_metrics" ON public.seo_search_metrics FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Seed de defaults para tracking e seo (idempotente).
INSERT INTO public.site_settings(key, value) VALUES
  ('tracking', jsonb_build_object(
    'version', 1,
    'meta', jsonb_build_object('pixelId','','accessToken','','testEventCode','','enabled',false),
    'ga4', jsonb_build_object('measurementId','','apiSecret','','enabled',false),
    'gtm', jsonb_build_object('containerId','','enabled',false),
    'googleAds', jsonb_build_object('conversionId','','conversionLabel','','enabled',false),
    'tiktok', jsonb_build_object('pixelId','','enabled',false),
    'pinterest', jsonb_build_object('tagId','','enabled',false),
    'linkedin', jsonb_build_object('partnerId','','enabled',false),
    'hotjar', jsonb_build_object('siteId','','enabled',false),
    'clarity', jsonb_build_object('projectId','','enabled',false),
    'searchConsole', jsonb_build_object('verificationToken','','verified',false,'verifiedAt',null),
    'custom', jsonb_build_object('headHtml','','bodyStartHtml','','bodyEndHtml',''),
    'consent', jsonb_build_object('requireConsent',true,'defaultRegion','BR')
  )),
  ('seo', jsonb_build_object(
    'canonicalUrl','https://www.wayhomeoficial.com.br',
    'robotsTxt', E'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /conta\nDisallow: /api/\nDisallow: /reservation\nDisallow: /checkout\n',
    'noindexGlobal', false,
    'indexNowKey', encode(gen_random_bytes(16),'hex')
  ))
ON CONFLICT (key) DO NOTHING;

-- RPC seguro para o site público ler somente IDs públicos de tracking.
CREATE OR REPLACE FUNCTION public.get_public_tracking()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'meta', jsonb_build_object('pixelId', (value->'meta'->>'pixelId'), 'enabled', COALESCE((value->'meta'->>'enabled')::boolean,false)),
    'ga4', jsonb_build_object('measurementId', (value->'ga4'->>'measurementId'), 'enabled', COALESCE((value->'ga4'->>'enabled')::boolean,false)),
    'gtm', jsonb_build_object('containerId', (value->'gtm'->>'containerId'), 'enabled', COALESCE((value->'gtm'->>'enabled')::boolean,false)),
    'googleAds', jsonb_build_object('conversionId', (value->'googleAds'->>'conversionId'), 'enabled', COALESCE((value->'googleAds'->>'enabled')::boolean,false)),
    'tiktok', jsonb_build_object('pixelId', (value->'tiktok'->>'pixelId'), 'enabled', COALESCE((value->'tiktok'->>'enabled')::boolean,false)),
    'pinterest', jsonb_build_object('tagId', (value->'pinterest'->>'tagId'), 'enabled', COALESCE((value->'pinterest'->>'enabled')::boolean,false)),
    'linkedin', jsonb_build_object('partnerId', (value->'linkedin'->>'partnerId'), 'enabled', COALESCE((value->'linkedin'->>'enabled')::boolean,false)),
    'hotjar', jsonb_build_object('siteId', (value->'hotjar'->>'siteId'), 'enabled', COALESCE((value->'hotjar'->>'enabled')::boolean,false)),
    'clarity', jsonb_build_object('projectId', (value->'clarity'->>'projectId'), 'enabled', COALESCE((value->'clarity'->>'enabled')::boolean,false)),
    'searchConsole', jsonb_build_object('verificationToken', (value->'searchConsole'->>'verificationToken')),
    'custom', jsonb_build_object(
      'headHtml', (value->'custom'->>'headHtml'),
      'bodyStartHtml', (value->'custom'->>'bodyStartHtml'),
      'bodyEndHtml', (value->'custom'->>'bodyEndHtml')
    ),
    'consent', jsonb_build_object(
      'requireConsent', COALESCE((value->'consent'->>'requireConsent')::boolean,true),
      'defaultRegion', COALESCE((value->'consent'->>'defaultRegion'),'BR')
    )
  )
  FROM public.site_settings WHERE key='tracking';
$$;
GRANT EXECUTE ON FUNCTION public.get_public_tracking() TO anon, authenticated;

-- Trigger para enfileirar ping ao publicar conteúdo.
CREATE OR REPLACE FUNCTION public.enqueue_seo_ping()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.seo_ping_queue(target, payload)
  VALUES ('sitemap', jsonb_build_object('table', TG_TABLE_NAME, 'slug', NEW.slug));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_seo_ping_pages ON public.pages;
CREATE TRIGGER trg_seo_ping_pages
AFTER INSERT OR UPDATE OF status, updated_at ON public.pages
FOR EACH ROW WHEN (NEW.status = 'published')
EXECUTE FUNCTION public.enqueue_seo_ping();

DROP TRIGGER IF EXISTS trg_seo_ping_blog ON public.blog_posts;
CREATE TRIGGER trg_seo_ping_blog
AFTER INSERT OR UPDATE OF status, updated_at ON public.blog_posts
FOR EACH ROW WHEN (NEW.status = 'published')
EXECUTE FUNCTION public.enqueue_seo_ping();

DROP TRIGGER IF EXISTS trg_seo_ping_products ON public.products;
CREATE TRIGGER trg_seo_ping_products
AFTER INSERT OR UPDATE OF active, updated_at ON public.products
FOR EACH ROW WHEN (NEW.active = true)
EXECUTE FUNCTION public.enqueue_seo_ping();
