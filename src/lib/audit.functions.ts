/**
 * Server function para registrar eventos no audit log (append-only).
 * Use em qualquer mutação sensível: alterações de papel, edição de conteúdo,
 * pagamentos, exclusões, exportações, etc.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withErrorLogging } from "./server-fn-error";

const auditInputSchema = z.object({
  action: z.string().min(1).max(100),
  entityType: z.string().min(1).max(100),
  entityId: z.string().max(255).optional(),
  beforeData: z.unknown().optional(),
  afterData: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const logAuditEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof auditInputSchema>) => auditInputSchema.parse(data))
  .handler(withErrorLogging("audit.log", async ({ data, context }) => {
    const { userId } = context;
    const ip =
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for") ||
      null;
    const userAgent = getRequestHeader("user-agent") || null;

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = userRes.user?.email ?? null;

    const { error } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: userId,
      actor_email: email,
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId ?? null,
      before_data: JSON.parse(JSON.stringify(data.beforeData ?? null)),
      after_data: JSON.parse(JSON.stringify(data.afterData ?? null)),
      metadata: JSON.parse(JSON.stringify(data.metadata ?? null)),
      ip_address: ip,
      user_agent: userAgent,
    });

    if (error) {
      console.error("[audit] failed to log:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }));