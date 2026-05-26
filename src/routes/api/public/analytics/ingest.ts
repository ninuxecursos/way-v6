import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseUA, extractDomain, anonymizeIp } from "@/lib/analytics/ua-parser";

const EventSchema = z.object({
  event_type: z.string().min(1).max(40),
  path: z.string().max(2000).optional().nullable(),
  page_title: z.string().max(500).optional().nullable(),
  element_tag: z.string().max(40).optional().nullable(),
  element_id: z.string().max(200).optional().nullable(),
  element_class: z.string().max(500).optional().nullable(),
  element_text: z.string().max(500).optional().nullable(),
  element_selector: z.string().max(500).optional().nullable(),
  x: z.number().int().optional().nullable(),
  y: z.number().int().optional().nullable(),
  scroll_depth_pct: z.number().int().min(0).max(100).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  occurred_at: z.string().datetime().optional().nullable(),
});

const PayloadSchema = z.object({
  session_id: z.string().min(8).max(64),
  visitor_id: z.string().min(8).max(64).optional(),
  user_id: z.string().uuid().nullable().optional(),
  is_new_session: z.boolean().optional(),
  user_agent: z.string().max(1000).optional(),
  screen_w: z.number().int().nullable().optional(),
  screen_h: z.number().int().nullable().optional(),
  viewport_w: z.number().int().nullable().optional(),
  viewport_h: z.number().int().nullable().optional(),
  language: z.string().max(40).nullable().optional(),
  timezone: z.string().max(80).nullable().optional(),
  referrer: z.string().max(2000).nullable().optional(),
  landing_path: z.string().max(2000).nullable().optional(),
  page_title: z.string().max(500).nullable().optional(),
  utm_source: z.string().max(200).nullable().optional(),
  utm_medium: z.string().max(200).nullable().optional(),
  utm_campaign: z.string().max(200).nullable().optional(),
  utm_term: z.string().max(200).nullable().optional(),
  utm_content: z.string().max(200).nullable().optional(),
  events: z.array(EventSchema).max(50).optional().default([]),
});

// Rate-limit simples em memória do Worker (cold-start zera, mas filtra rajadas).
const RATE_BUCKET = new Map<string, { count: number; ts: number }>();
function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = RATE_BUCKET.get(key);
  if (!b || now - b.ts > windowMs) {
    RATE_BUCKET.set(key, { count: 1, ts: now });
    return true;
  }
  b.count++;
  if (b.count > max) return false;
  return true;
}

function getIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    ""
  );
}

