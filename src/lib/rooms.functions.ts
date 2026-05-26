/**
 * Server functions para o inventário físico de quartos (accommodation_rooms).
 * Admin/financeiro gerenciam quartos, ocupação e movimentação de hóspedes.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withErrorLogging } from "./server-fn-error";
import { AppError } from "./errors";
import { assertFinance } from "./admin-guards";

export type RoomKind = "individual" | "galera";
export type RoomStatus = "available" | "partial" | "full" | "blocked" | "maintenance";
export type GenderPolicy = "mixed" | "male" | "female";

export type RoomRow = {
  id: string;
  room_number: number;
  capacity: number;
  kind: RoomKind | null;
  status: RoomStatus;
  active: boolean;
  group_id: string | null;
  gender_policy: GenderPolicy;
  notes: string | null;
  occupied: number;
  male: number;
  female: number;
  other: number;
};

export type RoomOccupant = {
  order_id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  gender: string | null;
  group_id: string | null;
  group_coupon: string | null;
  paid_at: string | null;
};

/** Lista quartos com contadores de ocupação. */
export const listRooms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        search: z.string().trim().max(120).optional().default(""),
        kind: z.enum(["all", "individual", "galera", "neutral"]).optional().default("all"),
        status: z.enum(["all", "available", "partial", "full", "blocked", "maintenance"]).optional().default("all"),
      })
      .parse(d ?? {}),
  )
  .handler(
    withErrorLogging("rooms.list", async ({ data, context }) => {
      await assertFinance(context.supabase);

      let q = context.supabase
        .from("accommodation_rooms")
        .select("*")
        .order("room_number");
      if (data.kind === "neutral") q = q.is("kind", null);
      else if (data.kind !== "all") q = q.eq("kind", data.kind);
      if (data.status !== "all") q = q.eq("status", data.status);

      const { data: rooms, error } = await q;
      if (error) throw new AppError("DATABASE", "Erro ao listar quartos.", { cause: error });

      // Carrega ocupantes para contadores
      const ids = (rooms ?? []).map((r) => r.id);
      let occByRoom = new Map<string, RoomOccupant[]>();
      if (ids.length > 0) {
        const { data: orders } = await context.supabase
          .from("orders")
          .select("id, room_id, customer_email, participant_id, paid_at, group_id")
          .in("room_id", ids)
          .eq("status", "paid");

        const partIds = (orders ?? []).map((o) => o.participant_id).filter((x): x is string => Boolean(x));
        const { data: parts } = partIds.length
          ? await context.supabase.from("participants").select("id, full_name, gender, email").in("id", partIds)
          : { data: [] as any[] };
        const partMap = new Map((parts ?? []).map((p: any) => [p.id, p]));

        for (const o of orders ?? []) {
          const p = o.participant_id ? partMap.get(o.participant_id) : null;
          const arr = occByRoom.get(o.room_id!) ?? [];
          arr.push({
            order_id: o.id,
            user_id: null,
            full_name: p?.full_name ?? null,
            email: p?.email ?? o.customer_email,
            gender: p?.gender ?? null,
            group_id: o.group_id,
            group_coupon: null,
            paid_at: o.paid_at,
          });
          occByRoom.set(o.room_id!, arr);
        }
      }

      const rows: RoomRow[] = (rooms ?? []).map((r: any) => {
        const occ = occByRoom.get(r.id) ?? [];
        const male = occ.filter((o) => o.gender === "m").length;
        const female = occ.filter((o) => o.gender === "f").length;
        const other = occ.length - male - female;
        return {
          id: r.id,
          room_number: r.room_number,
          capacity: r.capacity,
          kind: r.kind,
          status: r.status,
          active: r.active,
          group_id: r.group_id,
          gender_policy: r.gender_policy,
          notes: r.notes,
          occupied: occ.length,
          male,
          female,
          other,
        };
      });

      // Filtro client-side por busca de hóspede/nº
      const search = data.search.trim().toLowerCase();
      const filtered = search
        ? rows.filter((r) => {
            if (String(r.room_number).includes(search)) return true;
            const occ = occByRoom.get(r.id) ?? [];
            return occ.some(
              (o) =>
                (o.full_name?.toLowerCase().includes(search) ?? false) ||
                (o.email?.toLowerCase().includes(search) ?? false),
            );
          })
        : rows;

      return { rows: filtered };
    }),
  );

