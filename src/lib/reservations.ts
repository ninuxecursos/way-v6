export const RESERVATION_LABEL: Record<string, string> = {
  individual: "Individual",
  shared: "Quarto compartilhado",
  galera: "Galera",
  couple: "Casal",
};

export const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão",
  boleto: "Boleto",
  manual: "Manual",
};

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
};

export function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "paid":
      return "default";
    case "pending":
      return "secondary";
    case "failed":
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

export type ReservationRow = {
  id: string;
  created_at: string;
  reservation_type: string | null;
  payment_method: string | null;
  status: string;
  total_cents: number;
  final_price_cents: number | null;
  participant: {
    id: string;
    full_name: string;
    phone: string;
    city: string;
    email: string;
  } | null;
};

export type ReservationStats = {
  total: number;
  totalReceivedCents: number;
  pixCount: number;
  cardCount: number;
  pendingCount: number;
  individualCount: number;
  galeraCount: number;
};