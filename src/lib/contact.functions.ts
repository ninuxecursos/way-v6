/**
 * Server functions para o formulário de Contato:
 * - submitContactMessage: público (anon), insere mensagem em contact_messages.
 * - listContactMessages: admin/financeiro, lista mensagens recentes.
 * - updateContactMessage: admin/financeiro, atualiza status/notas.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin-guards";

const SubmitSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(2000),
  locale: z.enum(["pt-BR", "en", "es"]).default("pt-BR"),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data) => SubmitSchema.parse(data))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const client = createClient(url, key, { auth: { persistSession: false } });

    const userAgent = getRequestHeader("user-agent") ?? null;
    const ip =
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      getRequestHeader("cf-connecting-ip") ??
      null;

    const { error } = await client.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject || null,
      message: data.message,
      locale: data.locale,
      user_agent: userAgent,
      ip_address: ip,
    });
    if (error) {
      console.error("[contact] insert failed:", error);
      throw new Error("save_failed");
    }
    return { ok: true };
  });

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  locale: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  read_at: string | null;
  replied_at: string | null;
}

export const listContactMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        status: z.enum(["all", "new", "read", "replied", "archived"]).default("all"),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertStaff(supabase);
    let q = supabase
      .from("contact_messages")
      .select(
        "id, name, email, phone, subject, message, locale, status, admin_notes, created_at, read_at, replied_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) {
      console.error("[contact] list failed:", error);
      throw new Error("list_failed");
    }
    return { messages: (rows ?? []) as ContactMessageRow[] };
  });

const UpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "read", "replied", "archived"]).optional(),
  admin_notes: z.string().max(2000).optional(),
});

export const updateContactMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => UpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertStaff(supabase);
    const patch: {
      status?: string;
      read_at?: string;
      replied_at?: string;
      admin_notes?: string;
    } = {};
    if (data.status) {
      patch.status = data.status;
      if (data.status === "read") patch.read_at = new Date().toISOString();
      if (data.status === "replied") patch.replied_at = new Date().toISOString();
    }
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    const { error } = await supabase.from("contact_messages").update(patch).eq("id", data.id);
    if (error) {
      console.error("[contact] update failed:", error);
      throw new Error("update_failed");
    }
    return { ok: true };
  });

export const deleteContactMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertStaff(supabase);
    const { error } = await supabase.from("contact_messages").delete().eq("id", data.id);
    if (error) {
      console.error("[contact] delete failed:", error);
      throw new Error("delete_failed");
    }
    return { ok: true };
  });