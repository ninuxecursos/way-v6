import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateReceiptForOrder, renderReceiptByNumber } from "./receipts.server";
import { withErrorLogging } from "./server-fn-error";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const issueReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid(), origin: z.string().url() }).parse(d))
  .handler(withErrorLogging("issueReceipt", async ({ data, context }) => {
    // Permissão: admin ou financeiro
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const allowed = (roles ?? []).some((r: any) => ["super_admin", "admin", "financeiro"].includes(r.role));
    if (!allowed) throw new Error("Sem permissão para emitir recibos.");
    const r = await generateReceiptForOrder(data.orderId, data.origin);
    return { number: r.number, id: r.id };
  }));

export const previewReceiptTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    html: z.string().max(50000),
    css: z.string().max(20000).optional(),
  }).parse(d))
  .handler(withErrorLogging("previewReceiptTemplate", async ({ data }) => {
    const { renderTemplate } = await import("./receipts.server");
    const sample = {
      __styles: data.css ?? "",
      receipt: { number: "WH-2026-PREVIEW", issued_at: "12/05/2026 14:30", verification_hash: "abc123…", verify_url: "https://exemplo/recibo/WH-2026-PREVIEW" },
      customer: { name: "João da Silva", email: "joao@exemplo.com", phone: "(11) 99999-0000" },
      order: { total: "R$ 1.250,00", currency: "BRL", paid_at: "12/05/2026 14:25", payment_provider: "mercadopago" },
      items: [
        { description: "Suíte Premium 4 noites", quantity: 1, unit_price: "R$ 1.000,00", total: "R$ 1.000,00" },
        { description: "Transfer aeroporto", quantity: 1, unit_price: "R$ 250,00", total: "R$ 250,00" },
      ],
    };
    return { html: renderTemplate(data.html, sample) };
  }));

/**
 * Re-renderiza um recibo público pelo número, usando o template/CSS atuais
 * (assim, mudanças visuais aparecem em recibos antigos também).
 * Sem auth: recibos têm URL pública com hash não-enumerável.
 */
export const getPublicReceipt = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    number: z.string().min(3).max(64).regex(/^[A-Za-z0-9-]+$/),
    origin: z.string().url(),
  }).parse(d))
  .handler(withErrorLogging("getPublicReceipt", async ({ data }) => {
    const html = await renderReceiptByNumber(data.number, data.origin);
    if (!html) return { found: false as const };
    return { found: true as const, html };
  }));

/**
 * Garante que o recibo do próprio pedido pago do usuário exista, gerando-o
 * sob demanda (idempotente). Retorna o número para abrir /recibo/{number}.
 * Permitido para o dono do pedido OU staff (admin/financeiro).
 */
export const ensureMyReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    orderId: z.string().uuid(),
    origin: z.string().url(),
  }).parse(d))
  .handler(withErrorLogging("ensureMyReceipt", async ({ data, context }) => {
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id,user_id,status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) throw new Error("Pedido não encontrado.");
    if (order.status !== "paid") throw new Error("Recibo disponível apenas para pedidos pagos.");
    if (order.user_id !== context.userId) {
      const { data: roles } = await context.supabase
        .from("user_roles").select("role").eq("user_id", context.userId);
      const allowed = (roles ?? []).some((r: any) =>
        ["super_admin", "admin", "financeiro"].includes(r.role)
      );
      if (!allowed) throw new Error("Sem permissão para acessar este recibo.");
    }
    const r = await generateReceiptForOrder(data.orderId, data.origin);
    return { number: r.number as string };
  }));