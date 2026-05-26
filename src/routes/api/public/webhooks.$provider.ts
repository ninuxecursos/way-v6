import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withApiErrorHandler, jsonError, jsonOk } from "@/lib/api-handler";
import {
  processMercadoPagoWebhook,
  processGenericWebhook,
  nextRetryDateFor,
  applyPaidSideEffects,
} from "@/lib/webhook-processors.server";

// P5: limite defensivo de payload (gateways legítimos ficam abaixo de 64KB).
const MAX_WEBHOOK_BYTES = 100_000;

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

async function verifyMercadoPago(req: Request, body: string, gateway: any): Promise<boolean> {
  // MP envia x-signature: ts=...,v1=hmac(sha256, manifest, secret)
  const secret: string | undefined = gateway?.config?.webhook_secret;
  // fix(S1): SEM secret = SEM autenticação. Antes aceitávamos qualquer requisição,
  // permitindo que terceiros marcassem pedidos como "paid". Agora rejeitamos.
  if (!secret) return false;
  const sig = req.headers.get("x-signature");
  const reqId = req.headers.get("x-request-id");
  if (!sig || !reqId) return false;
  const parts = Object.fromEntries(sig.split(",").map((p) => p.trim().split("=")));
  if (!parts.ts || !parts.v1) return false;
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") ?? "";
  const manifest = `id:${dataId};request-id:${reqId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return safeEqual(expected, parts.v1);
}

function verifyGenericHmac(body: string, signature: string | null, secret: string, algo = "sha256") {
  if (!signature) return false;
  const expected = createHmac(algo, secret).update(body).digest("hex");
  return safeEqual(expected, signature.replace(/^sha256=/i, ""));
}

// fix(S5): identificador único do evento por provider, para idempotência.
function extractEventId(provider: string, payload: any, request: Request): string | null {
  if (provider === "mercadopago") {
    // MP envia x-request-id único por entrega; também data.id é o pagamento
    const reqId = request.headers.get("x-request-id");
    const dataId = payload?.data?.id ?? payload?.id;
    return reqId ?? (dataId ? `mp:${dataId}` : null);
  }
  return payload?.event_id ?? payload?.id ?? null;
}

export const Route = createFileRoute("/api/public/webhooks/$provider")({
  server: {
    handlers: {
      // Healthcheck — alguns validadores externos fazem GET/HEAD/OPTIONS
      // antes de enviar a notificação POST. Responder 200 evita falso
      // "Webhook indisponível".
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Signature, X-Request-Id",
            "Access-Control-Max-Age": "86400",
          },
        }),
      HEAD: () => new Response(null, { status: 200 }),
      GET: () =>
        Response.json(
          { ok: true, message: "Webhook endpoint ativo. Envie POST com x-signature." },
          { status: 200 },
        ),
      POST: withApiErrorHandler("webhooks.gateway", async ({ request, params }) => {
        const provider = params.provider;

        // P5: rejeita payloads gigantes antes de qualquer trabalho.
        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > MAX_WEBHOOK_BYTES) {
          return jsonError("payload too large", 413, "PAYLOAD_TOO_LARGE");
        }

        // fix: se o ambiente server-side não tem SUPABASE_SERVICE_ROLE_KEY,
        // qualquer acesso a supabaseAdmin lança "Missing Supabase environment
        // variable(s)". O wrapper de erro mapeava isso para 503 "não
        // configurada", o que aparecia como genérico no Mercado Pago.
        // Aqui devolvemos uma mensagem explícita.
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
          const missing = [
            !process.env.SUPABASE_URL && "SUPABASE_URL",
            !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
          ].filter(Boolean).join(", ");
          return jsonError(
            `Configuração do servidor ausente: ${missing}. Defina estas variáveis no ambiente de produção (Vercel/hospedagem) e republique.`,
            500,
            "SERVER_MISCONFIGURED",
          );
        }

        const url = new URL(request.url);
        const gatewayId = url.searchParams.get("gateway");
        const body = await request.text();
        if (body.length > MAX_WEBHOOK_BYTES) {
          return jsonError("payload too large", 413, "PAYLOAD_TOO_LARGE");
        }

        let gateway: any = null;
        if (gatewayId) {
          const { data } = await supabaseAdmin.from("payment_gateways").select("*").eq("id", gatewayId).maybeSingle();
          gateway = data;
        } else {
          const { data } = await supabaseAdmin.from("payment_gateways").select("*")
            .eq("provider_type", provider).eq("active", true).order("priority").limit(1);
          gateway = data?.[0] ?? null;
        }

        let payload: any = {};
        let parseError: string | null = null;
        try { payload = body ? JSON.parse(body) : {}; }
        catch (e: any) { parseError = String(e?.message ?? e); }

        let signatureValid = false;
        if (gateway && provider === "mercadopago") {
          signatureValid = await verifyMercadoPago(request, body, gateway);
        } else if (gateway && provider === "generic_rest") {
          const headerName = gateway.config?.webhook_signature_header ?? "x-signature";
          const sig = request.headers.get(headerName);
          const secret = gateway.config?.webhook_secret;
          // fix(S1): mesmo princípio do MP — sem secret, rejeita.
          signatureValid = secret ? verifyGenericHmac(body, sig, secret) : false;
        }

        // fix(S5): grava com external_event_id; idempotente via unique index.
        const externalEventId = extractEventId(provider, payload, request);
        const { data: ev, error: evErr } = await supabaseAdmin.from("webhook_events").insert({
          gateway_id: gateway?.id ?? null,
          provider,
          event_type: payload?.type ?? payload?.action ?? null,
          external_event_id: externalEventId,
          signature: request.headers.get("x-signature"),
          signature_valid: signatureValid,
          payload,
          raw_body: body,
        } as any).select().single();

        // Conflito de unique = entrega repetida → já processado. Responde 200 rápido.
        if (evErr && (evErr as any).code === "23505") {
          return jsonOk({ ok: true, duplicate: true });
        }

        if (!gateway) return jsonOk({ ok: true, reason: "no_gateway" });
        // fix(S1/S6): assinatura inválida/ausente sempre rejeita.
        if (!signatureValid) {
          return jsonError("invalid signature", 401, "UNAUTHORIZED");
        }
        // fix(B3): payload não-JSON quando esperado é JSON → 400.
        if (parseError) {
          return jsonError(`invalid JSON: ${parseError}`, 400, "BAD_REQUEST");
        }

        try {
          const result = provider === "mercadopago"
            ? await processMercadoPagoWebhook(payload, gateway)
            : await processGenericWebhook(payload, gateway);
          // fix(S5): efeitos colaterais (recibo + e-mail) só na transição p/ paid.
          if (result.orderId && result.transitionedToPaid) {
            await applyPaidSideEffects(result.orderId, new URL(request.url).origin);
          }
          if (ev) {
            await supabaseAdmin.from("webhook_events").update({
              processed: true, processed_at: new Date().toISOString(), related_order_id: result.orderId,
            }).eq("id", ev.id);
          }
          return jsonOk({ ok: true, order_id: result.orderId ?? null });
        } catch (e: any) {
          const errMsg = String(e?.message ?? e);
          console.error(`[webhook ${provider}] processing failed`, {
            gateway_id: gateway?.id,
            event_id: ev?.id,
            error: errMsg,
          });
          if (ev) {
            // Agenda retry automático com backoff exponencial.
            const nextRetry = nextRetryDateFor(0);
            await supabaseAdmin.from("webhook_events").update({
              processing_error: errMsg,
              retry_count: 0,
              next_retry_at: nextRetry ? nextRetry.toISOString() : null,
            }).eq("id", ev.id);
          }
          // fix(S6): retornar 500 pede retry do gateway. Antes engolíamos a falha
          // e o pedido ficava pago no MP sem refletir aqui.
          return jsonError(errMsg, 500, "PROCESSING_FAILED");
        }
      }),
    },
  },
});