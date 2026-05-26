/**
 * Server functions para o sistema de grupos Galera (cupom de vínculo).
 *
 * - validateGroupCoupon: valida cupom no checkout do membro
 * - getMyGroups: lista grupos do usuário logado (titular ou membro)
 * - listGroupsAdmin / getGroupAdmin / closeGroup / reopenGroup / removeGroupMember:
 *   gerenciamento pelo admin/financeiro
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withErrorLogging } from "./server-fn-error";
import { AppError } from "./errors";
import { assertRoles } from "./admin-guards";

const CouponSchema = z.object({
  coupon: z
    .string()
    .trim()
    .min(4, "Cupom muito curto")
    .max(64, "Cupom muito longo")
    .regex(/^[A-Za-z0-9-]+$/, "Cupom inválido"),
});

export type GroupCouponPublic = {
  couponCode: string;
  holderFirstName: string;
  productSlug: string;
  productName: string;
  capacity: number;
  used: number;
  available: number;
  status: "open" | "completed" | "closed_manual" | "cancelled";
  createdAt: string;
};

/**
 * Preview público (sem auth) do cupom — usado pela landing `/grupo/$coupon`.
 * Retorna apenas dados não sensíveis (sem emails/telefones).
 */
export const getGroupCouponPublic = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CouponSchema.parse(d))
  .handler(
    withErrorLogging("groups.publicPreview", async ({ data }) => {
      const { data: rows, error } = await supabaseAdmin.rpc(
        "get_group_coupon_public" as never,
        { _coupon: data.coupon } as never,
      );
      if (error) throw new AppError("DATABASE", "Erro ao carregar grupo.", { cause: error });
      const row = Array.isArray(rows) ? (rows[0] as Record<string, unknown> | undefined) : undefined;
      if (!row) throw new AppError("NOT_FOUND", "Cupom não encontrado.");
      return {
        couponCode: String(row.coupon_code),
        holderFirstName: String(row.holder_first_name ?? ""),
        productSlug: String(row.product_slug ?? ""),
        productName: String(row.product_name ?? ""),
        capacity: Number(row.capacity ?? 0),
        used: Number(row.used ?? 0),
        available: Number(row.available ?? 0),
        status: String(row.status ?? "open") as GroupCouponPublic["status"],
        createdAt: String(row.created_at ?? new Date().toISOString()),
      } satisfies GroupCouponPublic;
    }),
  );

export type GroupCouponPreview = {
  groupId: string;
  couponCode: string;
  holderName: string;
  productSlug: string;
  capacity: number;
  paidCount: number;
  pendingCount: number;
  available: number;
  status: string;
};

/** Valida um cupom em tempo real (checkout do membro). Requer auth. */
export const validateGroupCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CouponSchema.parse(d))
  .handler(
    withErrorLogging("groups.validateCoupon", async ({ data, context }) => {
      const code = data.coupon.toUpperCase();
      const { data: group, error } = await supabaseAdmin
        .from("reservation_groups")
        .select("*")
        .eq("coupon_code", code)
        .maybeSingle();
      if (error) throw new AppError("DATABASE", "Erro ao validar cupom.", { cause: error });
      if (!group) throw new AppError("NOT_FOUND", "Cupom não encontrado.");
      if (group.status !== "open")
        throw new AppError("CONFLICT", "Este grupo já está fechado.");

      const { data: members, error: mErr } = await supabaseAdmin
        .from("reservation_group_members")
        .select("payment_status,user_id")
        .eq("group_id", group.id);
      if (mErr) throw new AppError("DATABASE", "Erro ao validar cupom.", { cause: mErr });

      const paidCount = (members ?? []).filter((m) => m.payment_status === "paid").length;
      const pendingCount = (members ?? []).filter((m) => m.payment_status === "pending").length;
      const used = members?.length ?? 0;
      const available = Math.max(0, group.capacity - used);

      if (available <= 0)
        throw new AppError("CONFLICT", "Este grupo já atingiu a capacidade máxima.");
      if ((members ?? []).some((m) => m.user_id === context.userId))
        throw new AppError("CONFLICT", "Você já está nesse grupo.");

      return {
        groupId: group.id,
        couponCode: group.coupon_code,
        holderName: group.holder_name,
        productSlug: group.product_slug,
        capacity: group.capacity,
        paidCount,
        pendingCount,
        available,
        status: group.status,
      } satisfies GroupCouponPreview;
    }),
  );

export type MyGroupMember = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: "holder" | "member";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  joinedAt: string;
  isMe: boolean;
};

export type MyGroupSummary = {
  id: string;
  couponCode: string;
  holderName: string;
  holderUserId: string;
  productSlug: string;
  capacity: number;
  status: "open" | "completed" | "closed_manual" | "cancelled";
  createdAt: string;
  isHolder: boolean;
  paidCount: number;
  pendingCount: number;
  members: MyGroupMember[];
};