/** Estatísticas para o header. */
export const getOccupancyStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    withErrorLogging("rooms.stats", async ({ context }) => {
      await assertFinance(context.supabase);
      const { data: rooms } = await context.supabase
        .from("accommodation_rooms")
        .select("id, capacity, kind, status, active");
      const { count: paidCount } = await context.supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid")
        .not("room_id", "is", null);
      const { count: pendingManual } = await context.supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid")
        .is("room_id", null)
        .eq("allocation_status", "pending_manual");

      const rs = rooms ?? [];
      const total = rs.length;
      const individuals = rs.filter((r) => r.kind === "individual").length;
      const galera = rs.filter((r) => r.kind === "galera").length;
      const blocked = rs.filter((r) => r.status === "blocked" || r.status === "maintenance" || !r.active).length;
      const totalCapacity = rs.filter((r) => r.active).reduce((s, r) => s + r.capacity, 0);

      return {
        total,
        individuals,
        galera,
        blocked,
        totalCapacity,
        occupied: paidCount ?? 0,
        pendingManual: pendingManual ?? 0,
      };
    }),
  );

/** Detalhe + ocupantes de um quarto. */
export const getRoomDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ roomId: z.string().uuid() }).parse(d))
  .handler(
    withErrorLogging("rooms.detail", async ({ data, context }) => {
      await assertFinance(context.supabase);
      const { data: room, error } = await context.supabase
        .from("accommodation_rooms")
        .select("*")
        .eq("id", data.roomId)
        .maybeSingle();
      if (error) throw new AppError("DATABASE", "Erro ao buscar quarto.", { cause: error });
      if (!room) throw new AppError("NOT_FOUND", "Quarto não encontrado.");

      const { data: orders } = await context.supabase
        .from("orders")
        .select("id, user_id, customer_email, participant_id, paid_at, group_id")
        .eq("room_id", data.roomId)
        .eq("status", "paid");

      const partIds = (orders ?? []).map((o) => o.participant_id).filter((x): x is string => Boolean(x));
      const { data: parts } = partIds.length
        ? await context.supabase.from("participants").select("id, full_name, gender, email").in("id", partIds)
        : { data: [] as any[] };
      const partMap = new Map((parts ?? []).map((p: any) => [p.id, p]));

      const occupants: RoomOccupant[] = (orders ?? []).map((o: any) => {
        const p = o.participant_id ? partMap.get(o.participant_id) : null;
        return {
          order_id: o.id,
          user_id: o.user_id,
          full_name: p?.full_name ?? null,
          email: p?.email ?? o.customer_email,
          gender: p?.gender ?? null,
          group_id: o.group_id,
          group_coupon: null,
          paid_at: o.paid_at,
        };
      });

      return { room, occupants };
    }),
  );

/** Cria um quarto. Tipo (individual/galera) é definido na 1ª venda paga. */
export const createRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        room_number: z.number().int().min(1).max(9999),
        capacity: z.number().int().min(1).max(50).default(8),
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(
    withErrorLogging("rooms.create", async ({ data, context }) => {
      await assertFinance(context.supabase);
      const { data: row, error } = await context.supabase
        .from("accommodation_rooms")
        .insert({
          room_number: data.room_number,
          capacity: data.capacity,
          kind: null,
          gender_policy: "mixed",
          notes: data.notes ?? null,
        })
        .select()
        .single();
      if (error) throw new AppError("DATABASE", error.message, { cause: error });
      return { room: row };
    }),
  );

