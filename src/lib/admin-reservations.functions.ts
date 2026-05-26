/**
 * Admin: exclusão (única ou em massa) de reservas (orders).
 * Exige autenticação Supabase + papel admin/super_admin
 * + reconfirmação da senha do admin logado.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withErrorLogging } from "./server-fn-error";
import { AppError } from "./errors";

const Schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  password: z.string().min(1).max(200),
});

export const adminDeleteReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(
    withErrorLogging("admin.deleteReservations", async ({ data, context }) => {
      const { supabase, userId, claims } = context;

      // 1) Papel admin/super_admin
      const { data: isAdmin, error: roleErr } = await supabase.rpc("is_admin", {
        _user_id: userId,
      });
      if (roleErr || !isAdmin) {
        throw new AppError("FORBIDDEN", "Acesso restrito a administradores.");
      }

      // 2) Reconfirma senha do admin com um client efêmero
      const email = (claims as { email?: string })?.email;
      if (!email) {
        throw new AppError("FORBIDDEN", "Sessão sem e-mail; refaça o login.");
      }
      const ephemeral = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { error: authErr } = await ephemeral.auth.signInWithPassword({
        email,
        password: data.password,
      });
      if (authErr) {
        throw new AppError("FORBIDDEN", "Senha incorreta.");
      }

      // 3) Limpa referência sem cascade em webhook_events
      await supabaseAdmin
        .from("webhook_events")
        .update({ related_order_id: null })
        .in("related_order_id", data.ids);

      // 4) Exclui as orders (bypass RLS pois já validamos papel + senha)
      const { error: delErr, count } = await supabaseAdmin
        .from("orders")
        .delete({ count: "exact" })
        .in("id", data.ids);
      if (delErr) {
        throw new AppError("DATABASE", "Falha ao excluir reservas.", { cause: delErr });
      }
      return { deleted: count ?? data.ids.length };
    }),
  );