import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_ROBOTS = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /conta
Disallow: /api/
Disallow: /reservation
Disallow: /checkout
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        let body = DEFAULT_ROBOTS;
        let base = "https://www.wayhomeoficial.com.br";
        let indexNowKey = "";
        let noindex = false;
        try {
          const { data } = await supabase.from("site_settings").select("value").eq("key", "seo").maybeSingle();
          const v = (data?.value as Record<string, unknown> | null) ?? {};
          if (typeof v.robotsTxt === "string" && (v.robotsTxt as string).trim().length > 0) {
            body = v.robotsTxt as string;
          }
          if (typeof v.canonicalUrl === "string" && (v.canonicalUrl as string).trim()) {
            base = (v.canonicalUrl as string).trim().replace(/\/$/, "");
          }
          if (typeof v.indexNowKey === "string") indexNowKey = v.indexNowKey as string;
          noindex = !!v.noindexGlobal;
        } catch {
          /* fallback default */
        }
        if (noindex) {
          body = "User-agent: *\nDisallow: /\n";
        }
        const sitemapLine = `\nSitemap: ${base}/sitemap.xml\n`;
        const indexNowLine = indexNowKey ? `\n# IndexNow key: ${indexNowKey}.txt\n` : "";
        const full = body.replace(/\nSitemap:[^\n]*/gi, "").replace(/\s+$/, "") + sitemapLine + indexNowLine;
        return new Response(full, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});