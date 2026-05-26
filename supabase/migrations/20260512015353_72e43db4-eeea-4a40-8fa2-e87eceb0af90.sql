
-- ============ BLOG ============
CREATE TABLE public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  position integer NOT NULL DEFAULT 0,
  icon text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.blog_category_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('pt','en','es')),
  name text NOT NULL,
  description text,
  meta_title text,
  meta_description text,
  UNIQUE (category_id, locale)
);

CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','archived')),
  author_id uuid,
  cover_image_url text,
  cover_alt text,
  featured boolean NOT NULL DEFAULT false,
  reading_time_min integer,
  views_count bigint NOT NULL DEFAULT 0,
  comments_count bigint NOT NULL DEFAULT 0,
  geo_score integer,
  geo_keywords text[] DEFAULT ARRAY[]::text[],
  published_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_posts_status_published ON public.blog_posts(status, published_at DESC);
CREATE INDEX idx_blog_posts_featured ON public.blog_posts(featured) WHERE featured = true;

CREATE TABLE public.blog_post_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('pt','en','es')),
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  content_markdown text NOT NULL DEFAULT '',
  content_html text,
  meta_title text,
  meta_description text,
  og_image_url text,
  canonical_url text,
  schema_jsonld jsonb,
  geo_summary text,
  geo_faq jsonb DEFAULT '[]'::jsonb,
  geo_entities text[] DEFAULT ARRAY[]::text[],
  UNIQUE (post_id, locale),
  UNIQUE (locale, slug)
);

CREATE TABLE public.blog_post_categories (
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

-- ============ ORDERS (base mínima p/ Fase 4) ============
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_email text NOT NULL,
  total_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','refunded','cancelled','failed')),
  payment_provider text,
  payment_provider_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user_status ON public.orders(user_id, status);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_type text NOT NULL,
  product_ref text,
  description text NOT NULL,
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

-- ============ FUNÇÕES ============
CREATE OR REPLACE FUNCTION public.is_buyer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE user_id = _user_id AND status = 'paid'
  )
$$;

CREATE OR REPLACE FUNCTION public.set_published_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_blog_posts_published_at
  BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_published_at();

CREATE TRIGGER trg_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_blog_categories_updated_at BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_blog_comments_updated_at BEFORE UPDATE ON public.blog_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger contador de comentários
CREATE OR REPLACE FUNCTION public.refresh_post_comments_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    UPDATE public.blog_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN
    UPDATE public.blog_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.blog_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF OLD.status = 'approved' THEN
      UPDATE public.blog_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = NEW.post_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_blog_comments_count
  AFTER INSERT OR UPDATE OR DELETE ON public.blog_comments
  FOR EACH ROW EXECUTE FUNCTION public.refresh_post_comments_count();

CREATE OR REPLACE FUNCTION public.increment_post_views(_slug text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.blog_posts SET views_count = views_count + 1 WHERE slug = _slug;
$$;

-- ============ RLS ============
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Categorias: pública lê, editores gerenciam
CREATE POLICY "Public reads categories" ON public.blog_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editors manage categories" ON public.blog_categories FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));

CREATE POLICY "Public reads category translations" ON public.blog_category_translations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editors manage category translations" ON public.blog_category_translations FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));

-- Posts publicados: pública lê
CREATE POLICY "Public reads published posts" ON public.blog_posts FOR SELECT TO anon, authenticated
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));
CREATE POLICY "Editors view all posts" ON public.blog_posts FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));
CREATE POLICY "Editors manage posts" ON public.blog_posts FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));

CREATE POLICY "Public reads translations of published posts" ON public.blog_post_translations FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.blog_posts p WHERE p.id = post_id AND p.status = 'published' AND (p.published_at IS NULL OR p.published_at <= now())));
CREATE POLICY "Editors manage translations" ON public.blog_post_translations FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));

CREATE POLICY "Public reads post-category links" ON public.blog_post_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editors manage post-category links" ON public.blog_post_categories FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'editor')) WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'editor'));

-- Comentários
CREATE POLICY "Public reads approved comments on published posts" ON public.blog_comments FOR SELECT TO anon, authenticated
  USING (status = 'approved' AND EXISTS (SELECT 1 FROM public.blog_posts p WHERE p.id = post_id AND p.status='published'));
CREATE POLICY "Admins view all comments" ON public.blog_comments FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));
CREATE POLICY "Buyers create comments" ON public.blog_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_buyer(auth.uid()));
CREATE POLICY "Users edit own comments" ON public.blog_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND status IN ('pending','approved'));
CREATE POLICY "Admins moderate comments" ON public.blog_comments FOR UPDATE TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users delete own comments" ON public.blog_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Public reads reactions" ON public.blog_comment_reactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated react" ON public.blog_comment_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own reaction" ON public.blog_comment_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Orders
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));

CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))));
CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_comment_reactions;
ALTER TABLE public.blog_comments REPLICA IDENTITY FULL;
ALTER TABLE public.blog_comment_reactions REPLICA IDENTITY FULL;
