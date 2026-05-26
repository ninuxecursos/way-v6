/**
 * Cron endpoint: envia lembretes D-30 / D-7 / D-1 para pedidos pagos
 * cujo produto possui `event_date` configurado. Idempotente — usa as
 * colunas reminder_30_sent_at / reminder_7_sent_at / reminder_1_sent_at
 * para nunca enviar o mesmo lembrete duas vezes.
 *
 * Disparado pelo pg_cron uma vez por dia.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTemplateEmail } from "@/lib/mailer.server";

const SLUGS: Record<30 | 7 | 1, string> = {
  30: "event_reminder_30",
  7: "event_reminder_7",
  1: "event_reminder_1",
};
const COLS: Record<30 | 7 | 1, "reminder_30_sent_at" | "reminder_7_sent_at" | "reminder_1_sent_at"> = {
  30: "reminder_30_sent_at",
  7: "reminder_7_sent_at",
  1: "reminder_1_sent_at",
};

function isoDateInDays(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

async function processWindow(days: 30 | 7 | 1) {
  const target = isoDateInDays(days);
  const col = COLS[days];
  const slug = SLUGS[days];

  // produtos cujo INÍCIO do evento cai no dia alvo (prioriza event_starts_at,
  // mas mantém compat com event_date legado).
  const dayStart = `${target}T00:00:00.000Z`;
  const dayEnd = `${target}T23:59:59.999Z`;
  const { data: byStart } = await supabaseAdmin
    .from("products")
    .select("id, slug, translations, event_date, event_starts_at")
    .gte("event_starts_at", dayStart)
    .lte("event_starts_at", dayEnd);
  const { data: byDate } = await supabaseAdmin
    .from("products")
    .select("id, slug, translations, event_date, event_starts_at")
    .is("event_starts_at", null)
    .eq("event_date", target);
  const products = [...(byStart ?? []), ...(byDate ?? [])];
  if (products.length === 0) return { sent: 0, days };

  const productIds = products.map((p) => p.id);
  const productById = new Map(products.map((p) => [p.id, p] as const));

  // pedidos pagos relacionados a esses produtos via order_items, ainda sem o lembrete
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("order_id, product_id")
    .in("product_id", productIds);
  const orderIds = Array.from(new Set((items ?? []).map((i) => i.order_id)));
  if (orderIds.length === 0) return { sent: 0, days };

  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("id, customer_email, status, metadata, reminder_30_sent_at, reminder_7_sent_at, reminder_1_sent_at")
    .in("id", orderIds)
    .eq("status", "paid")
    .is(col as "reminder_30_sent_at", null);
  if (!orders || orders.length === 0) return { sent: 0, days };

  const itemByOrder = new Map<string, string>();
  for (const it of items ?? []) {
    if (it.product_id && !itemByOrder.has(it.order_id)) {
      itemByOrder.set(it.order_id, it.product_id);
    }
  }

  let sent = 0;
  for (const o of orders) {
    const productId = itemByOrder.get(o.id);
    const prod = productId ? productById.get(productId) : null;
    if (!prod) continue;
    const startIso = (prod as any).event_starts_at as string | null;
    const dateLabel = startIso
      ? new Date(startIso).toLocaleDateString("pt-BR", { timeZone: "UTC" })
      : prod.event_date ? fmtDateBR(prod.event_date) : "";
    if (!dateLabel) continue;
    const meta = (o.metadata as Record<string, unknown> | null) ?? {};
    const customerName = String(meta.customer_name ?? "") || o.customer_email;
    const productName = (prod.translations as any)?.pt?.name ?? prod.slug;
    try {
      await enqueueTemplateEmail({
        slug,
        to: o.customer_email,
        toName: customerName,
        variables: {
          customer_name: customerName,
          product_name: productName,
          event_date_label: dateLabel,
        },
      });
      const patch: Record<string, string> = {};
      patch[col] = new Date().toISOString();
      await supabaseAdmin.from("orders").update(patch as never).eq("id", o.id);
      sent++;
    } catch (e) {
      console.error("[event-reminders] failed for order", o.id, e);
    }
  }
  return { sent, days };
}

export const Route = createFileRoute("/api/public/hooks/event-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const results = await Promise.all([
          processWindow(30),
          processWindow(7),
          processWindow(1),
        ]);
        return new Response(JSON.stringify({ ok: true, results }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});