/**
 * Página pública de post individual com GEO completo.
 * - Conteúdo em PT/EN/ES via ?lang=
 * - Meta tags, hreflang, OpenGraph, JSON-LD Article + FAQPage (geo_faq).
 * - Comentários em tempo real (apenas compradores).
 */
import { createFileRoute, Link, useNavigate, useSearch, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE, type Locale } from "@/lib/blog-types";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/wh/Header";
import { CommentsSection } from "@/components/blog/CommentsSection";
import { PublicErrorBoundary } from "@/components/errors/PublicErrorBoundary";

export const Route = createFileRoute("/blog/$slug")({
  validateSearch: (s: Record<string, unknown>) => ({
    lang: (LOCALES as string[]).includes(s.lang as string) ? (s.lang as Locale) : DEFAULT_LOCALE,
  }),
  head: ({ params, match }) => {
    const lang = (match.search as { lang?: Locale }).lang ?? DEFAULT_LOCALE;
    const canonical = `/blog/${params.slug}${lang && lang !== DEFAULT_LOCALE ? `?lang=${lang}` : ""}`;
    return {
      meta: [
        { property: "og:type", content: "article" },
        { property: "og:url", content: canonical },
      ],
      links: [
        { rel: "canonical", href: canonical },
        ...LOCALES.map((l) => ({ rel: "alternate", hrefLang: l, href: `/blog/${params.slug}?lang=${l}` })),
      ],
    };
  },
  component: BlogPostPage,
  errorComponent: ({ error, reset }) => (
    <PublicErrorBoundary
      error={error}
      reset={reset}
      title="Não foi possível carregar este post"
      homeLabel="Ver todos os posts"
      homeTo="/blog"
    />
  ),
});

function BlogPostPage() {
  const { slug } = useParams({ from: "/blog/$slug" });
  const { lang } = useSearch({ from: "/blog/$slug" });
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [translation, setTranslation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("blog_posts")
        .select("*, blog_post_translations(*)")
        .eq("slug", slug).maybeSingle();
      if (data) {
        const tr = (data.blog_post_translations ?? []).find((t: any) => t.locale === lang)
          ?? (data.blog_post_translations ?? []).find((t: any) => t.locale === DEFAULT_LOCALE);
        setPost(data); setTranslation(tr);
        // increment views
        supabase.rpc("increment_post_views", { _slug: slug });
        // dynamic <title>/meta
        if (typeof document !== "undefined" && tr) {
          document.title = tr.meta_title ?? tr.title;
          const setMeta = (sel: string, attr: string, content: string) => {
            let el = document.querySelector(sel) as HTMLMetaElement | null;
            if (!el) { el = document.createElement("meta"); document.head.appendChild(el); el.setAttribute(attr.split("=")[0], attr.split("=")[1].replace(/"/g, "")); }
            el.content = content;
          };
          if (tr.meta_description) setMeta('meta[name="description"]', 'name="description"', tr.meta_description);
        }
      }
      setLoading(false);
    })();
  }, [slug, lang]);

  const ldjson = useMemo(() => {
    if (!post || !translation) return null;
    const article = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: translation.title,
      description: translation.meta_description ?? translation.excerpt,
      image: translation.og_image_url ?? post.cover_image_url,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      inLanguage: lang,
      keywords: (post.geo_keywords ?? []).join(", "),
    };
    const faq = (translation.geo_faq ?? []).length ? {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: (translation.geo_faq ?? []).map((f: any) => ({
        "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    } : null;
    return [article, ...(faq ? [faq] : []), ...(translation.schema_jsonld ? [translation.schema_jsonld] : [])];
  }, [post, translation, lang]);

  if (loading) return <main className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></main>;
  if (!post || !translation) return <main className="min-h-screen flex items-center justify-center"><p>Post não encontrado.</p></main>;

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <article className="max-w-3xl mx-auto px-4 pt-28 md:pt-32 pb-12">
        <div className="flex items-center justify-between mb-6">
          <Link to="/blog" search={{ lang }} className="text-sm text-muted-foreground hover:text-foreground">← Blog</Link>
          <div className="flex gap-1">
            {LOCALES.map((l) => (
              <Button key={l} size="sm" variant={lang === l ? "default" : "ghost"}
                onClick={() => navigate({ to: "/blog/$slug", params: { slug }, search: { lang: l } })}>
                {l.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        {translation.geo_summary && (
          <aside className="rounded-lg border-l-4 border-primary bg-muted/50 p-4 mb-6 text-sm">
            <strong className="block mb-1 text-xs uppercase tracking-wider text-primary">Resumo</strong>
            {translation.geo_summary}
          </aside>
        )}

        <h1 className="text-4xl md:text-5xl font-bold leading-tight">{translation.title}</h1>
        {translation.excerpt && <p className="text-xl text-muted-foreground mt-4">{translation.excerpt}</p>}

        <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
          {post.published_at && <span>{new Date(post.published_at).toLocaleDateString(lang)}</span>}
          {post.reading_time_min && <span>{post.reading_time_min} min de leitura</span>}
        </div>

        {post.cover_image_url && (
          <img src={post.cover_image_url} alt={post.cover_alt ?? translation.title} className="mt-8 w-full rounded-lg" />
        )}

        <div className="prose prose-neutral dark:prose-invert max-w-none mt-8 whitespace-pre-wrap">
          {translation.content_markdown}
        </div>

        {(translation.geo_faq ?? []).length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Perguntas frequentes</h2>
            <div className="space-y-4">
              {translation.geo_faq.map((f: any, i: number) => (
                <details key={i} className="rounded border p-4">
                  <summary className="font-semibold cursor-pointer">{f.q}</summary>
                  <p className="mt-2 text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <CommentsSection postId={post.id} />
      </article>

      {ldjson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldjson) }} />}
    </main>
  );
}
