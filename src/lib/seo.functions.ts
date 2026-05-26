/**
 * SEO settings: canonicalUrl, robots.txt customizado, IndexNow key, etc.
 * Admin grava/lê via serializado JSON; público lê só o que precisa.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_ROBOTS = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /conta
Disallow: /api/
Disallow: /reservation
Disallow: /checkout
`;

export interface PublicSeo {
  canonicalUrl: string;
  robotsTxt: string;
  noindexGlobal: boolean;
  indexNowKey: string;
}

/** Snapshot público (usado por robots.txt e sitemap.xml). */
export const getPublicSeo = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ json: string }> => {
    try {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "seo").maybeSingle();
      const v = (data?.value as Partial<PublicSeo>) ?? {};
      const out: PublicSeo = {
        canonicalUrl: v.canonicalUrl?.trim() || "https://www.wayhomeoficial.com.br",
        robotsTxt: typeof v.robotsTxt === "string" && v.robotsTxt.length > 0 ? v.robotsTxt : DEFAULT_ROBOTS,
        noindexGlobal: !!v.noindexGlobal,
        indexNowKey: v.indexNowKey ?? "",
      };
      return { json: JSON.stringify(out) };
    } catch {
      return { json: JSON.stringify({ canonicalUrl: "https://www.wayhomeoficial.com.br", robotsTxt: DEFAULT_ROBOTS, noindexGlobal: false, indexNowKey: "" }) };
    }
  },
);

export const getAdminSeo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ json: string }> => {
    const { supabase: sb } = context;
    const { data, error } = await sb.from("site_settings").select("value").eq("key", "seo").maybeSingle();
    if (error) throw new Error(error.message);
    return { json: JSON.stringify(data?.value ?? {}) };
  });

export const saveAdminSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { json: string }) => d)
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { supabase: sb, userId } = context;
    const parsed = JSON.parse(data.json);
    const { error } = await sb
      .from("site_settings")
      .upsert({ key: "seo", value: parsed, updated_by: userId, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Dispara um ping manual (admin) submetendo sitemap ao Google. */
export const pingSitemapNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ ok: boolean; results: Array<{ engine: string; status: number }> }> => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "seo").maybeSingle();
    const base = (data?.value as Partial<PublicSeo> | null)?.canonicalUrl?.trim() || "https://www.wayhomeoficial.com.br";
    const sitemapUrl = `${base.replace(/\/$/, "")}/sitemap.xml`;
    const targets = [
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    ];
    const results: Array<{ engine: string; status: number }> = [];
    for (const url of targets) {
      try {
        const r = await fetch(url, { method: "GET" });
        results.push({ engine: new URL(url).host, status: r.status });
      } catch {
        results.push({ engine: new URL(url).host, status: 0 });
      }
    }
    return { ok: true, results };
  });