/** Grupos do usuário autenticado (titular ou membro). */
export const getMyGroups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    withErrorLogging("groups.getMine", async ({ context }) => {
      // 1) Encontra grupos onde sou titular OU sou membro
      const [holderRes, memberRes] = await Promise.all([
        supabaseAdmin
          .from("reservation_groups")
          .select("id")
          .eq("holder_user_id", context.userId),
        supabaseAdmin
          .from("reservation_group_members")
          .select("group_id")
          .eq("user_id", context.userId),
      ]);
      const ids = new Set<string>();
      (holderRes.data ?? []).forEach((g) => ids.add(g.id));
      (memberRes.data ?? []).forEach((m) => ids.add(m.group_id));
      if (ids.size === 0) return { groups: [] as MyGroupSummary[] };

      const idList = Array.from(ids);
      const [groupsRes, membersRes] = await Promise.all([
        supabaseAdmin
          .from("reservation_groups")
          .select("*")
          .in("id", idList)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("reservation_group_members")
          .select("*")
          .in("group_id", idList)
          .order("joined_at", { ascending: true }),
      ]);

      const byGroup = new Map<string, typeof membersRes.data>();
      for (const m of membersRes.data ?? []) {
        const arr = byGroup.get(m.group_id) ?? [];
        arr.push(m);
        byGroup.set(m.group_id, arr);
      }

      const groups: MyGroupSummary[] = (groupsRes.data ?? []).map((g) => {
        const ms = byGroup.get(g.id) ?? [];
        return {
          id: g.id,
          couponCode: g.coupon_code,
          holderName: g.holder_name,
          holderUserId: g.holder_user_id,
          productSlug: g.product_slug,
          capacity: g.capacity,
          status: g.status as MyGroupSummary["status"],
          createdAt: g.created_at,
          isHolder: g.holder_user_id === context.userId,
          paidCount: ms.filter((m) => m.payment_status === "paid").length,
          pendingCount: ms.filter((m) => m.payment_status === "pending").length,
          members: ms.map((m) => ({
            id: m.id,
            fullName: m.full_name,
            email: m.email,
            phone: m.phone,
            role: m.role as "holder" | "member",
            paymentStatus: m.payment_status as MyGroupMember["paymentStatus"],
            joinedAt: m.joined_at,
            isMe: m.user_id === context.userId,
          })),
        };
      });

      return { groups };
    }),
  );

// ─────────────── ADMIN ───────────────

const AdminListSchema = z.object({
  status: z.enum(["all", "open", "completed", "closed_manual", "cancelled"]).default("all"),
  search: z.string().trim().max(120).default(""),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(5).max(100).default(20),
});

export const listGroupsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AdminListSchema.parse(d ?? {}))
  .handler(
    withErrorLogging("groups.adminList", async ({ data, context }) => {
      await assertRoles(context.supabase, ["super_admin", "admin", "financeiro"]);
      const from = data.page * data.pageSize;
      const to = from + data.pageSize - 1;
      let q = supabaseAdmin
        .from("reservation_groups")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (data.status !== "all") q = q.eq("status", data.status);
      if (data.search) {
        const term = data.search.replace(/%/g, "");
        q = q.or(
          `coupon_code.ilike.%${term}%,holder_name.ilike.%${term}%,product_slug.ilike.%${term}%`,
        );
      }
      const { data: rows, count, error } = await q;
      if (error) throw new AppError("DATABASE", "Erro ao carregar grupos.", { cause: error });

      // counts por grupo
      const ids = (rows ?? []).map((r) => r.id);
      const counts = new Map<string, { paid: number; pending: number; total: number }>();
      if (ids.length > 0) {
        const { data: ms } = await supabaseAdmin
          .from("reservation_group_members")
          .select("group_id,payment_status")
          .in("group_id", ids);
        for (const m of ms ?? []) {
          const c = counts.get(m.group_id) ?? { paid: 0, pending: 0, total: 0 };
          c.total += 1;
          if (m.payment_status === "paid") c.paid += 1;
          else if (m.payment_status === "pending") c.pending += 1;
          counts.set(m.group_id, c);
        }
      }

      return {
        rows: (rows ?? []).map((g) => ({
          id: g.id,
          couponCode: g.coupon_code,
          holderName: g.holder_name,
          productSlug: g.product_slug,
          capacity: g.capacity,
          status: g.status,
          createdAt: g.created_at,
          counts: counts.get(g.id) ?? { paid: 0, pending: 0, total: 0 },
        })),
        count: count ?? 0,
      };
    }),
  );

const GroupIdSchema = z.object({ groupId: z.string().uuid() });

