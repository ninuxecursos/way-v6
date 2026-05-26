GRANT SELECT ON public.seo_ping_queue TO authenticated;
GRANT ALL ON public.seo_ping_queue TO service_role;
GRANT SELECT ON public.seo_search_metrics TO authenticated;
GRANT ALL ON public.seo_search_metrics TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_seo_ping()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.seo_ping_queue(target, payload)
  VALUES ('sitemap', jsonb_build_object('table', TG_TABLE_NAME, 'slug', NEW.slug));
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_seo_ping() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_seo_ping() TO service_role;