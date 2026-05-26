/**
 * Envia eventos server-side para Meta Conversions API e GA4 Measurement Protocol.
 * Usa segredos guardados em site_settings.tracking (admin) — nunca expostos ao cliente.
 * LGPD: emails e telefones sao SHA-256 hasheados antes do envio.
 */
import { createServerFn } from "@tanstack/react-start";
import { createHash } from "crypto";
import { supabase } from "@/integrations/supabase/client";

type TrackingConfig = {
  meta?: { pixelId?: string; accessToken?: string; testEventCode?: string; enabled?: boolean };
  ga4?: { measurementId?: string; apiSecret?: string; enabled?: boolean };
};

async function loadConfig(): Promise<TrackingConfig> {
  try {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "tracking").maybeSingle();
    return (data?.value as TrackingConfig) ?? {};
  } catch {
    return {};
  }
}

function sha256(v?: string | null): string | undefined {
  if (!v) return undefined;
  return createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
}

export interface TrackEventInput {
  event: "Purchase" | "CompleteRegistration" | "Lead" | "InitiateCheckout" | "ViewContent" | "AddToCart";
  /** Identificador estavel (orderId, userId) — usado para deduplicacao Meta. */
  eventId?: string;
  url?: string;
  /** Dados do usuario para matching (Meta) e client_id (GA4). */
  user?: {
    email?: string;
    phone?: string;
    clientId?: string; // ga _ga cookie ou anonId
    userAgent?: string;
    ip?: string;
    externalId?: string;
  };
  value?: number; // em unidade monetaria (ex: 1234.56)
  currency?: string; // ex: BRL
  contents?: Array<{ id?: string; quantity?: number; price?: number }>;
}

/** Dispara o evento em Meta CAPI + GA4 MP em paralelo (best-effort). */
export const sendServerEvent = createServerFn({ method: "POST" })
  .inputValidator((d: TrackEventInput) => d)
  .handler(async ({ data }) => {
    const cfg = await loadConfig();
    const results: Record<string, { ok: boolean; status?: number; error?: string }> = {};

    // ---------- Meta Conversions API ----------
    const meta = cfg.meta;
    if (meta?.enabled && meta.pixelId && meta.accessToken) {
      try {
        const eventTime = Math.floor(Date.now() / 1000);
        const body = {
          data: [
            {
              event_name: data.event,
              event_time: eventTime,
              event_id: data.eventId,
              event_source_url: data.url,
              action_source: "website",
              user_data: {
                em: data.user?.email ? [sha256(data.user.email)] : undefined,
                ph: data.user?.phone ? [sha256(data.user.phone.replace(/\D/g, ""))] : undefined,
                external_id: data.user?.externalId ? [sha256(data.user.externalId)] : undefined,
                client_user_agent: data.user?.userAgent,
                client_ip_address: data.user?.ip,
              },
              custom_data: {
                currency: data.currency,
                value: data.value,
                contents: data.contents,
              },
            },
          ],
          test_event_code: meta.testEventCode || undefined,
        };
        const r = await fetch(`https://graph.facebook.com/v19.0/${meta.pixelId}/events?access_token=${encodeURIComponent(meta.accessToken)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        results.meta = { ok: r.ok, status: r.status };
        if (!r.ok) results.meta.error = (await r.text()).slice(0, 200);
      } catch (e) {
        results.meta = { ok: false, error: (e as Error).message };
      }
    }

    // ---------- GA4 Measurement Protocol ----------
    const ga4 = cfg.ga4;
    if (ga4?.enabled && ga4.measurementId && ga4.apiSecret) {
      try {
        const clientId = data.user?.clientId || `${Date.now()}.${Math.random().toString(36).slice(2)}`;
        const ga4EventName = data.event === "Purchase" ? "purchase"
          : data.event === "CompleteRegistration" ? "sign_up"
          : data.event === "InitiateCheckout" ? "begin_checkout"
          : data.event === "AddToCart" ? "add_to_cart"
          : data.event === "ViewContent" ? "view_item"
          : "generate_lead";
        const body = {
          client_id: clientId,
          events: [{
            name: ga4EventName,
            params: {
              currency: data.currency,
              value: data.value,
              transaction_id: data.eventId,
              page_location: data.url,
              items: data.contents?.map((c) => ({ item_id: c.id, quantity: c.quantity, price: c.price })),
            },
          }],
        };
        const r = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(ga4.measurementId)}&api_secret=${encodeURIComponent(ga4.apiSecret)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        results.ga4 = { ok: r.ok, status: r.status };
      } catch (e) {
        results.ga4 = { ok: false, error: (e as Error).message };
      }
    }

    return { results };
  });