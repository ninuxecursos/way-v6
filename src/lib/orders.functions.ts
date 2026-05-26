import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withErrorLogging } from "./server-fn-error";
import { AppError } from "./errors";
import { assertRoles } from "./admin-guards";

const ALLOWED_STATUSES = [
  "pending",
  "paid",
  "cancelled",
  "refunded",
  "failed",
  "in_process",
] as const;
type OrderStatus = (typeof ALLOWED_STATUSES)[number];

async function assertOrdersStaff(supabase: any) {
  return assertRoles(supabase, ["super_admin", "admin", "financeiro"]);
}

async function logOrderAudit(
  actorId: string,
  action: string,
  orderId: string,
  before: unknown,
  after: unknown,
) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: actorId,
      action,
      entity_type: "order",
      entity_id: orderId,
      before_data: before as any,
      after_data: after as any,
    });
  } catch (e) {
    console.warn("[orders.audit]", (e as Error)?.message);
  }
}

function patchForStatus(status: OrderStatus): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    status,
    payment_status: status,
  };
  if (status === "paid") patch.paid_at = new Date().toISOString();
  if (status !== "paid") patch.paid_at = null;
  return patch;
}

/**
 * Admin/financeiro: altera o status de um pedido individual.
 */
export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(ALLOWED_STATUSES),
      })
      .parse(d),
  )
  .handler(
    withErrorLogging("orders.adminUpdateStatus", async ({ data, context }) => {
      const actorId = await assertOrdersStaff((context as any).supabase);
      const { data: before, error: selErr } = await supabaseAdmin
        .from("orders")
        .select("id,status,payment_status,paid_at")
        .eq("id", data.orderId)
        .maybeSingle();
      if (selErr || !before) throw new AppError("NOT_FOUND", "Pedido não encontrado.");
      const patch = patchForStatus(data.status);
      const { error } = await supabaseAdmin.from("orders").update(patch as any).eq("id", data.orderId);
      if (error) throw new AppError("DATABASE", "Falha ao atualizar status.", { cause: error });
      await logOrderAudit(actorId, "order.status.update", data.orderId, before, patch);
      return { ok: true };
    }),
  );

/**
 * Admin/financeiro: altera status de múltiplos pedidos.
 */
export const adminBulkUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        orderIds: z.array(z.string().uuid()).min(1).max(500),
        status: z.enum(ALLOWED_STATUSES),
      })
      .parse(d),
  )
  .handler(
    withErrorLogging("orders.adminBulkUpdateStatus", async ({ data, context }) => {
      const actorId = await assertOrdersStaff((context as any).supabase);
      const patch = patchForStatus(data.status);
      const { error } = await supabaseAdmin
        .from("orders")
        .update(patch as any)
        .in("id", data.orderIds);
      if (error) throw new AppError("DATABASE", "Falha ao atualizar pedidos.", { cause: error });
      await logOrderAudit(actorId, "order.status.bulk_update", data.orderIds.join(","), null, {
        ...patch,
        count: data.orderIds.length,
      });
      return { ok: true, count: data.orderIds.length };
    }),
  );

/**
 * Admin: exclui um pedido. Apenas admins (não financeiro) podem excluir.
 */
export const adminDeleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(
    withErrorLogging("orders.adminDelete", async ({ data, context }) => {
      const actorId = await assertRoles((context as any).supabase, ["super_admin", "admin"]);
      const { data: before } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", data.orderId)
        .maybeSingle();
      if (!before) throw new AppError("NOT_FOUND", "Pedido não encontrado.");
      const { error } = await supabaseAdmin.from("orders").delete().eq("id", data.orderId);
      if (error) throw new AppError("DATABASE", "Falha ao excluir pedido.", { cause: error });
      await logOrderAudit(actorId, "order.delete", data.orderId, before, null);
      return { ok: true };
    }),
  );

/**
 * Admin: exclui múltiplos pedidos.
 */
export const adminBulkDeleteOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ orderIds: z.array(z.string().uuid()).min(1).max(500) }).parse(d),
  )
  .handler(
    withErrorLogging("orders.adminBulkDelete", async ({ data, context }) => {
      const actorId = await assertRoles((context as any).supabase, ["super_admin", "admin"]);
      const { error } = await supabaseAdmin
        .from("orders")
        .delete()
        .in("id", data.orderIds);
      if (error) throw new AppError("DATABASE", "Falha ao excluir pedidos.", { cause: error });
      await logOrderAudit(actorId, "order.bulk_delete", data.orderIds.join(","), null, {
        count: data.orderIds.length,
      });
      return { ok: true, count: data.orderIds.length };
    }),
  );

/**
 * Permite ao próprio cliente cancelar um pedido que ainda não foi pago.
 * Protege contra acúmulo de pedidos "pending" abandonados/bugados.
 */
export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ orderId: z.string().uuid() }).parse(d),
  )
  .handler(
    withErrorLogging("orders.cancel", async ({ data, context }) => {
      const userId = (context as { userId: string }).userId;
      if (!userId) throw new AppError("UNAUTHORIZED", "Faça login para cancelar o pedido.");

      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("id, user_id, status, payment_status")
        .eq("id", data.orderId)
        .maybeSingle();
      if (error || !order) throw new AppError("NOT_FOUND", "Pedido não encontrado.");
      if (order.user_id !== userId) {
        throw new AppError("FORBIDDEN", "Você não pode cancelar este pedido.");
      }
      if (order.status === "paid") {
        throw new AppError(
          "BAD_REQUEST",
          "Pedido já pago não pode ser cancelado por aqui. Fale com o suporte.",
        );
      }
      if (["cancelled", "canceled", "refunded"].includes(order.status)) {
        return { ok: true, alreadyCancelled: true };
      }

      const { error: updErr } = await supabaseAdmin
        .from("orders")
        .update({
          status: "cancelled",
          payment_status: "cancelled",
        })
        .eq("id", order.id);
      if (updErr) throw new AppError("DATABASE", "Falha ao cancelar pedido.", { cause: updErr });

      return { ok: true, alreadyCancelled: false };
    }),
  );