/**
 * Repository — persistência de participantes.
 * Chama serverFn (`saveParticipant`) que usa supabaseAdmin, permitindo
 * cadastro de visitantes sem sessão ativa.
 */
import { onlyDigits } from "@/lib/cpf";
import type { CompanionData, ParticipantData } from "@/types/reservation";
import { saveParticipant } from "@/lib/reservation-guest.functions";

export interface ParticipantRecord {
  id: string;
  full_name: string;
  cpf: string;
  phone: string;
  email: string;
  city: string;
  gender: "m" | "f" | "other";
  reservation_type: string;
  product_id: string | null;
  quantity: number;
  created_at: string;
}

export interface CreateParticipantInput extends ParticipantData {
  productId?: string | null;
}

export async function createParticipant(
  input: CreateParticipantInput,
): Promise<ParticipantRecord> {
  const companions: CompanionData[] = (input.companions ?? []).map((c) => ({
    name: c.name.trim(),
    cpf: onlyDigits(c.cpf),
    whatsapp: c.whatsapp,
    email: c.email.trim().toLowerCase(),
    gender: c.gender,
    birthdate: c.birthdate?.trim() || undefined,
  }));

  const row = await saveParticipant({
    data: {
      fullName: input.name.trim(),
      cpf: onlyDigits(input.cpf),
      phone: input.whatsapp,
      email: input.email.trim().toLowerCase(),
      city: input.city.trim(),
      gender: input.gender,
      reservationType: input.reservationType,
      productId: input.productId ?? null,
      quantity: input.quantity,
      companions,
    },
  });

  return row as ParticipantRecord;
}