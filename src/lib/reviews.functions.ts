/**
 * Server functions para o sistema de avaliações (event_reviews).
 * - listApprovedReviews: leitura pública (anon) com client padrão.
 * - listUserPendingOrders: pedidos pagos do usuário sem review.
 * - submitReview: cria/atualiza avaliação do usuário autenticado.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  display_name: string | null;
  city: string | null;
  avatar_url: string | null;
  photos: string[];
  video_url: string | null;
  featured: boolean;
  approved_at: string | null;
  created_at: string;
}

export const listApprovedReviews = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        limit: z.number().int().min(1).max(100).default(60),
        featuredOnly: z.boolean().default(false),
        locale: z.string().min(2).max(10).default("pt-BR"),
      })
      .partial()
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<PublicReview[]> => {
    let q = supabase
      .from("event_reviews")
      .select(
        "id, rating, title, comment, display_name, city, avatar_url, photos, video_url, featured, approved_at, created_at, user_id, translations",
      )
      .eq("status", "approved")
      .order("featured", { ascending: false })
      .order("approved_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(data?.limit ?? 60);
    if (data?.featuredOnly) q = q.eq("featured", true);
    const { data: rows, error } = await q;
    if (error) {
      console.error("[reviews.list]", error);
      return [];
    }
    const locale = data?.locale ?? "pt-BR";
    const base = locale.split("-")[0];
    const localeCandidates = Array.from(new Set([locale, base]));
    type Row = PublicReview & { user_id: string | null; translations?: Record<string, { comment?: string; title?: string }> | null };
    const list = (rows ?? []) as Row[];
    // Aplica tradução localizada de comentário/título quando existir.
    for (const r of list) {
      const tr = r.translations ?? {};
      for (const key of localeCandidates) {
        const tx = tr[key];
        if (tx) {
          if (typeof tx.comment === "string" && tx.comment.trim()) r.comment = tx.comment;
          if (typeof tx.title === "string" && tx.title.trim()) r.title = tx.title;
          break;
        }
      }
    }
    // Prioriza a foto cadastrada no perfil do usuário sobre o avatar_url
    // congelado na avaliação. Falha silenciosa: mantém o avatar da review.
    const userIds = Array.from(
      new Set(list.map((r) => r.user_id).filter((v): v is string => !!v)),
    );
    if (userIds.length > 0) {
      const { data: profs } = await supabase.rpc("get_public_avatars", {
        _ids: userIds,
      });
      const map = new Map<string, string | null>(
        (profs ?? []).map((p) => [p.id as string, (p.avatar_url as string | null) ?? null]),
      );
      for (const r of list) {
        if (r.user_id && map.get(r.user_id)) {
          r.avatar_url = map.get(r.user_id) ?? r.avatar_url;
        }
      }
    }
    return list.map(({ user_id: _u, translations: _t, ...rest }) => rest) as PublicReview[];
  });

const ReviewInput = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),
  displayName: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
  photos: z.array(z.string().url().max(500)).max(5).optional(),
  videoUrl: z.string().url().max(500).optional().nullable(),
  experienceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ReviewInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: db, userId } = context;
    // Gate: pedido precisa estar pago E pertencer ao usuário autenticado.
    const { data: ord } = await db
      .from("orders")
      .select("id,status,user_id,checked_in_at,bus_checked_in_at,lodging_checked_in_at")
      .eq("id", data.orderId)
      .maybeSingle();
    const order = ord as {
      id: string;
      status: string;
      user_id: string | null;
      checked_in_at: string | null;
      bus_checked_in_at: string | null;
      lodging_checked_in_at: string | null;
    } | null;
    if (!order || order.user_id !== userId) throw new Error("Pedido não encontrado.");
    if (order.status !== "paid") {
      throw new Error("Avaliação liberada apenas para pedidos pagos.");
    }
    const checkedIn =
      order.checked_in_at || order.bus_checked_in_at || order.lodging_checked_in_at;
    if (!checkedIn) {
      throw new Error(
        "Avaliação liberada somente após o check-in no evento.",
      );
    }
    // Uma avaliação por pedido — depois de enviada, não pode mais editar.
    const { data: prev } = await db
      .from("event_reviews")
      .select("id")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (prev) {
      throw new Error("Você já avaliou este pedido. Faça uma nova compra para avaliar novamente.");
    }

    const payload = {
      user_id: userId,
      order_id: data.orderId,
      rating: data.rating,
      title: data.title ?? null,
      comment: data.comment?.trim() || null,
      display_name: data.displayName?.trim() || null,
      city: data.city?.trim() || null,
      avatar_url: data.avatarUrl ?? null,
      photos: data.photos ?? [],
      video_url: data.videoUrl ?? null,
      experience_date: data.experienceDate ?? null,
      status: "pending" as const,
    };
    const { error } = await db.from("event_reviews").insert(payload);
    if (error) {
      console.error("[reviews.submit]", error);
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const getMyReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: db, userId } = context;
    const { data: row } = await db
      .from("event_reviews")
      .select("*")
      .eq("order_id", data.orderId)
      .eq("user_id", userId)
      .maybeSingle();
    return { review: row };
  });
