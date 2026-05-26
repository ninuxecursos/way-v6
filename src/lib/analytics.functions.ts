import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin } from "@/lib/admin-guards";

const RangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

function nonBotFilter(q: any) {
  return q.eq("is_bot", false).eq("is_admin_excluded", false);
}

export const getAnalyticsOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string }) => RangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { from, to } = data;

    const sessQ = supabaseAdmin
      .from("analytics_sessions")
      .select("session_id,visitor_id,user_id,pageviews_count,duration_seconds,device_type,ip_country", { count: "exact" })
      .gte("started_at", from)
      .lte("started_at", to)
      .eq("is_bot", false)
      .eq("is_admin_excluded", false)
      .limit(50000);

    const [{ data: sessions, count: sessionsCount }, { count: eventsCount }] = await Promise.all([
      sessQ,
      supabaseAdmin
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .gte("occurred_at", from)
        .lte("occurred_at", to),
    ]);

    const visitors = new Set((sessions || []).map((s: any) => s.visitor_id)).size;
    const pageviews = (sessions || []).reduce((acc: number, s: any) => acc + (s.pageviews_count || 0), 0);
    const totalDuration = (sessions || []).reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0);
    const avgDuration = sessions && sessions.length ? Math.round(totalDuration / sessions.length) : 0;
    const bounced = (sessions || []).filter((s: any) => (s.pageviews_count || 0) <= 1).length;
    const bounceRate = sessions && sessions.length ? Math.round((bounced / sessions.length) * 100) : 0;

    return {
      visitors,
      sessions: sessionsCount || 0,
      pageviews,
      events: eventsCount || 0,
      avg_duration_seconds: avgDuration,
      bounce_rate_pct: bounceRate,
    };
  });

export const getAnalyticsTimeseries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string; granularity: "hour" | "day" }) =>
    z.object({ from: z.string().datetime(), to: z.string().datetime(), granularity: z.enum(["hour", "day"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { data: rows } = await nonBotFilter(
      supabaseAdmin
        .from("analytics_sessions")
        .select("started_at,visitor_id,pageviews_count")
        .gte("started_at", data.from)
        .lte("started_at", data.to)
        .limit(50000),
    );
    const bucket = new Map<string, { sessions: number; visitors: Set<string>; pageviews: number }>();
    (rows || []).forEach((r: any) => {
      const d = new Date(r.started_at);
      const k = data.granularity === "hour"
        ? `${d.toISOString().slice(0, 13)}:00:00.000Z`
        : `${d.toISOString().slice(0, 10)}T00:00:00.000Z`;
      let entry = bucket.get(k);
      if (!entry) { entry = { sessions: 0, visitors: new Set(), pageviews: 0 }; bucket.set(k, entry); }
      entry.sessions++;
      entry.visitors.add(r.visitor_id);
      entry.pageviews += r.pageviews_count || 0;
    });
    return Array.from(bucket.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ts, v]) => ({ ts, sessions: v.sessions, visitors: v.visitors.size, pageviews: v.pageviews }));
  });

export const getAnalyticsTopLists = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string }) => RangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { data: sessions } = await nonBotFilter(
      supabaseAdmin
        .from("analytics_sessions")
        .select("landing_path,referrer_domain,ip_country,device_type,os,browser,utm_source,utm_campaign")
        .gte("started_at", data.from)
        .lte("started_at", data.to)
        .limit(50000),
    );
    const { data: clicks } = await supabaseAdmin
      .from("analytics_events")
      .select("element_text,element_selector,path")
      .eq("event_type", "click")
      .gte("occurred_at", data.from)
      .lte("occurred_at", data.to)
      .limit(5000);

    function tally(arr: any[], field: string, limit = 10) {
      const m = new Map<string, number>();
      arr.forEach((r) => {
        const k = (r[field] || "(unknown)").toString();
        m.set(k, (m.get(k) || 0) + 1);
      });
      return Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([key, count]) => ({ key, count }));
    }

    return {
      pages: tally(sessions || [], "landing_path"),
      referrers: tally(sessions || [], "referrer_domain"),
      countries: tally(sessions || [], "ip_country"),
      devices: tally(sessions || [], "device_type"),
      os: tally(sessions || [], "os"),
      browsers: tally(sessions || [], "browser"),
      utm_sources: tally(sessions || [], "utm_source"),
      utm_campaigns: tally(sessions || [], "utm_campaign"),
      top_clicks: tally(clicks || [], "element_text", 15),
    };
  });

export const getAnalyticsLiveSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase);
    const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data } = await supabaseAdmin
      .from("analytics_sessions")
      .select("session_id,visitor_id,user_id,ip_country,ip_city,device_type,browser,os,landing_path,exit_path,started_at,last_seen_at,pageviews_count")
      .eq("is_bot", false)
      .eq("is_admin_excluded", false)
      .gte("last_seen_at", cutoff)
      .order("last_seen_at", { ascending: false })
      .limit(100);
    return { sessions: data || [] };
  });

export const listAnalyticsSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string; q?: string; page?: number; pageSize?: number }) =>
    z.object({
      from: z.string().datetime(),
      to: z.string().datetime(),
      q: z.string().max(200).optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(25),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const offset = (data.page - 1) * data.pageSize;
    let q = supabaseAdmin
      .from("analytics_sessions")
      .select("*", { count: "exact" })
      .eq("is_bot", false)
      .eq("is_admin_excluded", false)
      .gte("started_at", data.from)
      .lte("started_at", data.to)
      .order("started_at", { ascending: false })
      .range(offset, offset + data.pageSize - 1);
    if (data.q && data.q.trim()) {
      const term = `%${data.q.trim()}%`;
      q = q.or(`ip_address.ilike.${term},ip_country.ilike.${term},ip_city.ilike.${term},landing_path.ilike.${term},referrer_domain.ilike.${term},visitor_id.ilike.${term}`);
    }
    const { data: rows, count } = await q;
    const list = rows || [];
    // LGPD: backfill de geolocalização via terceiro (ipwho.is) foi removido.
    // Enviar IPs de visitantes para API externa sem consentimento/DPA viola o
    // art. 7 da LGPD. Geo deve ser resolvido client-side (com consentimento)
    // ou via base local (MaxMind GeoLite2) hospedada no próprio backend.
    return { rows: list, total: count || 0 };
  });

