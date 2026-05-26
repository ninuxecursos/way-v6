/**
 * Cupons promocionais — validação pública + CRUD admin.
 *
 * - validatePromoCoupon: RPC pública (anon) — usada no checkout.
 * - listPromoCoupons / upsertPromoCoupon / deletePromoCoupon: admin only.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withErrorLogging } from "./server-fn-error";
import { AppError } from "./errors";

export type PromoCoupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  min_order_cents: number;
  product_slugs: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const ValidateSchema = z.object({
  code: z.string().trim().min(1).max(64),
  productSlug: z.string().trim().min(1).max(120).optional(),
  amountCents: z.number().int().min(0),
});

export const validatePromoCoupon = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ValidateSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabase.rpc(
      "validate_promo_coupon" as never,
      {
        _code: data.code,
        _product_slug: data.productSlug ?? null,
        _amount_cents: data.amountCents,
      } as never,
    );
    if (error) throw new AppError("DATABASE", "Erro ao validar cupom.", { cause: error });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return { valid: false, reason: "not_found", discountCents: 0 };
    return {
      valid: !!(row as any).valid,
      reason: (row as any).reason as string,
      code: (row as any).code as string | null,
      discountType: (row as any).discount_type as "percent" | "fixed" | null,
      discountValue: (row as any).discount_value as number | null,
      discountCents: Number((row as any).discount_cents ?? 0),
    };
  });

// ─────────────── ADMIN ───────────────

async function assertAdmin(client: any, userId: string) {
  const { data, error } = await client.rpc("is_admin", { _user_id: userId });
  if (error || !data) throw new AppError("FORBIDDEN", "Acesso restrito a administradores.");
}

const ListSchema = z.object({
  search: z.string().trim().max(120).default(""),
  status: z.enum(["all", "active", "inactive", "expired"]).default("all"),
});

export const listPromoCoupons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListSchema.parse(d ?? {}))
  .handler(
    withErrorLogging("promo.list", async ({ data, context }) => {
      await assertAdmin(context.supabase, context.userId);
      let q = context.supabase
        .from("promo_coupons" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (data.search) {
        const t = data.search.replace(/%/g, "");
        q = (q as any).or(`code.ilike.%${t}%,description.ilike.%${t}%`);
      }
      if (data.status === "active") q = (q as any).eq("active", true);
      else if (data.status === "inactive") q = (q as any).eq("active", false);
      const { data: rows, error } = await q;
      if (error) throw new AppError("DATABASE", "Erro ao listar cupons.", { cause: error });
      const now = Date.now();
      let list = (rows ?? []) as unknown as PromoCoupon[];
      if (data.status === "expired") {
        list = list.filter((c) => c.ends_at && new Date(c.ends_at).getTime() < now);
      }
      return { rows: list };
    }),
  );

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().toUpperCase().min(2).max(64).regex(/^[A-Z0-9_-]+$/),
  description: z.string().trim().max(500).optional().nullable(),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().int().min(1),
  max_uses: z.number().int().min(1).optional().nullable(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  min_order_cents: z.number().int().min(0).default(0),
  product_slugs: z.array(z.string().trim().min(1).max(120)).optional().nullable(),
  active: z.boolean().default(true),
});

export const upsertPromoCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(
    withErrorLogging("promo.upsert", async ({ data, context }) => {
      await assertAdmin(context.supabase, context.userId);
      if (data.discount_type === "percent" && data.discount_value > 100) {
        throw new AppError("BAD_REQUEST", "Percentual não pode passar de 100.");
      }
      const payload: Record<string, unknown> = {
        code: data.code,
        description: data.description ?? null,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        max_uses: data.max_uses ?? null,
        starts_at: data.starts_at || null,
        ends_at: data.ends_at || null,
        min_order_cents: data.min_order_cents,
        product_slugs:
          data.product_slugs && data.product_slugs.length > 0 ? data.product_slugs : null,
        active: data.active,
      };
      if (data.id) {
        const { error } = await context.supabase
          .from("promo_coupons" as never)
          .update(payload as never)
          .eq("id", data.id);
        if (error) throw new AppError("DATABASE", error.message, { cause: error });
        return { id: data.id };
      }
      payload.created_by = context.userId;
      const { data: row, error } = await context.supabase
        .from("promo_coupons" as never)
        .insert(payload as never)
        .select("id")
        .single();
      if (error) throw new AppError("DATABASE", error.message, { cause: error });
      return { id: (row as { id: string }).id };
    }),
  );

export const deletePromoCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(
    withErrorLogging("promo.delete", async ({ data, context }) => {
      await assertAdmin(context.supabase, context.userId);
      const { error } = await context.supabase
        .from("promo_coupons" as never)
        .delete()
        .eq("id", data.id);
      if (error) throw new AppError("DATABASE", error.message, { cause: error });
      return { ok: true };
    }),
  );
