/**
 * Server functions para persistir o rascunho da reserva por usuário logado.
 * Cada usuário tem 1 rascunho ativo (índice único em user_id).
 * RLS garante isolamento por usuário; usamos o cliente autenticado.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// JSON serializável (compatível com a serialização das server functions).
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

const stateSchema = z.any() as unknown as z.ZodType<Record<string, JsonValue>>;

export const loadReservationDraft = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("reservation_drafts")
      .select("state, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[reservation-draft] load failed", error);
      return { state: null as JsonValue | null, updatedAt: null as string | null };
    }
    return {
      state: (data?.state ?? null) as JsonValue | null,
      updatedAt: (data?.updated_at ?? null) as string | null,
    };
  });

export const saveReservationDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { state: Record<string, JsonValue> }) =>
    z.object({ state: stateSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("reservation_drafts")
      .upsert(
        {
          user_id: userId,
          state: data.state as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "user_id" },
      );
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[reservation-draft] save failed", error);
      throw new Error("Não foi possível salvar o rascunho.");
    }
    return { ok: true };
  });

export const clearReservationDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("reservation_drafts")
      .delete()
      .eq("user_id", userId);
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[reservation-draft] clear failed", error);
    }
    return { ok: true };
  });

/**
 * Seed do rascunho para uma conta recém-criada (ainda sem e-mail confirmado).
 * Usado no fluxo "preenche tudo → aceita termos → signUp" para que o usuário,
 * ao confirmar o e-mail e logar (mesmo em outra aba/dispositivo), encontre o
 * rascunho já hidratado ao abrir /reservation/checkout.
 *
 * Guarda de segurança: só aceita gravar se a conta existir, não estiver
 * confirmada (email_confirmed_at IS NULL) e tiver sido criada nos últimos 30 min.
 */
export const seedDraftByEmail = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; state: Record<string, unknown> }) =>
    z
      .object({
        email: z.string().trim().email().max(255).toLowerCase(),
        state: z.record(z.string(), z.any()),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    // Localiza o usuário recém-criado por e-mail via Admin API.
    let userId: string | null = null;
    let createdAt: string | null = null;
    let confirmedAt: string | null = null;
    try {
      // listUsers + filtro local (sem busca por e-mail nativa em algumas versões).
      const { data: list, error } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (error) throw error;
      const found = (list?.users ?? []).find(
        (u: { email?: string | null }) =>
          (u.email ?? "").toLowerCase() === data.email,
      );
      if (found) {
        userId = found.id as string;
        createdAt = (found.created_at as string) ?? null;
        confirmedAt = (found.email_confirmed_at as string | null) ?? null;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[seedDraftByEmail] lookup failed", err);
      return { ok: false, reason: "lookup_failed" as const };
    }
    if (!userId) return { ok: false, reason: "user_not_found" as const };
    if (confirmedAt) return { ok: false, reason: "already_confirmed" as const };
    if (createdAt) {
      const ageMs = Date.now() - new Date(createdAt).getTime();
      if (ageMs > 30 * 60 * 1000) {
        return { ok: false, reason: "expired" as const };
      }
    }
    const { error: upErr } = await admin.from("reservation_drafts").upsert(
      {
        user_id: userId,
        state: data.state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (upErr) {
      // eslint-disable-next-line no-console
      console.error("[seedDraftByEmail] upsert failed", upErr);
      return { ok: false, reason: "save_failed" as const };
    }
    return { ok: true as const };
  });
