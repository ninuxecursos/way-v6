-- ============================================================================
-- WAY HOME — Parte 1/5: Fundação + CMS
-- ============================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

-- ============ FASE 1: RBAC, Profiles, Audit ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'editor', 'financeiro', 'customer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin', 'admin'))
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Super admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT, full_name TEXT, avatar_url TEXT, phone TEXT, cpf TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT,
  before_data JSONB, after_data JSONB, ip_address TEXT, user_agent TEXT, metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL, bucket TIMESTAMPTZ NOT NULL, count INT NOT NULL DEFAULT 1,
  UNIQUE (key, bucket)
);
CREATE INDEX idx_rate_limits_key_bucket ON public.rate_limits(key, bucket);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- ============ FASE 2: CMS ============
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT, og_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  publish_at TIMESTAMPTZ, meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pages_slug ON public.pages(slug);
CREATE INDEX idx_pages_status ON public.pages(status);
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published pages" ON public.pages FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Editors view all pages" ON public.pages FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Editors manage pages" ON public.pages FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor'));
CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL, position INT NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  visible_mobile BOOLEAN NOT NULL DEFAULT true,
  visible_desktop BOOLEAN NOT NULL DEFAULT true,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sections_page ON public.page_sections(page_id, position);
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads sections of published pages" ON public.page_sections FOR SELECT TO anon, authenticated USING (visible = true AND EXISTS (SELECT 1 FROM public.pages p WHERE p.id = page_id AND p.status = 'published'));
CREATE POLICY "Editors view all sections" ON public.page_sections FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Editors manage sections" ON public.page_sections FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor'));
CREATE TRIGGER update_page_sections_updated_at BEFORE UPDATE ON public.page_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL, created_by UUID REFERENCES auth.users(id), note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_page_versions_page ON public.page_versions(page_id, created_at DESC);
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Editors view versions" ON public.page_versions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Editors create versions" ON public.page_versions FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor'));

CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL, public_url TEXT NOT NULL, filename TEXT NOT NULL,
  mime_type TEXT, size_bytes BIGINT, width INT, height INT,
  alt_text TEXT NOT NULL DEFAULT '', caption TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_tags ON public.media_assets USING GIN(tags);
CREATE INDEX idx_media_filename ON public.media_assets(filename);
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads media metadata" ON public.media_assets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editors manage media" ON public.media_assets FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor'));
CREATE TRIGGER update_media_assets_updated_at BEFORE UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY, value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('media-public', 'media-public', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public reads media-public files" ON storage.objects;
DROP POLICY IF EXISTS "Editors upload to media-public" ON storage.objects;
DROP POLICY IF EXISTS "Editors update media-public" ON storage.objects;
DROP POLICY IF EXISTS "Editors delete media-public" ON storage.objects;
CREATE POLICY "Public reads media-public files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'media-public');
CREATE POLICY "Editors upload to media-public" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media-public' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor')));
CREATE POLICY "Editors update media-public" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media-public' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor')));
CREATE POLICY "Editors delete media-public" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media-public' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor')));

-- Seeds
INSERT INTO public.pages (slug, title, description, status) VALUES
  ('home', 'Way Home — Hospedagem oficial Tomorrowland Brasil', 'Pacotes de hospedagem completa e experiências únicas durante o Tomorrowland Brasil.', 'published');

WITH home AS (SELECT id FROM public.pages WHERE slug = 'home')
INSERT INTO public.page_sections (page_id, type, position, data) VALUES
  ((SELECT id FROM home), 'hero', 0, '{"title":"GARANTA SEU PACOTE AGORA","subtitle":"Way Home: hospedagem completa e experiências únicas no Tomorrowland Brasil.","ctaLabel":"Quero minha vaga"}'),
  ((SELECT id FROM home), 'experience', 1, '{}'),
  ((SELECT id FROM home), 'hospedagem', 2, '{}'),
  ((SELECT id FROM home), 'camping', 3, '{}'),
  ((SELECT id FROM home), 'location', 4, '{}'),
  ((SELECT id FROM home), 'feedback', 5, '{}'),
  ((SELECT id FROM home), 'cta', 6, '{}');

INSERT INTO public.site_settings (key, value) VALUES
  ('seo', '{"siteName":"Way Home","defaultTitle":"Way Home — Tomorrowland Brasil","defaultDescription":"Hospedagem oficial e experiências para o Tomorrowland Brasil"}'),
  ('header', '{"logoText":"Way Home","links":[{"label":"Experiência","href":"#experiencia"},{"label":"Hospedagem","href":"#hospedagem"},{"label":"Camping","href":"#camping"}]}'),
  ('footer', '{"copyright":"© Way Home — Todos os direitos reservados","social":{"instagram":"","whatsapp":""}}'),
  ('theme', '{"primary":"oklch(0.65 0.2 280)","accent":"oklch(0.7 0.15 200)"}');