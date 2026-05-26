import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withErrorLogging } from "./server-fn-error";

/**
 * Export all data linked to the current user — LGPD right to portability.
 */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(withErrorLogging("exportMyData", async ({ context }) => {
    const { supabase, userId } = context;

    const [profile, roles, orders, items, receipts, invoices, comments, reactions] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role,created_at").eq("user_id", userId),
      supabase.from("orders").select("*").eq("user_id", userId),
      supabase.from("order_items").select("*").in("order_id",
        (await supabase.from("orders").select("id").eq("user_id", userId)).data?.map((o) => o.id) ?? ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("receipts").select("*").in("order_id",
        (await supabase.from("orders").select("id").eq("user_id", userId)).data?.map((o) => o.id) ?? ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("fiscal_invoices").select("*").in("order_id",
        (await supabase.from("orders").select("id").eq("user_id", userId)).data?.map((o) => o.id) ?? ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("blog_comments").select("*").eq("user_id", userId),
      supabase.from("blog_comment_reactions").select("*").eq("user_id", userId),
    ]);

    return {
      generated_at: new Date().toISOString(),
      user: { id: userId, email: context.claims?.email ?? null },
      profile: profile.data ?? null,
      roles: roles.data ?? [],
      orders: orders.data ?? [],
      order_items: items.data ?? [],
      receipts: receipts.data ?? [],
      fiscal_invoices: invoices.data ?? [],
      blog_comments: comments.data ?? [],
      blog_comment_reactions: reactions.data ?? [],
    };
  }));

/**
 * Mark the account for deletion: anonymize profile, mark deletion request.
 * Hard delete is performed manually after legal retention period.
 */
export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(withErrorLogging("requestAccountDeletion", async ({ context }) => {
    const { userId } = context;
    const tag = `delete_requested:${new Date().toISOString().slice(0, 10)}`;

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("tags")
      .eq("id", userId)
      .maybeSingle();
    const tags = Array.from(new Set([...(existing?.tags ?? []), tag, "delete_requested"]));

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ tags, marketing_opt_in: false })
      .eq("id", userId);
    if (error) throw error;

    return { ok: true, requested_at: new Date().toISOString() };
  }));