/**
 * Server functions para o fluxo de reserva de visitantes.
 *
 * Permite persistir participante e aceite de termos SEM exigir sessão.
 * O `user_id` é preenchido se houver Bearer token; caso contrário fica null
 * e o trigger `orders_link_user_by_email` resolve o vínculo quando a conta
 * for criada (mesmo e-mail).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { AppError } from "./errors";
import { withErrorLogging } from "./server-fn-error";

const CompanionSchema = z.object({
  name: z.string().trim().max(200),
  cpf: z.string().trim().max(20),
  whatsapp: z.string().trim().max(40),
  email: z.string().trim().max(255),
  gender: z.enum(["m", "f", "other"]),
  birthdate: z.string().max(20).optional(),
});

const ParticipantSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  cpf: z.string().trim().min(1).max(20),
  phone: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(255),
  city: z.string().trim().min(1).max(120),
  gender: z.enum(["m", "f", "other"]),
  reservationType: z.string().min(1).max(60),
  productId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).max(20),
  companions: z.array(CompanionSchema).max(20).default([]),
});

async function resolveUserId(): Promise<string | null> {
  try {
    const auth = getRequestHeader("authorization");
    if (auth?.startsWith("Bearer ")) {
      const { data } = await supabaseAdmin.auth.getUser(auth.slice(7));
      return data.user?.id ?? null;
    }
  } catch {
    /* anônimo é OK */
  }
  return null;
}

export const saveParticipant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ParticipantSchema.parse(d))
  .handler(
    withErrorLogging("reservation.saveParticipant", async ({ data }) => {
      const userId = await resolveUserId();
      const { data: row, error } = await supabaseAdmin
        .from("participants")
        .insert({
          user_id: userId,
          full_name: data.fullName,
          cpf: data.cpf,
          phone: data.phone,
          email: data.email.toLowerCase(),
          city: data.city,
          gender: data.gender,
          reservation_type: data.reservationType,
          product_id: data.productId ?? null,
          quantity: data.quantity,
          metadata: { companions: data.companions } as never,
        })
        .select("*")
        .single();
      if (error || !row)
        throw new AppError("DATABASE", "Falha ao salvar cadastro.", { cause: error });
      return row as { id: string };
    }),
  );

const TermsSchema = z.object({
  participantId: z.string().uuid(),
  acceptedTerms: z.boolean(),
  acceptedPrivacy: z.boolean(),
  acceptedImageRights: z.boolean(),
  termsVersion: z.string().min(1).max(40),
  userAgent: z.string().max(500).nullable().optional(),
});

export const saveTermsAcceptance = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TermsSchema.parse(d))
  .handler(
    withErrorLogging("reservation.saveTerms", async ({ data }) => {
      const userId = await resolveUserId();
      const { data: row, error } = await supabaseAdmin
        .from("terms_acceptance")
        .insert({
          user_id: userId,
          participant_id: data.participantId,
          accepted_terms: data.acceptedTerms,
          accepted_privacy: data.acceptedPrivacy,
          accepted_image_rights: data.acceptedImageRights,
          terms_version: data.termsVersion,
          user_agent: data.userAgent ?? null,
        })
        .select("id")
        .single();
      if (error || !row)
        throw new AppError("DATABASE", "Falha ao registrar aceite.", { cause: error });
      return { id: row.id as string };
    }),
  );