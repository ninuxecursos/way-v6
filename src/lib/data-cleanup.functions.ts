/**
 * Server functions for the Admin → Limpeza de dados area.
 *
 * SECURITY:
 * - Only super_admin can call these (defense-in-depth on top of RLS).
 * - Every destructive call requires the admin's CURRENT password
 *   (re-authentication) — even with a valid session token.
 * - Each action is recorded in audit_logs.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withErrorLogging } from "./server-fn-error";
import { AppError } from "./errors";
import type { Database } from "@/integrations/supabase/types";

export const CLEANUP_ENTITIES = [
  "orders",
  "participants",
  "customers",
  "blog_comments",
  "blog_posts",
  "contact_messages",
  "notifications",
  "audit_logs",
  "event_reviews",
  "email_outbox",
  "ai_usage_logs",
  "media_assets",
  "coupons",
  "fiscal_invoices",
  "reservation_groups",
] as const;
export type CleanupEntity = (typeof CLEANUP_ENTITIES)[number];

export const ENTITY_LABELS: Record<CleanupEntity, string> = {
  orders: "Pedidos (e itens, NF-e, redenções de cupom)",
  participants: "Participantes (cadastros do checkout)",
  customers: "Clientes (perfil + papel + conta auth)",
  blog_comments: "Comentários do blog",
  blog_posts: "Posts do blog (com traduções)",
  contact_messages: "Mensagens de contato",
  notifications: "Notificações in-app",
  audit_logs: "Logs de auditoria",
  event_reviews: "Avaliações de eventos",
  email_outbox: "Caixa de saída de e-mails",
  ai_usage_logs: "Logs de uso de IA",
  media_assets: "Mídia (metadados)",
  coupons: "Cupons promocionais",
  fiscal_invoices: "Notas fiscais emitidas",
  reservation_groups: "Grupos Galera",
};

async function assertSuperAdmin(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw error;
  const roles = (data ?? []).map((r: any) => r.role as string);
  if (!roles.includes("super_admin")) {
    throw new AppError("FORBIDDEN", "Apenas super administradores podem executar a limpeza de dados.");
  }
  const { data: u } = await supabase.auth.getUser();
  return u.user?.email ?? "";
}

async function verifyPassword(email: string, password: string) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  const tmp = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { error } = await tmp.auth.signInWithPassword({ email, password });
  if (error) {
    throw new AppError("UNAUTHORIZED", "Senha incorreta. Tente novamente.");
  }
  try { await tmp.auth.signOut(); } catch { /* noop */ }
}

async function audit(supabase: any, actorId: string, actorEmail: string, action: string, entity: string, payload: Record<string, unknown>) {
  try {
    await supabase.from("audit_logs").insert({
      actor_id: actorId,
      actor_email: actorEmail,
      action,
      entity_type: entity,
      metadata: payload as any,
    });
  } catch (e) {
    console.error("[data-cleanup/audit]", e);
  }
}

async function deleteOrders(supabase: any, ids: string[]) {
  if (ids.length === 0) return 0;
  const inv = (await supabase.from("fiscal_invoices").select("id").in("order_id", ids)).data ?? [];
  if (inv.length) {
    await supabase.from("fiscal_invoice_events").delete().in("invoice_id", inv.map((r: any) => r.id));
  }
  await supabase.from("fiscal_invoices").delete().in("order_id", ids);
  await supabase.from("order_items").delete().in("order_id", ids);
  await supabase.from("coupon_redemptions").delete().in("order_id", ids);
  await supabase.from("reservation_group_members").delete().in("order_id", ids);
  const { error, count } = await supabase.from("orders").delete({ count: "exact" }).in("id", ids);
  if (error) throw error;
  return count ?? ids.length;
}

async function deleteBlogPosts(supabase: any, ids: string[]) {
  if (ids.length === 0) return 0;
  const comments = (await supabase.from("blog_comments").select("id").in("post_id", ids)).data ?? [];
  if (comments.length) {
    await supabase.from("blog_comment_reactions").delete().in("comment_id", comments.map((r: any) => r.id));
  }
  await supabase.from("blog_comments").delete().in("post_id", ids);
  await supabase.from("blog_post_translations").delete().in("post_id", ids);
  await supabase.from("blog_post_categories").delete().in("post_id", ids);
  const { error, count } = await supabase.from("blog_posts").delete({ count: "exact" }).in("id", ids);
  if (error) throw error;
  return count ?? ids.length;
}

async function deleteCustomers(supabase: any, ids: string[]) {
  if (ids.length === 0) return 0;
  await supabase.from("notification_preferences").delete().in("user_id", ids);
  await supabase.from("user_roles").delete().in("user_id", ids);
  await supabase.from("customer_notes").delete().in("user_id", ids);
  await supabase.from("customer_segment_members").delete().in("user_id", ids);
  await supabase.from("profiles").delete().in("id", ids);
  let removed = 0;
  for (const uid of ids) {
    try {
      const { error } = await supabase.rpc("admin_delete_auth_user", { _user_id: uid });
      if (!error) removed += 1;
    } catch (e) {
      console.error("[data-cleanup/customers] auth delete failed", uid, e);
    }
  }
  return removed || ids.length;
}

async function deleteGeneric(supabase: any, entity: CleanupEntity, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const { error, count } = await (supabase as any)
    .from(entity)
    .delete({ count: "exact" })
    .in("id", ids);
  if (error) throw error;
  return count ?? ids.length;
}

