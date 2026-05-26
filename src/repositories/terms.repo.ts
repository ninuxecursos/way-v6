/**
 * Repository — registro de aceite de termos.
 * Usa serverFn (`saveTermsAcceptance`) com supabaseAdmin para aceitar
 * visitantes (sem sessão).
 */
import { saveTermsAcceptance } from "@/lib/reservation-guest.functions";

export interface CreateTermsAcceptanceInput {
  participantId: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedImageRights: boolean;
  termsVersion: string;
}

export interface TermsAcceptanceRecord {
  id: string;
  participant_id: string;
  accepted_terms: boolean;
  accepted_privacy: boolean;
  accepted_image_rights: boolean;
  terms_version: string;
  accepted_at: string;
}

export async function createTermsAcceptance(
  input: CreateTermsAcceptanceInput,
): Promise<TermsAcceptanceRecord> {
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null;

  const row = await saveTermsAcceptance({
    data: {
      participantId: input.participantId,
      acceptedTerms: input.acceptedTerms,
      acceptedPrivacy: input.acceptedPrivacy,
      acceptedImageRights: input.acceptedImageRights,
      termsVersion: input.termsVersion,
      userAgent,
    },
  });
  return { id: row.id } as TermsAcceptanceRecord;
}