/**
 * Sistema de Check-in via QR Code.
 *
 * - getMyOrderCheckin: usuário autenticado recupera o token do PRÓPRIO pedido pago
 *   (usado para gerar o QR no app do cliente).
 * - validateCheckin: admin/financeiro valida o token lido pela câmera. Resposta
 *   classifica o resultado em ok | already | invalid | unpaid.
 * - searchOrdersForCheckin: busca manual por id curto, e-mail ou nome.
 * - recentCheckins: lista os últimos check-ins realizados.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withErrorLogging } from "./server-fn-error";
import { assertRoles } from "./admin-guards";
import { AppError } from "./errors";
import {
  buildRotatingCode,
  verifyRotatingCode,
  CHECKIN_CODE_TTL_MS,
} from "./checkin-codes.server";

const StageSchema = z.enum(["bus", "lodging"]);
export type CheckinStage = z.infer<typeof StageSchema>;

const TokenSchema = z.object({
  token: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/, "Token inválido"),
  stage: StageSchema,
});

export type CheckinResult =
  | {
      status: "ok";
      orderId: string;
      customerName: string | null;
      customerEmail: string;
      productLabel: string;
      checkedInAt: string;
      stage: CheckinStage;
      busCheckedInAt: string | null;
      lodgingCheckedInAt: string | null;
      fullyCompleted: boolean;
    }
  | {
      status: "already";
      orderId: string;
      customerName: string | null;
      customerEmail: string;
      productLabel: string;
      checkedInAt: string;
      checkedInMethod: string | null;
      stage: CheckinStage;
      busCheckedInAt: string | null;
      lodgingCheckedInAt: string | null;
    }
  | { status: "unpaid"; orderId: string; orderStatus: string }
  | { status: "invalid" };

async function buildPayload(orderId: string) {
  const [{ data: o }, { data: items }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("id,status,customer_email,user_id,checked_in_at,checkin_method,bus_checked_in_at,lodging_checked_in_at")
      .eq("id", orderId)
      .maybeSingle(),
    supabaseAdmin
      .from("order_items")
      .select("description")
      .eq("order_id", orderId)
      .limit(1),
    supabaseAdmin
      .from("profiles")
      .select("full_name,display_name")
      .eq("id", (await supabaseAdmin.from("orders").select("user_id").eq("id", orderId).maybeSingle()).data?.user_id ?? "")
      .maybeSingle(),
  ]);
  return {
    order: o,
    productLabel: items?.[0]?.description ?? "Hospedagem Way Home",
    customerName: profile?.full_name ?? profile?.display_name ?? null,
  };
}

/**
 * Rate limit ad-hoc (sem primitives no backend) por ator staff.
 * Janela de 60s — 60 validações é largo o suficiente para evento real,
 * mas evita brute-force de tokens.
 */
async function rateLimitStaff(actorId: string, action: string, limit = 60, windowMs = 60_000) {
  const bucket = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
  const key = `checkin:${action}:${actorId}`;
  const { data: existing } = await supabaseAdmin
    .from("rate_limits")
    .select("id,count")
    .eq("key", key)
    .eq("bucket", bucket)
    .maybeSingle();
  if (existing) {
    if ((existing.count ?? 0) >= limit) {
      throw new AppError("RATE_LIMITED", "Muitas validações em pouco tempo. Aguarde alguns segundos.");
    }
    await supabaseAdmin
      .from("rate_limits")
      .update({ count: (existing.count ?? 0) + 1 })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("rate_limits").insert({ key, bucket, count: 1 });
  }
}