// Geolocalização best-effort via ipwho.is (free, sem chave, IPv4/IPv6).
async function lookupGeo(ip: string): Promise<{
  country: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
} | null> {
  if (!ip) return null;
  // Ignora loopback / privados
  if (/^(127\.|10\.|192\.168\.|::1|fe80:)/i.test(ip)) return null;
  try {
    const ctrl = AbortSignal.timeout(2500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,region,city,latitude,longitude`, { signal: ctrl });
    if (!res.ok) return null;
    const j: any = await res.json();
    if (!j || j.success === false) return null;
    return {
      country: j.country || null,
      region: j.region || null,
      city: j.city || null,
      lat: typeof j.latitude === "number" ? j.latitude : null,
      lng: typeof j.longitude === "number" ? j.longitude : null,
    };
  } catch {
    return null;
  }
}

async function getSettings() {
  const { data } = await supabaseAdmin.from("analytics_settings").select("*").maybeSingle();
  return data || { enabled: true, retention_days: 365, anonymize_ip: false, exclude_bots: true };
}

export const Route = createFileRoute("/api/public/analytics/ingest")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204 }),
      POST: async ({ request }) => {
        try {
          const settings = await getSettings();
          if (!settings.enabled) return Response.json({ ok: true, skipped: "disabled" });

          const raw = await request.json().catch(() => null);
          const parsed = PayloadSchema.safeParse(raw);
          if (!parsed.success) {
            return Response.json({ ok: false, error: "invalid_payload" }, { status: 400 });
          }
          const data = parsed.data;

          const ip = getIp(request);
          if (!rateLimit(`ip:${ip}`, 200, 60_000)) {
            return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
          }
          if (!rateLimit(`sid:${data.session_id}`, 100, 10_000)) {
            return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
          }

          // Exclusão de admin
          let isAdminExcluded = false;
          if (data.user_id) {
            const { data: ex } = await supabaseAdmin
              .from("analytics_admin_exclusions")
              .select("user_id")
              .eq("user_id", data.user_id)
              .maybeSingle();
            if (ex) isAdminExcluded = true;
          }
          if (isAdminExcluded) {
            return Response.json({ ok: true, skipped: "admin" });
          }

          const uaInfo = parseUA(data.user_agent);
          if (uaInfo.is_bot && settings.exclude_bots) {
            return Response.json({ ok: true, skipped: "bot" });
          }

          const ipStored = settings.anonymize_ip ? anonymizeIp(ip) : ip;
          // Cloudflare por vezes retorna "XX"/"T1" para origem desconhecida.
          const rawCountry = request.headers.get("cf-ipcountry");
          const rawCity = request.headers.get("cf-ipcity");
          const rawRegion = request.headers.get("cf-region");
          const cfCountry = rawCountry && !/^(xx|t1)$/i.test(rawCountry) ? rawCountry : null;
          let country: string | null = cfCountry;
          let city: string | null = rawCity || null;
          let region: string | null = rawRegion || null;
          const latH = request.headers.get("cf-iplatitude");
          const lngH = request.headers.get("cf-iplongitude");
          let lat: number | null = latH ? Number(latH) : null;
          let lng: number | null = lngH ? Number(lngH) : null;
          // Fallback de geolocalização quando os headers do Cloudflare não bastam
          if ((!country || !city) && ip) {
            const geo = await lookupGeo(ip);
            if (geo) {
              country = country || geo.country;
              region = region || geo.region;
              city = city || geo.city;
              lat = lat ?? geo.lat;
              lng = lng ?? geo.lng;
            }
          }

          const isInit = !!data.user_agent;
          if (isInit) {
            // Upsert da sessão
            await supabaseAdmin.from("analytics_sessions").upsert(
              {
                session_id: data.session_id,
                visitor_id: data.visitor_id || data.session_id,
                user_id: data.user_id ?? null,
                ip_address: ipStored || null,
                ip_country: country,
                ip_region: region,
                ip_city: city,
                ip_lat: lat,
                ip_lng: lng,
                user_agent: data.user_agent ?? null,
                device_type: uaInfo.device_type,
                os: uaInfo.os,
                os_version: uaInfo.os_version,
                browser: uaInfo.browser,
                browser_version: uaInfo.browser_version,
                screen_w: data.screen_w ?? null,
                screen_h: data.screen_h ?? null,
                viewport_w: data.viewport_w ?? null,
                viewport_h: data.viewport_h ?? null,
                language: data.language ?? null,
                timezone: data.timezone ?? null,
                referrer: data.referrer ?? null,
                referrer_domain: extractDomain(data.referrer) || null,
                utm_source: data.utm_source ?? null,
                utm_medium: data.utm_medium ?? null,
                utm_campaign: data.utm_campaign ?? null,
                utm_term: data.utm_term ?? null,
                utm_content: data.utm_content ?? null,
                landing_path: data.landing_path ?? null,
                exit_path: data.landing_path ?? null,
                last_seen_at: new Date().toISOString(),
                is_bot: uaInfo.is_bot,
                is_admin_excluded: false,
              },
              { onConflict: "session_id" },
            );
          }

          // Eventos
          if (data.events && data.events.length > 0) {
            const rows = data.events.map((e) => ({
              session_id: data.session_id,
              visitor_id: data.visitor_id || data.session_id,
              user_id: data.user_id ?? null,
              event_type: e.event_type,
              path: e.path ?? null,
              page_title: e.page_title ?? null,
              element_tag: e.element_tag ?? null,
              element_id: e.element_id ?? null,
              element_class: e.element_class ?? null,
              element_text: e.element_text ?? null,
              element_selector: e.element_selector ?? null,
              x: e.x ?? null,
              y: e.y ?? null,
              scroll_depth_pct: e.scroll_depth_pct ?? null,
              metadata: e.metadata ?? {},
              occurred_at: e.occurred_at ?? new Date().toISOString(),
            }));
            await supabaseAdmin.from("analytics_events").insert(rows);

            // Atualiza contadores e exit_path
            const pvCount = rows.filter((r) => r.event_type === "pageview").length;
            const lastPv = [...rows].reverse().find((r) => r.event_type === "pageview");
            const patch: Record<string, unknown> = {
              last_seen_at: new Date().toISOString(),
              events_count: rows.length,
            };
            if (pvCount > 0) patch.pageviews_count = pvCount;
            if (lastPv?.path) patch.exit_path = lastPv.path;

            // Increment via RPC seria ideal; aqui fazemos best-effort via update direto
            const { data: existing } = await supabaseAdmin
              .from("analytics_sessions")
              .select("events_count,pageviews_count,started_at")
              .eq("session_id", data.session_id)
              .maybeSingle();
            if (existing) {
              const start = new Date(existing.started_at as string).getTime();
              patch.events_count = (existing.events_count || 0) + rows.length;
              if (pvCount > 0) patch.pageviews_count = (existing.pageviews_count || 0) + pvCount;
              (patch as any).duration_seconds = Math.max(0, Math.round((Date.now() - start) / 1000));
              await supabaseAdmin.from("analytics_sessions").update(patch as any).eq("session_id", data.session_id);
            }
          }

          return Response.json({ ok: true });
        } catch (err: any) {
          console.error("[analytics/ingest]", err?.message);
          return Response.json({ ok: false, error: "internal" }, { status: 500 });
        }
      },
    },
  },
});