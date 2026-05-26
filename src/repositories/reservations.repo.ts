import { supabase } from "@/integrations/supabase/client";
import type { ReservationRow, ReservationStats } from "@/lib/reservations";

export async function fetchReservationStats(): Promise<ReservationStats> {
  const [all, paid, pix, card, pending, individual, galera] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).not("reservation_type", "is", null),
    supabase
      .from("orders")
      .select("total_cents")
      .eq("status", "paid")
      .not("reservation_type", "is", null),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_method", "pix")
      .not("reservation_type", "is", null),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_method", "credit_card")
      .not("reservation_type", "is", null),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .not("reservation_type", "is", null),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("reservation_type", "individual"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("reservation_type", "galera"),
  ]);

  const totalReceivedCents = (paid.data ?? []).reduce(
    (acc, r: { total_cents: number | null }) => acc + (r.total_cents ?? 0),
    0,
  );

  return {
    total: all.count ?? 0,
    totalReceivedCents,
    pixCount: pix.count ?? 0,
    cardCount: card.count ?? 0,
    pendingCount: pending.count ?? 0,
    individualCount: individual.count ?? 0,
    galeraCount: galera.count ?? 0,
  };
}

export type ReservationListParams = {
  page: number;
  pageSize: number;
  search: string;
  reservationType: string;
  paymentMethod: string;
  status: string;
};

export async function fetchReservationList(params: ReservationListParams): Promise<{
  rows: ReservationRow[];
  count: number;
}> {
  const { page, pageSize, search, reservationType, paymentMethod, status } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("orders")
    .select(
      "id,created_at,reservation_type,payment_method,status,total_cents,final_price_cents,participant_id",
      { count: "exact" },
    )
    .not("reservation_type", "is", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (reservationType !== "all") q = q.eq("reservation_type", reservationType);
  if (paymentMethod !== "all") q = q.eq("payment_method", paymentMethod);
  if (status !== "all") q = q.eq("status", status);

  const { data: orders, count, error } = await q;
  if (error) throw error;

  const participantIds = Array.from(
    new Set((orders ?? []).map((o) => o.participant_id).filter(Boolean) as string[]),
  );

  const participantsMap = new Map<string, ReservationRow["participant"]>();
  if (participantIds.length > 0) {
    const { data: participants } = await supabase
      .from("participants")
      .select("id,full_name,phone,city,email")
      .in("id", participantIds);
    for (const p of participants ?? []) participantsMap.set(p.id, p as NonNullable<ReservationRow["participant"]>);
  }

  let rows: ReservationRow[] = (orders ?? []).map((o) => ({
    id: o.id,
    created_at: o.created_at,
    reservation_type: o.reservation_type,
    payment_method: o.payment_method,
    status: o.status,
    total_cents: o.total_cents ?? 0,
    final_price_cents: o.final_price_cents,
    participant: (o.participant_id && participantsMap.get(o.participant_id)) || null,
  }));

  const term = search.trim().toLowerCase();
  if (term) {
    rows = rows.filter((r) => {
      const p = r.participant;
      if (!p) return false;
      return (
        p.full_name?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        p.phone?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term)
      );
    });
  }

  return { rows, count: count ?? 0 };
}