async function deleteAll(supabase: any, entity: CleanupEntity): Promise<number> {
  if (entity === "orders") {
    const { data } = await supabase.from("orders").select("id");
    return deleteOrders(supabase, (data ?? []).map((r: any) => r.id));
  }
  if (entity === "blog_posts") {
    const { data } = await supabase.from("blog_posts").select("id");
    return deleteBlogPosts(supabase, (data ?? []).map((r: any) => r.id));
  }
  if (entity === "customers") {
    const { data } = await supabase.from("profiles").select("id");
    return deleteCustomers(supabase, (data ?? []).map((r: any) => r.id));
  }
  const { error, count } = await (supabase as any)
    .from(entity)
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (error) throw error;
  return count ?? 0;
}

const listInput = z.object({
  entity: z.enum(CLEANUP_ENTITIES),
  search: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

type EntityCfg = { table: string; label: string; extra?: string; searchCols?: string[] };
const ENTITY_QUERY: Record<CleanupEntity, EntityCfg> = {
  orders:             { table: "orders",             label: "customer_email", extra: "status, total_cents, created_at", searchCols: ["customer_email", "id"] },
  participants:       { table: "participants",       label: "full_name",      extra: "email, created_at", searchCols: ["full_name", "email", "cpf"] },
  customers:          { table: "profiles",           label: "display_name",   extra: "full_name, created_at", searchCols: ["display_name", "full_name"] },
  blog_comments:      { table: "blog_comments",      label: "content",        extra: "status, created_at" },
  blog_posts:         { table: "blog_posts",         label: "slug",           extra: "status, created_at", searchCols: ["slug"] },
  contact_messages:   { table: "contact_messages",   label: "email",          extra: "subject, created_at", searchCols: ["email", "name", "subject"] },
  notifications:      { table: "notifications",      label: "title",          extra: "type, created_at" },
  audit_logs:         { table: "audit_logs",         label: "action",         extra: "entity_type, actor_email, created_at" },
  event_reviews:      { table: "event_reviews",      label: "display_name",   extra: "rating, status, created_at" },
  email_outbox:       { table: "email_outbox",       label: "to_email",       extra: "subject, status, created_at", searchCols: ["to_email", "subject"] },
  ai_usage_logs:      { table: "ai_usage_logs",      label: "capability",     extra: "status, created_at" },
  media_assets:       { table: "media_assets",       label: "filename",       extra: "mime_type, created_at", searchCols: ["filename", "alt_text"] },
  coupons:            { table: "coupons",            label: "code",           extra: "active, created_at", searchCols: ["code"] },
  fiscal_invoices:    { table: "fiscal_invoices",    label: "number",         extra: "status, created_at", searchCols: ["number", "customer_name", "customer_doc"] },
  reservation_groups: { table: "reservation_groups", label: "coupon_code",    extra: "holder_name, status, created_at", searchCols: ["coupon_code", "holder_name"] },
};

export const listCleanupItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof listInput>) => listInput.parse(d))
  .handler(withErrorLogging("data-cleanup.list", async ({ data, context }) => {
    const supabase = context.supabase;
    await assertSuperAdmin(supabase, context.userId);
    const cfg = ENTITY_QUERY[data.entity];
    let q = (supabase as any)
      .from(cfg.table)
      .select(`id, ${cfg.label}${cfg.extra ? ", " + cfg.extra : ""}`)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.search && cfg.searchCols?.length) {
      const filter = cfg.searchCols.map((c) => `${c}.ilike.%${data.search}%`).join(",");
      q = q.or(filter);
    }
    const { data: rows, error } = await q;
    if (error) throw error;
    const { count } = await (supabase as any)
      .from(cfg.table)
      .select("id", { count: "exact", head: true });
    return { rows: (rows ?? []) as Array<Record<string, any>>, total: count ?? 0, labelField: cfg.label };
  }));

const cleanupInput = z.object({
  entity: z.enum(CLEANUP_ENTITIES),
  password: z.string().min(1).max(200),
  mode: z.enum(["individual", "all"]),
  ids: z.array(z.string().uuid()).max(500).optional(),
  confirmText: z.string().optional(),
});

export const runDataCleanup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof cleanupInput>) => cleanupInput.parse(d))
  .handler(withErrorLogging("data-cleanup.run", async ({ data, context }) => {
    const supabase = context.supabase;
    const email = await assertSuperAdmin(supabase, context.userId);
    if (!email) throw new AppError("FORBIDDEN", "Não foi possível identificar o e-mail do admin.");

    await verifyPassword(email, data.password);

    if (data.mode === "all" && data.confirmText !== "EXCLUIR TUDO") {
      throw new AppError("BAD_REQUEST", "Digite EXCLUIR TUDO para confirmar a operação em massa.");
    }
    if (data.mode === "individual" && (!data.ids || data.ids.length === 0)) {
      throw new AppError("BAD_REQUEST", "Selecione ao menos um registro.");
    }

    let removed = 0;
    if (data.mode === "all") {
      removed = await deleteAll(supabase, data.entity);
    } else {
      const ids = data.ids!;
      if (data.entity === "orders") removed = await deleteOrders(supabase, ids);
      else if (data.entity === "blog_posts") removed = await deleteBlogPosts(supabase, ids);
      else if (data.entity === "customers") removed = await deleteCustomers(supabase, ids);
      else removed = await deleteGeneric(supabase, data.entity, ids);
    }

    await audit(supabase, context.userId, email, "data_cleanup", data.entity, {
      mode: data.mode,
      removed,
      ids: data.mode === "individual" ? data.ids : undefined,
    });

    return { ok: true, removed };
  }));