export const validateCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TokenSchema.parse(d))
  .handler(
    withErrorLogging("checkin.validate", async ({ data, context }) => {
      const userId = await assertRoles(context.supabase, [
        "super_admin",
        "admin",
        "financeiro",
      ]);
      await rateLimitStaff(userId, "validate");

      // 1) Tenta código rotativo HMAC (curta validade).
      const rotating = verifyRotatingCode(data.token);
      let order: any = null;
      let dbError: any = null;
      if (rotating) {
        const r = await supabaseAdmin
          .from("orders")
          .select("id,status,customer_email,user_id,checked_in_at,checkin_method,checkin_token,bus_checked_in_at,bus_checked_in_by,lodging_checked_in_at,lodging_checked_in_by")
          .eq("id", rotating.orderId)
          .maybeSingle();
        order = r.data;
        dbError = r.error;
      } else {
        // 2) Fallback: token estático (papel/PDF salvo).
        const r = await supabaseAdmin
          .from("orders")
          .select("id,status,customer_email,user_id,checked_in_at,checkin_method,checkin_token,bus_checked_in_at,bus_checked_in_by,lodging_checked_in_at,lodging_checked_in_by")
          .eq("checkin_token", data.token)
          .maybeSingle();
        order = r.data;
        dbError = r.error;
      }
      const error = dbError;
      if (error) throw new AppError("DATABASE", "Erro ao validar QR.", { cause: error });
      if (!order) return { status: "invalid" } satisfies CheckinResult;

      if (order.status !== "paid") {
        return {
          status: "unpaid",
          orderId: order.id,
          orderStatus: order.status,
        } satisfies CheckinResult;
      }

      // Carrega nome + produto
      const payload = await buildPayload(order.id);
      const productLabel = payload.productLabel;
      const customerName = payload.customerName;

      return await applyStageCheckin({
        order,
        userId,
        stage: data.stage,
        method: "qr",
        customerName,
        productLabel,
      });
    }),
  );

/**
 * Aplica o check-in de uma etapa (ônibus ou hospedagem) de forma idempotente.
 * Mantém `checked_in_at` legado em sincronia (marca quando AMBAS etapas concluídas)
 * para não quebrar dashboards/relatórios antigos.
 */
async function applyStageCheckin(opts: {
  order: any;
  userId: string;
  stage: CheckinStage;
  method: string;
  customerName: string | null;
  productLabel: string;
}): Promise<CheckinResult> {
  const { order, userId, stage, method, customerName, productLabel } = opts;
  const stageAtCol = stage === "bus" ? "bus_checked_in_at" : "lodging_checked_in_at";
  const stageByCol = stage === "bus" ? "bus_checked_in_by" : "lodging_checked_in_by";
  const existingStageAt: string | null = order[stageAtCol] ?? null;
  const busAt: string | null = order.bus_checked_in_at ?? null;
  const lodgingAt: string | null = order.lodging_checked_in_at ?? null;

  if (existingStageAt) {
    return {
      status: "already",
      orderId: order.id,
      customerName,
      customerEmail: order.customer_email,
      productLabel,
      checkedInAt: existingStageAt,
      checkedInMethod: order.checkin_method,
      stage,
      busCheckedInAt: busAt,
      lodgingCheckedInAt: lodgingAt,
    } satisfies CheckinResult;
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    [stageAtCol]: now,
    [stageByCol]: userId,
    checkin_method: method,
  };
  // Se a outra etapa já estava feita, marca também o `checked_in_at` legado.
  const otherAt = stage === "bus" ? lodgingAt : busAt;
  if (otherAt && !order.checked_in_at) {
    updatePayload.checked_in_at = now;
    updatePayload.checked_in_by = userId;
  }

  const { data: updated, error: upErr } = await supabaseAdmin
    .from("orders")
    .update(updatePayload as never)
    .eq("id", order.id)
    .is(stageAtCol, null)
    .select(`id,bus_checked_in_at,lodging_checked_in_at,checkin_method`)
    .maybeSingle();
  if (upErr) throw new AppError("DATABASE", "Erro ao registrar check-in.", { cause: upErr });

  if (!updated) {
    // Outra requisição venceu — devolve "already" com o estado mais recente.
    const { data: o2 } = await supabaseAdmin
      .from("orders")
      .select("bus_checked_in_at,lodging_checked_in_at,checkin_method")
      .eq("id", order.id)
      .maybeSingle();
    return {
      status: "already",
      orderId: order.id,
      customerName,
      customerEmail: order.customer_email,
      productLabel,
      checkedInAt: (o2?.[stageAtCol] as string | null) ?? now,
      checkedInMethod: o2?.checkin_method ?? null,
      stage,
      busCheckedInAt: (o2?.bus_checked_in_at as string | null) ?? busAt,
      lodgingCheckedInAt: (o2?.lodging_checked_in_at as string | null) ?? lodgingAt,
    } satisfies CheckinResult;
  }

  const newBus = (updated.bus_checked_in_at as string | null) ?? null;
  const newLodging = (updated.lodging_checked_in_at as string | null) ?? null;
  return {
    status: "ok",
    orderId: order.id,
    customerName,
    customerEmail: order.customer_email,
    productLabel,
    checkedInAt: now,
    stage,
    busCheckedInAt: newBus,
    lodgingCheckedInAt: newLodging,
    fullyCompleted: Boolean(newBus && newLodging),
  } satisfies CheckinResult;
}

