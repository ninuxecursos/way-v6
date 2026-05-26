import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_BASE_URL = "https://www.wayhomeoficial.com.br";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Base URL configurável via /admin/settings/seo (canonicalUrl).
        let BASE_URL = FALLBACK_BASE_URL;
        try {
          const { data } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "seo")
            .maybeSingle();
          const cu = (data?.value as Record<string, unknown> | null)?.canonicalUrl as string | undefined;
          if (cu && cu.trim()) BASE_URL = cu.trim().replace(/\/$/, "");
        } catch { /* fallback */ }

        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/sobre", changefreq: "monthly", priority: "0.8" },
          { path: "/blog", changefreq: "daily", priority: "0.9" },
          { path: "/faq", changefreq: "monthly", priority: "0.7" },
          { path: "/contato", changefreq: "monthly", priority: "0.7" },
          { path: "/termos", changefreq: "yearly", priority: "0.3" },
          { path: "/privacidade", changefreq: "yearly", priority: "0.3" },
          { path: "/cookies", changefreq: "yearly", priority: "0.3" },
          { path: "/direito-de-imagem", changefreq: "yearly", priority: "0.3" },
        ];

        const dynamicEntries: SitemapEntry[] = [];
        try {
          const { data: posts } = await supabase
            .from("blog_posts")
            .select("slug,updated_at,published_at")
            .eq("status", "published");
          for (const p of posts ?? []) {
            dynamicEntries.push({
              path: `/blog/${p.slug}`,
              lastmod: (p.updated_at ?? p.published_at ?? "").slice(0, 10) || undefined,
              changefreq: "weekly",
              priority: "0.7",
            });
          }
        } catch {
          // se a leitura falhar, devolvemos pelo menos as rotas estáticas.
        }

        // Páginas do CMS publicadas (pages.status='published').
        try {
          const { data: pages } = await supabase
            .from("pages")
            .select("slug,updated_at")
            .eq("status", "published");
          for (const p of pages ?? []) {
            if (!p.slug) continue;
            dynamicEntries.push({
              path: `/${p.slug}`,
              lastmod: (p.updated_at ?? "").slice(0, 10) || undefined,
              changefreq: "monthly",
              priority: "0.6",
            });
          }
        } catch { /* noop */ }

        // Experiências ativas (products.active=true) → /experiencias/$slug
        try {
          const { data: prods } = await supabase
            .from("products")
            .select("slug,updated_at")
            .eq("active", true);
          for (const p of prods ?? []) {
            if (!p.slug) continue;
            dynamicEntries.push({
              path: `/experiencias/${p.slug}`,
              lastmod: (p.updated_at ?? "").slice(0, 10) || undefined,
              changefreq: "weekly",
              priority: "0.8",
            });
          }
        } catch { /* noop */ }

        const all = [...staticEntries, ...dynamicEntries];
        const urls = all.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});