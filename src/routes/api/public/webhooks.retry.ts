/**
 * Cron-friendly endpoint que reprocessa webhooks que falharam,
 * respeitando o backoff exponencial gravado em `next_retry_at`.
 *
 * Segurança: requer header `x-cron-secret` igual a `site_settings.cron_secret`
 * (gerenciado no admin) OU a env `CRON_SECRET`. Sem segredo configurado, rejeita.
 *
 * Idempotência: processWebhookByProvider usa upsert/transição-para-paid → repetir é seguro.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withApiErrorHandler, jsonError, jsonOk } from "@/lib/api-handler";
import {
  processWebhookByProvider,
  nextRetryDateFor,
  MAX_WEBHOOK_RETRIES,
  applyPaidSideEffects,
} from "@/lib/webhook-processors.server";

const BATCH_LIMIT = 25;

async function getCronSecret(): Promise<string | null> {
  const env = process.env.CRON_SECRET;
  if (env) return env;
  const { data } = await supabaseAdmin
    .from("site_settings").select("value").eq("key", "cron_secret").maybeSingle();
  const v = (data?.value as any)?.value ?? null;
  return typeof v === "string" && v.length > 0 ? v : null;
}

export const Route = createFileRoute("/api/public/webhooks/retry")({
  server: {
    handlers: {
      POST: withApiErrorHandler("webhooks.retry", async ({ request }) => {
        const secret = await getCronSecret();
        if (!secret) {
          return jsonError("cron secret not configured", 503, "NO_CRON_SECRET");
        }
        const provided = request.headers.get("x-cron-secret");
        if (provided !== secret) {
          return jsonError("unauthorized", 401, "UNAUTHORIZED");
        }

        const nowIso = new Date().toISOString();
        const { data: events } = await supabaseAdmin
          .from("webhook_events")
          .select("*")
          .eq("processed", false)
          .eq("signature_valid", true)
          .lte("next_retry_at", nowIso)
          .lt("retry_count", MAX_WEBHOOK_RETRIES)
          .order("next_retry_at", { ascending: true })
          .limit(BATCH_LIMIT);

        if (!events || events.length === 0) {
          return jsonOk({ ok: true, processed: 0 });
        }

        const stats = { processed: 0, succeeded: 0, failed: 0, gaveUp: 0 };

        for (const ev of events as any[]) {
          stats.processed += 1;
          let gateway: any = null;
          if (ev.gateway_id) {
            const { data } = await supabaseAdmin
              .from("payment_gateways").select("*").eq("id", ev.gateway_id).maybeSingle();
            gateway = data;
          }
          if (!gateway) {
            await supabaseAdmin.from("webhook_events").update({
              processing_error: "gateway not found at retry time",
              last_retry_at: nowIso,
              next_retry_at: null,
            }).eq("id", ev.id);
            stats.gaveUp += 1;
            continue;
          }

          try {
            const result = await processWebhookByProvider(ev.provider, ev.payload, gateway);
            if (result.orderId && result.transitionedToPaid) {
              await applyPaidSideEffects(result.orderId, new URL(request.url).origin);
            }
            await supabaseAdmin.from("webhook_events").update({
              processed: true,
              processed_at: new Date().toISOString(),
              related_order_id: result.orderId,
              last_retry_at: nowIso,
              next_retry_at: null,
              processing_error: null,
            }).eq("id", ev.id);
            stats.succeeded += 1;
          } catch (err: any) {
            const attempt = (ev.retry_count ?? 0) + 1;
            const next = nextRetryDateFor(attempt);
            await supabaseAdmin.from("webhook_events").update({
              retry_count: attempt,
              last_retry_at: nowIso,
              next_retry_at: next ? next.toISOString() : null,
              processing_error: String(err?.message ?? err),
            }).eq("id", ev.id);
            if (next) stats.failed += 1; else stats.gaveUp += 1;
          }
        }

        return jsonOk({ ok: true, ...stats });
      }),
    },
  },
});