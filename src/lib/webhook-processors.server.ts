/**
 * Processadores reutilizáveis de webhooks de gateways de pagamento.
 * Server-only. Usado tanto pelo handler em tempo real quanto pelo
 * job de retry automático (`/api/public/webhooks/retry`).
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyGroupCompleteIfReady } from "./group-notifications.server";
import { autoAssignGroupRooms } from "./group-allocation.server";
import { generateReceiptForOrder } from "./receipts.server";
import { enqueueTemplateEmail } from "./mailer.server";
import { logServerWarning } from "./logger.server";

export type WebhookProcessResult = {
  orderId: string | null;
  transitionedToPaid?: boolean;
};

/**
 * Aplica regras do Modo Galera após o pedido ser confirmado:
 *  - Se o pedido tem `group_coupon_code` em metadata → vincula como membro
 *    do grupo existente (e fecha o grupo se atingiu capacidade).
 *  - Se o pedido é titular (`is_group_holder=true`) → cria um novo grupo
 *    com cupom único.
 *  - Caso contrário (Galera sem cupom e sem capacidade) → ignora silenciosamente.
 */
export async function applyGroupForPaidOrder(orderId: string) {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id,user_id,group_id,reservation_type,metadata,customer_email")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.group_id) return;
  if (order.reservation_type !== "shared") return;

  const meta = (order.metadata as Record<string, unknown> | null) ?? {};
  const coupon = String(meta.group_coupon_code ?? "").trim().toUpperCase();
  const customerName = String(meta.customer_name ?? "");
  const customerPhone = (meta.customer_phone as string | null) ?? null;
  const userId = order.user_id;
  if (!userId) return;

  if (coupon) {
    // Vincula a um grupo existente via RPC atômica (lock + capacity).
    const { data: member, error: joinErr } = await supabaseAdmin.rpc(
      "reservation_group_join_paid" as never,
      {
        _coupon: coupon,
        _order_id: order.id,
        _user_id: userId,
        _full_name: customerName || order.customer_email,
        _email: order.customer_email,
        _phone: customerPhone ?? "",
      } as never,
    );
    if (joinErr) {
      const msg = String(joinErr.message || "");
      // Cupom inválido / fechado / cheio: não relança — pedido segue pago,
      // mas não entra em nenhum grupo. Admin pode tratar manualmente.
      if (/coupon_not_found|group_closed|group_full/.test(msg)) return;
      throw joinErr;
    }
    const groupId = (member as { group_id?: string } | null)?.group_id ?? null;
    if (!groupId) return;

    // Fecha o grupo se atingiu a capacidade.
    const { count: paid } = await supabaseAdmin
      .from("reservation_group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("payment_status", "paid");
    const { data: grp } = await supabaseAdmin
      .from("reservation_groups")
      .select("capacity")
      .eq("id", groupId)
      .maybeSingle();
    const capacity = grp?.capacity ?? 0;
    if (capacity > 0 && (paid ?? 0) >= capacity) {
      await supabaseAdmin
        .from("reservation_groups")
        .update({ status: "completed", closed_at: new Date().toISOString() })
        .eq("id", groupId)
        .eq("status", "open");
      try { await autoAssignGroupRooms(groupId); }
      catch (ae) { console.error("[applyGroupForPaidOrder] autoAssign falhou:", ae); }
      await notifyGroupCompleteIfReady(groupId);
    }
    return;
  }

  // Titular: cria o grupo com cupom único
  const capacity = Number(meta.group_capacity ?? 0);
  if (!capacity || capacity < 2) return;
  const productId = (meta.product_id as string | null) ?? null;
  const productSlug = (meta.product_slug as string | null) ?? "";
  if (!productId) return;

  await supabaseAdmin.rpc("reservation_group_create", {
    _holder_user_id: userId,
    _holder_name: customerName || order.customer_email,
    _holder_order_id: order.id,
    _product_id: productId,
    _product_slug: productSlug,
    _capacity: capacity,
    _email: order.customer_email,
    _phone: customerPhone ?? "",
  });
}

/**
 * Incrementa o `used_count` do cupom promocional associado ao pedido,
 * caso exista. Chamado uma vez quando o pedido transiciona para `paid`.
 * Idempotência: marca `metadata.promo_usage_recorded=true` no pedido.
 */
export async function incrementPromoCouponIfUsed(orderId: string) {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, metadata")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;
  const meta = (order.metadata as Record<string, unknown> | null) ?? {};
  const code = String(meta.promo_coupon_code ?? "").trim();
  if (!code) return;
  if (meta.promo_usage_recorded === true) return;
  await supabaseAdmin.rpc("increment_promo_coupon_usage" as never, { _code: code } as never);
  await supabaseAdmin
    .from("orders")
    .update({ metadata: { ...meta, promo_usage_recorded: true } as any })
    .eq("id", orderId);
}

/**
 * Aplica TODOS os efeitos colaterais quando um pedido transiciona para "paid":
 *  - Vincula/cria grupo Galera (titular + membros por cupom)
 *  - Aloca quarto individual (quando reservation_type=individual)
 *  - Incrementa contador de cupom promocional
 *  - Gera recibo
 *  - Enfileira e-mail "order_paid"
 *
 * Idempotente: cada operação verifica seu próprio estado antes de aplicar.
 * Chamado tanto pelo webhook quanto pelo fluxo síncrono (cartão aprovado on-site).
 */
export async function applyPaidSideEffects(orderId: string, origin: string) {
  try { await applyGroupForPaidOrder(orderId); }
  catch (ge) { console.error("[applyPaidSideEffects] grupo Galera:", ge); }

  try {
    const { data: o } = await supabaseAdmin
      .from("orders").select("reservation_type, room_id")
      .eq("id", orderId).maybeSingle();
    if (o && !o.room_id && (o.reservation_type === "individual" || o.reservation_type == null)) {
      await supabaseAdmin.rpc("allocate_individual_room", { _order_id: orderId });
    }
  } catch (ae) { console.error("[applyPaidSideEffects] alocação individual:", ae); }

  try { await incrementPromoCouponIfUsed(orderId); }
  catch (pe) { console.error("[applyPaidSideEffects] cupom promo:", pe); }

  try { await generateReceiptForOrder(orderId, origin); }
  catch (re) { console.error("[applyPaidSideEffects] recibo:", re); }

  try {
    const { data: o } = await supabaseAdmin.from("orders")
      .select("customer_email, total_cents, currency, user_id, id")
      .eq("id", orderId).maybeSingle();
    if (o?.customer_email) {
      const enq = await enqueueTemplateEmail({
        slug: "order_paid", to: o.customer_email, userId: o.user_id ?? undefined,
        variables: { order_id: o.id, total: ((o.total_cents ?? 0) / 100).toFixed(2), currency: o.currency },
      });
      if (!enq) {
        logServerWarning("email template 'order_paid' ausente ou inativo", {
          scope: "applyPaidSideEffects", extra: { order_id: o.id },
        });
      }
    }
  } catch (ee) { console.error("[applyPaidSideEffects] e-mail:", ee); }
}

export async function processMercadoPagoWebhook(
  payload: any,
  gateway: any,
): Promise<WebhookProcessResult> {
  const paymentId = payload?.data?.id ?? payload?.id;
  if (!paymentId) return { orderId: null };
  const token: string | undefined = gateway?.config?.access_token;
  if (!token) throw new Error("MP webhook: access_token ausente em config do gateway.");

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const pay = await res.json();
  if (!res.ok) throw new Error(`MP API error [${res.status}]: ${JSON.stringify(pay)}`);

  const orderId: string | undefined = pay.external_reference;
  if (!orderId) return { orderId: null };

  const statusMap: Record<string, string> = {
    approved: "approved", authorized: "authorized", pending: "pending", in_process: "pending",
    in_mediation: "disputed",
    rejected: "rejected", cancelled: "cancelled", refunded: "refunded", charged_back: "refunded",
  };
  const intentStatus = statusMap[pay.status] ?? "pending";
  const orderStatus = pay.status === "approved" ? "paid"
    : pay.status === "refunded" || pay.status === "charged_back" ? "refunded"
    : pay.status === "rejected" || pay.status === "cancelled" ? "cancelled" : "pending";

  await supabaseAdmin.from("payment_intents").upsert({
    order_id: orderId,
    gateway_id: gateway.id,
    external_id: String(paymentId),
    status: intentStatus,
    amount_cents: Math.round((pay.transaction_amount ?? 0) * 100),
    currency: pay.currency_id ?? "BRL",
    raw_response: pay,
  } as any, { onConflict: "external_id" });

  const { data: prev } = await supabaseAdmin.from("orders").select("status, paid_at").eq("id", orderId).maybeSingle();
  const wasNotPaid = !prev || prev.status !== "paid";
  await supabaseAdmin.from("orders").update({
    status: orderStatus,
    payment_provider: "mercadopago",
    payment_provider_id: String(paymentId),
    payment_status: intentStatus,
    paid_at: orderStatus === "paid"
      ? (prev?.paid_at ?? new Date().toISOString())
      : (orderStatus === "refunded" || orderStatus === "cancelled" ? prev?.paid_at ?? null : null),
  }).eq("id", orderId);

  return { orderId, transitionedToPaid: wasNotPaid && orderStatus === "paid" };
}

export async function processGenericWebhook(
  payload: any,
  gateway: any,
): Promise<WebhookProcessResult> {
  const cfg = gateway?.config ?? {};
  const orderId = payload?.[cfg.webhook_order_id_field ?? "external_reference"];
  const status = payload?.[cfg.webhook_status_field ?? "status"];
  if (!orderId) return { orderId: null, transitionedToPaid: false };
  const map: Record<string, string> = cfg.status_map ?? {
    paid: "paid", approved: "paid", failed: "cancelled", refunded: "refunded", pending: "pending",
  };
  const orderStatus = map[String(status).toLowerCase()] ?? "pending";

  const externalId = payload?.[cfg.webhook_external_id_field ?? "id"] ?? null;
  if (externalId) {
    await supabaseAdmin.from("payment_intents").upsert({
      order_id: orderId,
      gateway_id: gateway.id,
      external_id: String(externalId),
      status: orderStatus,
      amount_cents: Number(payload?.[cfg.webhook_amount_field ?? "amount_cents"] ?? 0),
      currency: payload?.[cfg.webhook_currency_field ?? "currency"] ?? "BRL",
      raw_response: payload,
    } as any, { onConflict: "external_id" });
  }

  const { data: prev } = await supabaseAdmin.from("orders").select("status, paid_at").eq("id", orderId).maybeSingle();
  const wasNotPaid = !prev || prev.status !== "paid";
  await supabaseAdmin.from("orders").update({
    status: orderStatus,
    payment_provider: gateway.name,
    payment_status: orderStatus,
    paid_at: orderStatus === "paid" ? (prev?.paid_at ?? new Date().toISOString()) : prev?.paid_at ?? null,
  }).eq("id", orderId);
  return { orderId, transitionedToPaid: wasNotPaid && orderStatus === "paid" };
}

export async function processWebhookByProvider(
  provider: string,
  payload: any,
  gateway: any,
): Promise<WebhookProcessResult> {
  if (provider === "mercadopago") return processMercadoPagoWebhook(payload, gateway);
  return processGenericWebhook(payload, gateway);
}

/**
 * Backoff exponencial para retry (em minutos).
 * Tentativas: 1=1m, 2=5m, 3=15m, 4=1h, 5=6h, 6=24h. Depois desiste.
 */
const RETRY_SCHEDULE_MIN = [1, 5, 15, 60, 360, 1440];
export const MAX_WEBHOOK_RETRIES = RETRY_SCHEDULE_MIN.length;

export function nextRetryDateFor(attempt: number): Date | null {
  if (attempt >= RETRY_SCHEDULE_MIN.length) return null;
  const minutes = RETRY_SCHEDULE_MIN[attempt];
  return new Date(Date.now() + minutes * 60_000);
}