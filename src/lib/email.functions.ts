import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { withErrorLogging } from "./server-fn-error";
import { assertAdmin, assertStaff } from "./admin-guards";

export const listEmailTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(withErrorLogging("listEmailTemplates", async ({ context }) => {
    // fix(S2): exigir papel staff explicitamente além das RLS.
    await assertStaff(context.supabase);
    const { data, error } = await context.supabase.from("email_templates").select("*").order("slug");
    if (error) throw error;
    return data ?? [];
  }));

export const getEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(withErrorLogging("getEmailTemplate", async ({ data, context }) => {
    await assertStaff(context.supabase);
    const { data: row, error } = await context.supabase.from("email_templates").select("*").eq("id", data.id).maybeSingle();
    if (error) throw error;
    return row;
  }));

export const upsertEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id?: string; slug: string; name: string; description?: string; active?: boolean; translations?: any; variables_doc?: any }) => i)
  .handler(withErrorLogging("upsertEmailTemplate", async ({ data, context }) => {
    const { supabase } = context;
    await assertAdmin(supabase);
    const { data: row, error } = await supabase.from("email_templates").upsert({
      id: data.id, slug: data.slug, name: data.name, description: data.description,
      active: data.active ?? true, translations: data.translations ?? {}, variables_doc: data.variables_doc ?? {},
    }).select().single();
    if (error) throw error;
    return row;
  }));

export const listEmailProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(withErrorLogging("listEmailProviders", async ({ context }) => {
    await assertAdmin(context.supabase);
    const { data, error } = await context.supabase.from("email_providers").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  }));

export const upsertEmailProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id?: string; name: string; provider_type: string; active?: boolean; is_default?: boolean; config?: any; secret_ref?: string }) => i)
  .handler(withErrorLogging("upsertEmailProvider", async ({ data, context }) => {
    const { supabase } = context;
    await assertAdmin(supabase);
    if (data.is_default) {
      await supabase.from("email_providers").update({ is_default: false }).neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
    }
    const { data: row, error } = await supabase.from("email_providers").upsert({
      id: data.id, name: data.name, provider_type: data.provider_type,
      active: data.active ?? false, is_default: data.is_default ?? false,
      config: data.config ?? {}, secret_ref: data.secret_ref,
    }).select().single();
    if (error) throw error;
    return row;
  }));

export const deleteEmailProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(withErrorLogging("deleteEmailProvider", async ({ data, context }) => {
    const { supabase } = context;
    await assertAdmin(supabase);
    const { error } = await supabase.from("email_providers").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  }));

export const listOutbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { status?: string; limit?: number }) => i)
  .handler(withErrorLogging("listOutbox", async ({ data, context }) => {
    // fix(S2): outbox tem PII de clientes — só admin/financeiro.
    await assertAdmin(context.supabase);
    let q = context.supabase.from("email_outbox").select("*").order("created_at", { ascending: false }).limit(data.limit ?? 100);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  }));

export const enqueueTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { to: string; subject: string; html: string; locale?: string }) => z.object({
    to: z.string().email(), subject: z.string().min(1).max(200), html: z.string().min(1), locale: z.string().optional(),
  }).parse(i))
  .handler(withErrorLogging("enqueueTestEmail", async ({ data, context }) => {
    const { supabase } = context;
    await assertAdmin(supabase);
    const { data: row, error } = await supabase.from("email_outbox").insert({
      to_email: data.to, subject: data.subject, html: data.html, locale: data.locale ?? "pt", status: "pending",
    }).select().single();
    if (error) throw error;
    return row;
  }));