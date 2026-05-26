import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { withErrorLogging } from "./server-fn-error";

async function assertStaff(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (data ?? []).map((r: any) => r.role);
  if (!roles.some((r: string) => ["super_admin", "admin", "financeiro"].includes(r))) {
    throw new Error("Forbidden");
  }
  return user.id;
}

export const listCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { search?: string; segment?: string; limit?: number; offset?: number; dateFrom?: string; dateTo?: string }) => i)
  .handler(withErrorLogging("listCustomers", async ({ data, context }) => {
    const { supabase } = context;
    await assertStaff(supabase);
    // Usa supabaseAdmin para a listagem (já validamos staff acima) — evita
    // colapso silencioso para 0 se RLS/token tiver qualquer problema.
    // Fallback para supabase autenticado caso o admin client não esteja
    // disponível no runtime do Worker.
    let baseClient: any = supabase;
    try {
      // Acessar `.from` no Proxy lança SÍNCRONO se SERVICE_ROLE_KEY faltar.
      const probe = supabaseAdmin.from("profiles");
      if (probe) baseClient = supabaseAdmin;
    } catch (e) {
      console.warn("[listCustomers] supabaseAdmin indisponível, usando cliente autenticado:", (e as Error)?.message);
    }
    let q = baseClient
      .from("profiles")
      .select("id, display_name, full_name, phone, locale, marketing_opt_in, tags, last_seen_at, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset ?? 0, (data.offset ?? 0) + (data.limit ?? 50) - 1);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`display_name.ilike.${s},full_name.ilike.${s},phone.ilike.${s}`);
    }
    if (data.dateFrom) q = q.gte("created_at", data.dateFrom);
    if (data.dateTo) q = q.lte("created_at", data.dateTo);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    console.log("[listCustomers] count=", count, "rows=", (rows ?? []).length);
    const ids = (rows ?? []).map((r: any) => r.id);
    // Enriquece com e-mail (auth.users via admin) e papéis (user_roles).
    let emails: Record<string, string> = {};
    let rolesMap: Record<string, string[]> = {};
    if (ids.length > 0) {
      try {
        const { data: roleRows } = await supabaseAdmin
          .from("user_roles").select("user_id, role").in("user_id", ids);
        for (const r of roleRows ?? []) {
          (rolesMap[r.user_id] ||= []).push(r.role);
        }
      } catch (e) { console.warn("[listCustomers] roles fetch falhou", e); }
      try {
        // admin.listUsers não aceita filtro por id — paginamos até cobrir os ids necessários.
        const wanted = new Set(ids);
        let page = 1;
        while (wanted.size > 0 && page <= 20) {
          const { data: pageData, error: lErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
          if (lErr) break;
          const users = pageData?.users ?? [];
          for (const u of users) {
            if (wanted.has(u.id)) {
              emails[u.id] = u.email ?? "";
              wanted.delete(u.id);
            }
          }
          if (users.length < 200) break;
          page++;
        }
      } catch (e) { console.warn("[listCustomers] listUsers falhou", e); }
    }
    const enriched = (rows ?? []).map((r: any) => ({
      ...r,
      email: emails[r.id] ?? null,
      roles: rolesMap[r.id] ?? [],
    }));
    return { rows: enriched, total: count ?? 0 };
  }));

export const getCustomerDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(withErrorLogging("getCustomerDetail", async ({ data, context }) => {
    const { supabase } = context;
    await assertStaff(supabase);
    const [profileRes, ordersRes, notesRes, statsRes, segmentsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      supabase.from("orders").select("id, status, total_cents, currency, created_at, paid_at, customer_email").eq("user_id", data.userId).order("created_at", { ascending: false }),
      supabase.from("customer_notes").select("*").eq("user_id", data.userId).order("pinned", { ascending: false }).order("created_at", { ascending: false }),
      supabase.rpc("get_customer_stats", { _user_id: data.userId }),
      supabase.from("customer_segment_members").select("segment_id, customer_segments(id, name, slug, color)").eq("user_id", data.userId),
    ]);
    if (profileRes.error) throw profileRes.error;
    let userRoles: string[] = [];
    try {
      const { data: rr } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
      userRoles = (rr ?? []).map((r: any) => r.role);
    } catch (e) { console.warn("[getCustomerDetail] roles fetch falhou", e); }

    // Email vem do auth.users (não do profiles); IP/UA mais recentes do audit_logs.
    // IMPORTANTE: o Proxy supabaseAdmin faz throw SÍNCRONO ao acessar `.auth`/`.from`
    // se as env vars não estiverem disponíveis no Worker. Por isso envolvemos em
    // try/catch síncrono — `.catch()` na Promise não pega throw de proxy.
    let authUser: any = null;
    let lastAudit: any = null;
    try {
      // Usa RPC com security definer (não depende de SUPABASE_SERVICE_ROLE_KEY no runtime)
      const { data: rows, error: rpcErr } = await supabase.rpc("get_auth_user_basic", { _user_id: data.userId });
      if (rpcErr) throw rpcErr;
      authUser = Array.isArray(rows) ? rows[0] ?? null : rows ?? null;
    } catch (e) {
      console.warn("[getCustomerDetail] get_auth_user_basic indisponível:", (e as Error)?.message);
    }
    try {
      const auditRes: any = await supabase
        .from("audit_logs")
        .select("ip_address, user_agent, created_at")
        .eq("actor_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastAudit = auditRes?.data ?? null;
    } catch (e) {
      console.warn("[getCustomerDetail] audit_logs indisponível:", (e as Error)?.message);
    }
    return {
      profile: profileRes.data,
      orders: ordersRes.data ?? [],
      notes: notesRes.data ?? [],
      stats: (statsRes.data ?? [])[0] ?? null,
      segments: segmentsRes.data ?? [],
      roles: userRoles,
      auth: authUser ? {
        email: authUser.email ?? null,
        email_confirmed_at: authUser.email_confirmed_at ?? null,
        last_sign_in_at: authUser.last_sign_in_at ?? null,
        created_at: authUser.created_at ?? null,
        phone: authUser.phone ?? null,
        provider: authUser.provider ?? null,
      } : null,
      lastIp: lastAudit?.ip_address ?? null,
      lastUserAgent: lastAudit?.user_agent ?? null,
      lastSeenAt: lastAudit?.created_at ?? null,
    };
  }));

export const upsertCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id?: string; userId: string; body: string; pinned?: boolean }) => i)
  .handler(withErrorLogging("upsertCustomerNote", async ({ data, context }) => {
    const { supabase } = context;
    const authorId = await assertStaff(supabase);
    const payload = { id: data.id, user_id: data.userId, body: data.body, pinned: !!data.pinned, author_id: authorId };
    const { data: row, error } = await supabase.from("customer_notes").upsert(payload).select().single();
    if (error) throw error;
    return row;
  }));

