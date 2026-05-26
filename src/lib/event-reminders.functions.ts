/**
 * Server functions para check-in admin de pedidos pagos.
 * O envio de lembretes pré-evento (D-30/D-7/D-1) é feito pelo
 * cron `/api/public/hooks/event-reminders`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withErrorLogging } from "./server-fn-error";
import { assertRoles } from "./admin-guards";
import { AppError } from "./errors";

const ToggleSchema = z.object({
  orderId: z.string().uuid(),
  checkedIn: z.boolean(),
});

export const setOrderCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ToggleSchema.parse(d))
  .handler(
    withErrorLogging("orders.setCheckIn", async ({ data, context }) => {
      const userId = await assertRoles(context.supabase, [
        "super_admin",
        "admin",
        "financeiro",
      ]);
      const { data: order, error: ordErr } = await supabaseAdmin
        .from("orders")
        .select("id, status")
        .eq("id", data.orderId)
        .maybeSingle();
      if (ordErr || !order) throw new AppError("NOT_FOUND", "Pedido não encontrado.");
      if (data.checkedIn && order.status !== "paid") {
        throw new AppError("CONFLICT", "Só é possível dar check-in em pedidos pagos.");
      }
      const { error } = await supabaseAdmin
        .from("orders")
        .update({
          checked_in_at: data.checkedIn ? new Date().toISOString() : null,
          checked_in_by: data.checkedIn ? userId : null,
        })
        .eq("id", data.orderId);
      if (error) throw new AppError("DATABASE", "Erro ao registrar check-in.", { cause: error });
      return { ok: true };
    }),
  );