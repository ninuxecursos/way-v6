import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Endpoint chamado por pg_cron a cada 5 min para consumir a fila
 * seo_ping_queue e fazer ping no Google/Bing com a URL do sitemap.
 * Auth: anon key no header apikey (padrão pg_cron).
 */
export const Route = createFileRoute("/api/public/hooks/seo-ping")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

        // Pega config SEO
        const { data: cfg } = await sb.from("site_settings").select("value").eq("key", "seo").maybeSingle();
        const base = ((cfg?.value as Record<string, unknown> | null)?.canonicalUrl as string | undefined)?.trim() || "https://www.wayhomeoficial.com.br";
        const sitemapUrl = `${base.replace(/\/$/, "")}/sitemap.xml`;

        // Pega até 20 itens pendentes
        const { data: pendings } = await sb
          .from("seo_ping_queue")
          .select("id")
          .eq("status", "pending")
          .lte("scheduled_at", new Date().toISOString())
          .order("created_at", { ascending: true })
          .limit(20);
        if (!pendings || pendings.length === 0) {
          return Response.json({ ok: true, processed: 0 });
        }

        const targets = [
          `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
          `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
        ];
        const results: Array<{ engine: string; status: number }> = [];
        for (const url of targets) {
          try {
            const r = await fetch(url);
            results.push({ engine: new URL(url).host, status: r.status });
          } catch {
            results.push({ engine: new URL(url).host, status: 0 });
          }
        }

        const ids = pendings.map((p) => p.id);
        await sb
          .from("seo_ping_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .in("id", ids);

        return Response.json({ ok: true, processed: ids.length, results });
      },
    },
  },
});