export const deleteCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(withErrorLogging("deleteCustomerNote", async ({ data, context }) => {
    const { supabase } = context;
    await assertStaff(supabase);
    const { error } = await supabase.from("customer_notes").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  }));

export const listSegments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(withErrorLogging("listSegments", async ({ context }) => {
    const { supabase } = context;
    await assertStaff(supabase);
    const { data, error } = await supabase.from("customer_segments").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  }));

export const upsertSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id?: string; slug: string; name: string; description?: string; color?: string; rules?: any }) => i)
  .handler(withErrorLogging("upsertSegment", async ({ data, context }) => {
    const { supabase } = context;
    await assertStaff(supabase);
    const { data: row, error } = await supabase.from("customer_segments").upsert({
      id: data.id, slug: data.slug, name: data.name, description: data.description, color: data.color, rules: data.rules ?? {},
    }).select().single();
    if (error) throw error;
    return row;
  }));

export const toggleSegmentMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { segmentId: string; userId: string; add: boolean }) => i)
  .handler(withErrorLogging("toggleSegmentMember", async ({ data, context }) => {
    const { supabase } = context;
    const adminId = await assertStaff(supabase);
    if (data.add) {
      await supabase.from("customer_segment_members").upsert({ segment_id: data.segmentId, user_id: data.userId, added_by: adminId });
    } else {
      await supabase.from("customer_segment_members").delete().match({ segment_id: data.segmentId, user_id: data.userId });
    }
    return { ok: true };
  }));

