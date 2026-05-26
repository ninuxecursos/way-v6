/**
 * Index público do blog Way Home (multi-idioma PT/EN/ES).
 * - Lista posts publicados com tradução no idioma selecionado.
 * - Locale via query param ?lang= (default pt).
 * - GEO: hreflang, JSON-LD ItemList.
 */
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE, type Locale } from "@/lib/blog-types";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/wh/Header";

export const Route = createFileRoute("/blog")({
  validateSearch: (s: Record<string, unknown>) => ({
    lang: (LOCALES as string[]).includes(s.lang as string) ? (s.lang as Locale) : DEFAULT_LOCALE,
  }),
  head: ({ match }) => {
    const lang = (match.search as { lang?: Locale }).lang ?? DEFAULT_LOCALE;
    const titles: Record<Locale, string> = {
      pt: "Blog Way Home — Guia Tomorrowland Brasil",
      en: "Way Home Blog — Tomorrowland Brasil Guide",
      es: "Blog Way Home — Guía Tomorrowland Brasil",
    };
    const descs: Record<Locale, string> = {
      pt: "Dicas, guias e experiências para sua viagem ao Tomorrowland Brasil.",
      en: "Tips, guides and experiences for your Tomorrowland Brasil trip.",
      es: "Consejos, guías y experiencias para tu viaje a Tomorrowland Brasil.",
    };
    return {
      meta: [
        { title: titles[lang] },
        { name: "description", content: descs[lang] },
        { property: "og:title", content: titles[lang] },
        { property: "og:description", content: descs[lang] },
        { property: "og:url", content: "/blog" },
        { property: "og:type", content: "website" },
      ],
      links: [
        { rel: "canonical", href: "/blog" },
        ...LOCALES.map((l) => ({ rel: "alternate", hrefLang: l, href: `/blog?lang=${l}` })),
      ],
    };
  },
  component: BlogIndex,
});

interface PostCard {
  id: string;
  slug: string;
  cover_image_url: string | null;
  cover_alt: string | null;
  published_at: string | null;
  reading_time_min: number | null;
  featured: boolean;
  views_count: number;
  comments_count: number;
  translation: { title: string; slug: string; excerpt: string | null } | null;
}

function BlogIndex() {
  const { lang } = useSearch({ from: "/blog" });
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("blog_posts")
        .select("id, slug, cover_image_url, cover_alt, published_at, reading_time_min, featured, views_count, comments_count, blog_post_translations(title, slug, excerpt, locale)")
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false });
      const rows: PostCard[] = (data ?? []).map((p: any) => {
        const tr = (p.blog_post_translations ?? []).find((t: any) => t.locale === lang)
          ?? (p.blog_post_translations ?? []).find((t: any) => t.locale === DEFAULT_LOCALE);
        return { ...p, translation: tr ? { title: tr.title, slug: tr.slug, excerpt: tr.excerpt } : null };
      });
      setPosts(rows);
      setLoading(false);
    })();
  }, [lang]);

  const ldjson = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Way Home Blog",
    inLanguage: lang,
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.translation?.title,
      url: `/blog/${p.slug}?lang=${lang}`,
      datePublished: p.published_at,
    })),
  };

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-4 pt-28 md:pt-32 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Way Home</Link>
            <h1 className="text-4xl md:text-5xl font-bold mt-2">Blog Way Home</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">Dicas, guias e histórias da hospedagem oficial do Tomorrowland Brasil.</p>
          </div>
          <div className="flex gap-2">
            {LOCALES.map((l) => (
              <Button key={l} size="sm" variant={lang === l ? "default" : "outline"}
                onClick={() => navigate({ to: "/blog", search: { lang: l } })}>
                {LOCALE_LABELS[l]}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">Em breve novos artigos.</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} search={{ lang }}
                className="group block rounded-lg overflow-hidden border bg-card hover:shadow-lg transition">
                {p.cover_image_url && (
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img src={p.cover_image_url} alt={p.cover_alt ?? p.translation?.title ?? ""} className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
                  </div>
                )}
                <div className="p-5">
                  {p.featured && <span className="text-xs uppercase tracking-wider text-primary font-semibold">Destaque</span>}
                  <h2 className="text-xl font-semibold mt-1 group-hover:text-primary transition">{p.translation?.title ?? "(sem tradução)"}</h2>
                  {p.translation?.excerpt && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.translation.excerpt}</p>}
                  <div className="mt-4 flex gap-3 text-xs text-muted-foreground">
                    {p.published_at && <span>{new Date(p.published_at).toLocaleDateString(lang)}</span>}
                    {p.reading_time_min && <span>{p.reading_time_min} min</span>}
                    <span>{p.comments_count} 💬</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldjson) }} />
    </main>
  );
}