/** Cria quartos em lote (continua sequência). Todos nascem neutros. */
export const createRoomsBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        count: z.number().int().min(1).max(200),
        capacity: z.number().int().min(1).max(50).default(8),
      })
      .parse(d),
  )
  .handler(
    withErrorLogging("rooms.createBulk", async ({ data, context }) => {
      await assertFinance(context.supabase);
      const { data: maxRow } = await context.supabase
        .from("accommodation_rooms")
        .select("room_number")
        .order("room_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const start = (maxRow?.room_number ?? 0) + 1;
      const rows = Array.from({ length: data.count }, (_, i) => ({
        room_number: start + i,
        capacity: data.capacity,
        kind: null,
        gender_policy: "mixed",
      }));
      const { error } = await context.supabase.from("accommodation_rooms").insert(rows);
      if (error) throw new AppError("DATABASE", error.message, { cause: error });
      return { created: data.count, startAt: start };
    }),
  );

/** Atualiza quarto. */
export const updateRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        roomId: z.string().uuid(),
        patch: z
          .object({
            capacity: z.number().int().min(1).max(50).optional(),
            kind: z.enum(["individual", "galera"]).nullable().optional(),
            gender_policy: z.enum(["mixed", "male", "female"]).optional(),
            active: z.boolean().optional(),
            notes: z.string().max(500).nullable().optional(),
            status: z.enum(["available", "partial", "full", "blocked", "maintenance"]).optional(),
          })
          .refine((v) => Object.keys(v).length > 0, "patch vazio"),
      })
      .parse(d),
  )
  .handler(
    withErrorLogging("rooms.update", async ({ data, context }) => {
      await assertFinance(context.supabase);
      const { data: row, error } = await context.supabase
        .from("accommodation_rooms")
        .update(data.patch)
        .eq("id", data.roomId)
        .select()
        .single();
      if (error) {
        if (error.message.includes("cannot_change_kind_of_occupied_room")) {
          throw new AppError("VALIDATION", "Não é possível alterar o tipo de um quarto com hóspedes.", { cause: error });
        }
        throw new AppError("DATABASE", error.message, { cause: error });
      }
      return { room: row };
    }),
  );

/** Exclui quarto (apenas vazio). */
export const deleteRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ roomId: z.string().uuid() }).parse(d))
  .handler(
    withErrorLogging("rooms.delete", async ({ data, context }) => {
      await assertFinance(context.supabase);
      const { count } = await context.supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("room_id", data.roomId)
        .eq("status", "paid");
      if ((count ?? 0) > 0) throw new AppError("VALIDATION", "Quarto possui hóspedes. Esvazie antes de excluir.");
      const { error } = await context.supabase.from("accommodation_rooms").delete().eq("id", data.roomId);
      if (error) throw new AppError("DATABASE", error.message, { cause: error });
      return { ok: true };
    }),
  );

/** Exclui múltiplos quartos (somente os vazios). Retorna quantos foram excluídos e quais foram bloqueados. */
export const deleteRoomsBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ roomIds: z.array(z.string().uuid()).min(1).max(500) }).parse(d),
  )
  .handler(
    withErrorLogging("rooms.deleteBulk", async ({ data, context }) => {
      await assertFinance(context.supabase);
      // Identifica quartos que ainda possuem hóspedes pagos — esses ficam bloqueados.
      const { data: busy, error: busyErr } = await context.supabase
        .from("orders")
        .select("room_id")
        .in("room_id", data.roomIds)
        .eq("status", "paid");
      if (busyErr) throw new AppError("DATABASE", busyErr.message, { cause: busyErr });
      const blockedSet = new Set((busy ?? []).map((r) => r.room_id as string));
      const deletable = data.roomIds.filter((id) => !blockedSet.has(id));
      let deleted = 0;
      if (deletable.length > 0) {
        const { error, count } = await context.supabase
          .from("accommodation_rooms")
          .delete({ count: "exact" })
          .in("id", deletable);
        if (error) throw new AppError("DATABASE", error.message, { cause: error });
        deleted = count ?? deletable.length;
      }
      return { deleted, blocked: blockedSet.size };
    }),
  );