// ─────────────── Cliente vê seu próprio QR ───────────────

const OrderIdSchema = z.object({ orderId: z.string().uuid() });
const OrderIdWithStageSchema = z.object({ orderId: z.string().uuid(), stage: StageSchema });

export const getMyOrderCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OrderIdSchema.parse(d))
  .handler(
    withErrorLogging("checkin.getMine", async ({ data, context }) => {
      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("id,user_id,status,checkin_token,checked_in_at,customer_email,bus_checked_in_at,lodging_checked_in_at")
        .eq("id", data.orderId)
        .maybeSingle();
      if (error || !order) throw new AppError("NOT_FOUND", "Pedido não encontrado.");
      // Permite o dono OU staff (admin/financeiro) — staff usa o admin.checkin
      if (order.user_id !== context.userId) {
        await assertRoles(context.supabase, ["super_admin", "admin", "financeiro"]);
      }
      // Gera código rotativo enquanto ALGUMA das etapas (ônibus / hospedagem) ainda estiver pendente.
      const busAt = order.bus_checked_in_at as string | null;
      const lodgingAt = order.lodging_checked_in_at as string | null;
      const fullyDone = Boolean(busAt && lodgingAt);
      const canRotate = order.status === "paid" && !fullyDone;
      const rotating = canRotate ? buildRotatingCode(order.id) : null;
      return {
        orderId: order.id,
        token: order.checkin_token as string,
        code: rotating?.code ?? null,
        expiresAt: rotating?.expiresAt ?? null,
        ttlMs: CHECKIN_CODE_TTL_MS,
        status: order.status,
        checkedInAt: order.checked_in_at,
        customerEmail: order.customer_email,
        busCheckedInAt: busAt,
        lodgingCheckedInAt: lodgingAt,
        fullyCompleted: fullyDone,
      };
    }),
  );

// ─────────────── Busca manual / Histórico ───────────────

const SearchSchema = z.object({
  q: z.string().trim().min(2).max(120),
});