export const updateCustomerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; tags?: string[]; locale?: string; marketing_opt_in?: boolean; display_name?: string; full_name?: string; phone?: string; phone_secondary?: string; cpf?: string }) => i)
  .handler(withErrorLogging("updateCustomerProfile", async ({ data, context }) => {
    const { supabase } = context;
    await assertStaff(supabase);
    const { userId, ...patch } = data;
    const { data: row, error } = await supabase.from("profiles").update(patch).eq("id", userId).select().single();
    if (error) throw error;
    return row;
  }));

export const resetCustomerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; newPassword?: string }) => z.object({
    userId: z.string().uuid(),
    newPassword: z.string().min(8).max(72).optional(),
  }).parse(i))
  .handler(withErrorLogging("resetCustomerPassword", async ({ data, context }) => {
    const { supabase } = context;
    await assertStaff(supabase);
    // Busca email do usuário para retornar/usar.
    const { data: rows } = await supabase.rpc("get_auth_user_basic", { _user_id: data.userId });
    const target = Array.isArray(rows) ? rows[0] : rows;
    const email = target?.email as string | undefined;
    if (!email) throw new Error("E-mail do cliente não encontrado.");

    // Se senha enviada, define direto via admin; caso contrário envia link de recovery.
    if (data.newPassword) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.newPassword });
      if (error) throw error;
      return { ok: true, mode: "set" as const, email };
    }
    const origin = process.env.SITE_URL || process.env.VITE_SITE_URL || "";
    // Usa generateLink (admin) em vez de resetPasswordForEmail para não bater
    // no rate-limit por e-mail do endpoint público de recuperação. O e-mail
    // continua sendo enviado pelo SMTP/hook configurado do Supabase, e o
    // action_link é devolvido para o admin poder copiar/encaminhar caso
    // necessário.
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: origin ? `${origin}/reset-password` : undefined },
    });
    if (error) {
      const msg = String((error as any)?.message || "").toLowerCase();
      if (msg.includes("rate limit")) {
        throw new Error("Limite de envios de e-mail atingido. Aguarde alguns minutos e tente novamente, ou defina uma nova senha manualmente.");
      }
      throw error;
    }
    return {
      ok: true,
      mode: "email" as const,
      email,
      action_link: (link as any)?.properties?.action_link ?? null,
    };
  }));

export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(withErrorLogging("deleteCustomer", async ({ data, context }) => {
    const { supabase } = context;
    const actorId = await assertStaff(supabase);
    if (actorId === data.userId) throw new Error("Você não pode excluir a si mesmo.");
    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", data.userId);
    if ((targetRoles ?? []).some((r: any) => r.role === "super_admin")) {
      throw new Error("Super administradores não podem ser excluídos.");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;
    return { ok: true };
  }));

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; role: "admin" | "editor" | "financeiro" | "customer"; add: boolean }) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "editor", "financeiro", "customer"]),
      add: z.boolean(),
    }).parse(i),
  )
  .handler(withErrorLogging("setUserRole", async ({ data, context }) => {
    const { supabase } = context;
    // RLS no RPC garante que apenas super_admin executa; mantemos check local também.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { error } = await supabase.rpc("admin_set_user_role", {
      _target: data.userId,
      _role: data.role,
      _add: data.add,
    });
    if (error) throw error;
    return { ok: true };
  }));