/** Move um hóspede para outro quarto. */
export const moveOccupant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ orderId: z.string().uuid(), targetRoomId: z.string().uuid() }).parse(d),
  )
  .handler(
    withErrorLogging("rooms.move", async ({ data, context }) => {
      await assertFinance(context.supabase);
      const { data: target } = await context.supabase
        .from("accommodation_rooms")
        .select("*")
        .eq("id", data.targetRoomId)
        .single();
      if (!target) throw new AppError("NOT_FOUND", "Quarto destino não encontrado.");
      if (!target.active) throw new AppError("VALIDATION", "Quarto inativo.");
      const { count } = await context.supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("room_id", data.targetRoomId)
        .eq("status", "paid");
      if ((count ?? 0) >= target.capacity) throw new AppError("VALIDATION", "Quarto destino lotado.");

      const { error } = await context.supabase
        .from("orders")
        .update({ room_id: data.targetRoomId, allocation_status: "allocated" })
        .eq("id", data.orderId);
      if (error) throw new AppError("DATABASE", error.message, { cause: error });
      return { ok: true };
    }),
  );

/** Remove um hóspede do quarto (volta para fila manual). */
export const removeOccupant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(
    withErrorLogging("rooms.removeOccupant", async ({ data, context }) => {
      await assertFinance(context.supabase);
      const { error } = await context.supabase
        .from("orders")
        .update({ room_id: null, allocation_status: "pending_manual" })
        .eq("id", data.orderId);
      if (error) throw new AppError("DATABASE", error.message, { cause: error });
      return { ok: true };
    }),
  );

/** Realoca pedidos pendentes. */
export const allocatePendingIndividuals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    withErrorLogging("rooms.allocatePending", async ({ context }) => {
      await assertFinance(context.supabase);
      const { data: pending } = await context.supabase
        .from("orders")
        .select("id")
        .eq("status", "paid")
        .is("room_id", null)
        .or("reservation_type.eq.individual,reservation_type.is.null");
      let ok = 0;
      let fail = 0;
      for (const o of pending ?? []) {
        const { data, error } = await context.supabase.rpc("allocate_individual_room", { _order_id: o.id });
        if (error || !data) fail++;
        else ok++;
      }
      return { processed: (pending ?? []).length, allocated: ok, stillPending: fail };
    }),
  );

/** Lista quartos compatíveis para mover um hóspede. */
export const listCompatibleRooms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(
    withErrorLogging("rooms.listCompat", async ({ data, context }) => {
      await assertFinance(context.supabase);
      const { data: order } = await context.supabase
        .from("orders")
        .select("id, room_id, group_id, participant_id")
        .eq("id", data.orderId)
        .single();
      if (!order) throw new AppError("NOT_FOUND", "Pedido não encontrado.");

      const { data: rooms } = await context.supabase
        .from("accommodation_rooms")
        .select("*")
        .eq("active", true)
        .not("status", "in", "(blocked,maintenance,full)")
        .order("room_number");

      const ids = (rooms ?? []).map((r) => r.id);
      const { data: occ } = ids.length
        ? await context.supabase
            .from("orders")
            .select("room_id")
            .in("room_id", ids)
            .eq("status", "paid")
        : { data: [] as any[] };
      const occCount = new Map<string, number>();
      for (const o of occ ?? []) {
        occCount.set(o.room_id!, (occCount.get(o.room_id!) ?? 0) + 1);
      }

      const list = (rooms ?? [])
        .filter((r) => {
          if (r.id === order.room_id) return false;
          const used = occCount.get(r.id) ?? 0;
          if (used >= r.capacity) return false;
          // Galera: só aceita pedidos do mesmo grupo
          if (r.kind === "galera" && r.group_id !== order.group_id) return false;
          // Individual: não aceita pedido de grupo
          if (r.kind === "individual" && order.group_id) return false;
          return true;
        })
        .map((r) => ({
          id: r.id,
          room_number: r.room_number,
          kind: r.kind,
          capacity: r.capacity,
          occupied: occCount.get(r.id) ?? 0,
          gender_policy: r.gender_policy,
        }));
      return { rooms: list };
    }),
  );