export const getAnalyticsSessionDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().min(8).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { data: session } = await supabaseAdmin
      .from("analytics_sessions").select("*").eq("session_id", data.sessionId).maybeSingle();
    const { data: events } = await supabaseAdmin
      .from("analytics_events").select("*").eq("session_id", data.sessionId).order("occurred_at", { ascending: true }).limit(2000);
    return { session, events: events || [] };
  });

export const getAnalyticsSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase);
    const { data } = await supabaseAdmin.from("analytics_settings").select("*").maybeSingle();
    const { data: exclusions } = await supabaseAdmin
      .from("analytics_admin_exclusions").select("*").order("created_at", { ascending: false });
    return { settings: data, exclusions: exclusions || [] };
  });

export const updateAnalyticsSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { enabled?: boolean; retention_days?: number; anonymize_ip?: boolean; exclude_bots?: boolean }) =>
    z.object({
      enabled: z.boolean().optional(),
      retention_days: z.number().int().min(7).max(3650).optional(),
      anonymize_ip: z.boolean().optional(),
      exclude_bots: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const patch: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
    await supabaseAdmin.from("analytics_settings").update(patch as any).eq("id", true);
    return { ok: true };
  });

export const toggleAdminExclusion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; action: "add" | "remove"; reason?: string }) =>
    z.object({
      user_id: z.string().uuid(),
      action: z.enum(["add", "remove"]),
      reason: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const adminId = await assertAdmin(context.supabase);
    if (data.action === "add") {
      await supabaseAdmin.from("analytics_admin_exclusions").upsert(
        { user_id: data.user_id, reason: data.reason || "manual", created_by: adminId },
        { onConflict: "user_id" },
      );
    } else {
      await supabaseAdmin.from("analytics_admin_exclusions").delete().eq("user_id", data.user_id);
    }
    return { ok: true };
  });

// ---------- Backfill de geolocalização ----------
async function lookupGeoBackfill(ip: string) {
  if (!ip) return null;
  if (/^(127\.|10\.|192\.168\.|::1|fe80:)/i.test(ip)) return null;
  try {
    const res = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,region,city,latitude,longitude`,
      { signal: AbortSignal.timeout(2500) },
    );
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

export const backfillAnalyticsGeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase);
    const { data: rows } = await supabaseAdmin
      .from("analytics_sessions")
      .select("session_id,ip_address")
      .is("ip_country", null)
      .not("ip_address", "is", null)
      .order("started_at", { ascending: false })
      .limit(200);
    const list = rows || [];
    let ok = 0;
    let fail = 0;
    // Cache por IP para reduzir chamadas
    const cache = new Map<string, Awaited<ReturnType<typeof lookupGeoBackfill>>>();
    for (const r of list) {
      const ip = (r as any).ip_address as string;
      if (!ip) { fail++; continue; }
      let geo = cache.get(ip);
      if (geo === undefined) {
        geo = await lookupGeoBackfill(ip);
        cache.set(ip, geo);
      }
      if (!geo) { fail++; continue; }
      const { error } = await supabaseAdmin
        .from("analytics_sessions")
        .update({
          ip_country: geo.country,
          ip_region: geo.region,
          ip_city: geo.city,
          ip_lat: geo.lat,
          ip_lng: geo.lng,
        })
        .eq("session_id", (r as any).session_id);
      if (error) fail++; else ok++;
    }
    return { processed: list.length, ok, fail };
  });

// ---------- Métricas resumidas para o Dashboard ----------
export const getAnalyticsDashboardSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { range: "today" | "7d" | "30d" }) =>
    z.object({ range: z.enum(["today", "7d", "30d"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const now = new Date();
    const from = new Date(now);
    if (data.range === "today") from.setHours(0, 0, 0, 0);
    else if (data.range === "7d") from.setDate(from.getDate() - 7);
    else from.setDate(from.getDate() - 30);

    const liveCutoff = new Date(Date.now() - 5 * 60_000).toISOString();

    const [{ data: sessions, count: sessionsCount }, { count: liveCount }, { count: pvCount }] =
      await Promise.all([
        supabaseAdmin
          .from("analytics_sessions")
          .select("visitor_id,pageviews_count", { count: "exact" })
          .gte("started_at", from.toISOString())
          .lte("started_at", now.toISOString())
          .eq("is_bot", false)
          .eq("is_admin_excluded", false)
          .limit(50000),
        supabaseAdmin
          .from("analytics_sessions")
          .select("*", { count: "exact", head: true })
          .gte("last_seen_at", liveCutoff)
          .eq("is_bot", false)
          .eq("is_admin_excluded", false),
        supabaseAdmin
          .from("analytics_events")
          .select("*", { count: "exact", head: true })
          .eq("event_type", "pageview")
          .gte("occurred_at", from.toISOString())
          .lte("occurred_at", now.toISOString()),
      ]);

    const visitors = new Set((sessions || []).map((s: any) => s.visitor_id)).size;
    return {
      visitors,
      sessions: sessionsCount || 0,
      pageviews: pvCount || 0,
      live: liveCount || 0,
    };
  });