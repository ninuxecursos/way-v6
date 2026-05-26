/**
 * Helpers para o contato de reserva (WhatsApp da modalidade Casal).
 * Lê a chave `reservation_contact` em site_settings.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ReservationContact {
  whatsappE164: string;
  whatsappCoupleMessage: string;
}

const DEFAULTS: ReservationContact = {
  whatsappE164: "+5500000000000",
  whatsappCoupleMessage: "Olá! Tenho interesse na reserva para casal no WAYHOME.",
};

let cache: ReservationContact | null = null;
let pending: Promise<ReservationContact> | null = null;

export async function getReservationContact(): Promise<ReservationContact> {
  if (cache) return cache;
  if (pending) return pending;
  pending = (async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "reservation_contact")
      .maybeSingle();
    const v = (data?.value ?? {}) as Record<string, unknown>;
    cache = {
      whatsappE164: typeof v.whatsapp_e164 === "string" ? v.whatsapp_e164 : DEFAULTS.whatsappE164,
      whatsappCoupleMessage:
        typeof v.whatsapp_couple_message === "string"
          ? v.whatsapp_couple_message
          : DEFAULTS.whatsappCoupleMessage,
    };
    pending = null;
    return cache;
  })();
  return pending;
}

export function buildWhatsappUrl(e164: string, message: string): string {
  const phone = e164.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