export const searchOrdersForCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SearchSchema.parse(d))
  .handler(
    withErrorLogging("checkin.search", async ({ data, context }) => {
      await assertRoles(context.supabase, ["super_admin", "admin", "financeiro"]);
      const term = data.q.replace(/%/g, "").trim();
      const isShortId = /^[0-9a-fA-F-]{4,}$/.test(term);

      // 1) busca em orders (id curto / email)
      const orQuery = isShortId
        ? `id::text.ilike.${term}%,customer_email.ilike.%${term}%`
        : `customer_email.ilike.%${term}%`;

      const { data: orders, error } = await supabaseAdmin
        .from("orders")
        .select("id,status,customer_email,user_id,checked_in_at,total_cents,created_at")
        .or(orQuery)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw new AppError("DATABASE", "Erro na busca.", { cause: error });

      // 2) busca por nome em profiles
      let profileMatches: string[] = [];
      if (!isShortId) {
        const { data: profs } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .or(`full_name.ilike.%${term}%,display_name.ilike.%${term}%`)
          .limit(20);
        profileMatches = (profs ?? []).map((p) => p.id);
      }

      let extra: typeof orders = [];
      if (profileMatches.length > 0) {
        const { data: more } = await supabaseAdmin
          .from("orders")
          .select("id,status,customer_email,user_id,checked_in_at,total_cents,created_at")
          .in("user_id", profileMatches)
          .order("created_at", { ascending: false })
          .limit(20);
        extra = more ?? [];
      }

      const byId = new Map<string, any>();
      [...(orders ?? []), ...extra].forEach((o) => byId.set(o.id, o));
      const merged = Array.from(byId.values()).slice(0, 25);

      // Nomes via profiles
      const userIds = Array.from(new Set(merged.map((o) => o.user_id).filter(Boolean)));
      const names = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profs } = await supabaseAdmin
          .from("profiles")
          .select("id,full_name,display_name")
          .in("id", userIds);
        for (const p of profs ?? []) {
          names.set(p.id, (p.full_name || p.display_name || "") as string);
        }
      }

      return {
        rows: merged.map((o) => ({
          id: o.id,
          status: o.status,
          customerEmail: o.customer_email,
          customerName: names.get(o.user_id) || null,
          checkedInAt: o.checked_in_at,
          totalCents: o.total_cents,
          createdAt: o.created_at,
        })),
      };
    }),
  );

export const validateCheckinByOrderId = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OrderIdWithStageSchema.parse(d))
  .handler(
    withErrorLogging("checkin.validateByOrderId", async ({ data, context }) => {
      const userId = await assertRoles(context.supabase, [
        "super_admin",
        "admin",
        "financeiro",
      ]);
      await rateLimitStaff(userId, "manual");
      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("id,status,customer_email,user_id,checked_in_at,checkin_method,bus_checked_in_at,bus_checked_in_by,lodging_checked_in_at,lodging_checked_in_by")
        .eq("id", data.orderId)
        .maybeSingle();
      if (error || !order) return { status: "invalid" } satisfies CheckinResult;
      if (order.status !== "paid") {
        return { status: "unpaid", orderId: order.id, orderStatus: order.status } satisfies CheckinResult;
      }
      const payload = await buildPayload(order.id);
      return await applyStageCheckin({
        order,
        userId,
        stage: data.stage,
        method: "manual",
        customerName: payload.customerName,
        productLabel: payload.productLabel,
      });
    }),
  );

export const recentCheckins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    withErrorLogging("checkin.recent", async ({ context }) => {
      await assertRoles(context.supabase, ["super_admin", "admin", "financeiro"]);
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select("id,customer_email,user_id,checked_in_at,checkin_method")
        .not("checked_in_at", "is", null)
        .order("checked_in_at", { ascending: false })
        .limit(20);
      if (error) throw new AppError("DATABASE", "Erro ao carregar histórico.", { cause: error });
      const userIds = Array.from(
        new Set(
          (data ?? [])
            .map((d) => d.user_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      const names = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profs } = await supabaseAdmin
          .from("profiles")
          .select("id,full_name,display_name")
          .in("id", userIds);
        for (const p of profs ?? []) names.set(p.id, (p.full_name || p.display_name || "") as string);
      }
      return {
        rows: (data ?? []).map((d) => ({
          id: d.id,
          customerEmail: d.customer_email,
          customerName: (d.user_id && names.get(d.user_id)) || null,
          checkedInAt: d.checked_in_at as string,
          method: d.checkin_method,
        })),
      };
    }),
  );
