/**
 * Schemas Zod do fluxo de reserva.
 * Usados em React Hook Form (resolver) e na hidratação do estado persistido.
 */
import { z } from "zod";

export const modalitySchema = z.object({
  productSlug: z.string().min(1, "Selecione uma modalidade"),
  productId: z.string().uuid(),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().min(3).max(8),
  coverImageUrl: z.string().url().nullable(),
  maxPerOrder: z.number().int().positive().nullable(),
  kind: z.enum(["individual", "shared", "couple", "other"]).default("other"),
  checkoutMode: z.enum(["auto", "whatsapp"]).default("auto"),
  recommended: z.boolean().default(false),
  description: z.string().default(""),
  highlights: z.array(z.string()).default([]),
  economyLabel: z.string().nullable().default(null),
  minQuantity: z.number().int().positive().default(1),
  genderOptions: z.array(z.enum(["m", "f"])).default([]),
  whatsappMessage: z.string().nullable().default(null),
});

import { isValidCPF } from "@/lib/cpf";

export const companionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome completo")
    .max(120, "Nome muito longo")
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, {
      message: "Informe nome e sobrenome",
    }),
  cpf: z
    .string()
    .trim()
    .min(1, "Informe o CPF")
    .refine((v) => isValidCPF(v), { message: "CPF inválido" }),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+\d{10,15}$/i, "Telefone inválido — inclua DDI e DDD"),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(180),
  gender: z.enum(["m", "f", "other"], {
    errorMap: () => ({ message: "Selecione uma opção" }),
  }),
  birthdate: z.string().trim().optional().or(z.literal("")),
});

export const participantSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo")
    .max(120, "Nome muito longo")
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, {
      message: "Informe nome e sobrenome",
    }),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(180),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+\d{10,15}$/i, "Telefone inválido — inclua DDI e DDD"),
  cpf: z
    .string()
    .trim()
    .min(1, "Informe seu CPF")
    .refine((v) => isValidCPF(v), { message: "CPF inválido" }),
  city: z
    .string()
    .trim()
    .min(2, "Informe sua cidade de origem")
    .max(120, "Cidade muito longa"),
  gender: z.enum(["m", "f", "other"], {
    errorMap: () => ({ message: "Selecione uma opção" }),
  }),
  reservationType: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  participantId: z.string().uuid().optional(),
  companions: z.array(companionSchema).default([]),
  groupCouponCode: z
    .string()
    .trim()
    .toUpperCase()
    .max(64)
    .regex(/^[A-Z0-9-]+$/, "Cupom inválido")
    .optional()
    .or(z.literal("")),
  isGroupHolder: z.boolean().optional(),
  groupCapacity: z.number().int().min(2).max(20).optional(),
});

export const termsSchema = z.object({
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "Você precisa aceitar os Termos de Uso" }),
  }),
  acceptedPrivacy: z.literal(true, {
    errorMap: () => ({ message: "Você precisa aceitar a Política de Privacidade" }),
  }),
  acceptedImageRights: z.boolean().default(false),
});

export const reservationStateSchema = z.object({
  modality: modalitySchema.optional(),
  participant: participantSchema.optional(),
  terms: z
    .object({
      acceptedTerms: z.boolean(),
      acceptedPrivacy: z.boolean(),
      acceptedImageRights: z.boolean(),
      acceptedAt: z.string(),
      termsVersion: z.string(),
    })
    .optional(),
  gatewayId: z.string().uuid().optional(),
  updatedAt: z.number().int().nonnegative(),
});

export type ModalityInput = z.infer<typeof modalitySchema>;
export type ParticipantInput = z.infer<typeof participantSchema>;
export type CompanionInput = z.infer<typeof companionSchema>;
export type TermsInput = z.infer<typeof termsSchema>;