export const getGroupAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GroupIdSchema.parse(d))
  .handler(
    withErrorLogging("groups.adminGet", async ({ data, context }) => {
      await assertRoles(context.supabase, ["super_admin", "admin", "financeiro"]);
      const { data: group, error } = await supabaseAdmin
        .from("reservation_groups")
        .select("*")
        .eq("id", data.groupId)
        .maybeSingle();
      if (error || !group) throw new AppError("NOT_FOUND", "Grupo não encontrado.");
      const { data: members } = await supabaseAdmin
        .from("reservation_group_members")
        .select("*")
        .eq("group_id", data.groupId)
        .order("joined_at", { ascending: true });
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("id,total_cents,status,payment_method,created_at,customer_email")
        .eq("group_id", data.groupId);
      const { data: rooms } = await supabaseAdmin
        .from("reservation_group_rooms")
        .select("*")
        .eq("group_id", data.groupId)
        .order("room_number", { ascending: true });
      return { group, members: members ?? [], orders: orders ?? [], rooms: rooms ?? [] };
    }),
  );

export const closeGroupManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GroupIdSchema.parse(d))
  .handler(
    withErrorLogging("groups.close", async ({ data, context }) => {
      await assertRoles(context.supabase, ["super_admin", "admin"]);
      const { error } = await supabaseAdmin
        .from("reservation_groups")
        .update({
          status: "closed_manual",
          closed_at: new Date().toISOString(),
          closed_by: context.userId,
        })
        .eq("id", data.groupId);
      if (error) throw new AppError("DATABASE", "Erro ao fechar grupo.", { cause: error });
      return { ok: true };
    }),
  );

export const reopenGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GroupIdSchema.parse(d))
  .handler(
    withErrorLogging("groups.reopen", async ({ data, context }) => {
      await assertRoles(context.supabase, ["super_admin", "admin"]);
      const { error } = await supabaseAdmin
        .from("reservation_groups")
        .update({ status: "open", closed_at: null, closed_by: null })
        .eq("id", data.groupId);
      if (error) throw new AppError("DATABASE", "Erro ao reabrir grupo.", { cause: error });
      return { ok: true };
    }),
  );

const RemoveSchema = z.object({ memberId: z.string().uuid() });
export const removeGroupMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RemoveSchema.parse(d))
  .handler(
    withErrorLogging("groups.removeMember", async ({ data, context }) => {
      await assertRoles(context.supabase, ["super_admin", "admin"]);
      const { error } = await supabaseAdmin
        .from("reservation_group_members")
        .delete()
        .eq("id", data.memberId);
      if (error) throw new AppError("DATABASE", "Erro ao remover membro.", { cause: error });
      return { ok: true };
    }),
  );

/**
 * Admin: exclui o grupo inteiro (membros e quartos vão via CASCADE; pedidos
 * vinculados ficam órfãos com group_id=NULL pela FK ON DELETE SET NULL).
 */
export const deleteGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GroupIdSchema.parse(d))
  .handler(
    withErrorLogging("groups.delete", async ({ data, context }) => {
      const actorId = await assertRoles(context.supabase, ["super_admin", "admin"]);
      const { data: before } = await supabaseAdmin
        .from("reservation_groups")
        .select("id, coupon_code, status, capacity")
        .eq("id", data.groupId)
        .maybeSingle();
      if (!before) throw new AppError("NOT_FOUND", "Grupo não encontrado.");
      const { error } = await supabaseAdmin
        .from("reservation_groups")
        .delete()
        .eq("id", data.groupId);
      if (error) throw new AppError("DATABASE", "Erro ao excluir grupo.", { cause: error });
      try {
        await supabaseAdmin.from("audit_logs").insert({
          actor_id: actorId,
          action: "group.delete",
          entity_type: "reservation_group",
          entity_id: data.groupId,
          before_data: before as any,
        });
      } catch (e) { console.warn("[groups.delete.audit]", (e as Error)?.message); }
      return { ok: true };
    }),
  );

// ─────────────── ROOMS ───────────────

export const addGroupRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GroupIdSchema.parse(d))
  .handler(
    withErrorLogging("groups.addRoom", async ({ data, context }) => {
      await assertRoles(context.supabase, ["super_admin", "admin", "financeiro"]);
      const { data: row, error } = await supabaseAdmin
        .rpc("reservation_group_room_add", { _group_id: data.groupId });
      if (error) throw new AppError("DATABASE", "Erro ao criar quarto.", { cause: error });
      return { room: row };
    }),
  );

const SetRoomSchema = z.object({
  memberId: z.string().uuid(),
  roomId: z.string().uuid().nullable(),
});
export const setMemberRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SetRoomSchema.parse(d))
  .handler(
    withErrorLogging("groups.setMemberRoom", async ({ data, context }) => {
      await assertRoles(context.supabase, ["super_admin", "admin", "financeiro"]);
      const { error } = await supabaseAdmin.rpc("reservation_group_member_set_room", {
        _member_id: data.memberId,
        _room_id: data.roomId as string,
      });
      if (error) {
        const msg = String(error.message || "");
        if (msg.includes("room_full")) throw new AppError("CONFLICT", "Quarto cheio.");
        if (msg.includes("room_not_in_group")) throw new AppError("VALIDATION", "Quarto pertence a outro grupo.");
        throw new AppError("DATABASE", "Erro ao mover hóspede.", { cause: error });
      }
      return { ok: true };
    }),
  );