import { supabase } from "@/integrations/supabase/client";

export type DashboardData = {
  revenueMonthCents: number;
  revenuePrevMonthCents: number;
  paidOrders: number;
  pendingOrders: number;
  avgTicketCents: number;
  newCustomers7: number;
  newCustomers30: number;
  totalCustomers: number;
  topPosts: { id: string; slug: string; views: number; comments: number }[];
  emailsQueued: number;
  fiscalPending: number;
  recentAudit: {
    id: string;
    action: string;
    entity_type: string;
    actor_email: string | null;
    created_at: string;
  }[];
  salesSeries: { day: string; cents: number }[];
  recentReviews: { id: string; rating: number; comment: string | null; created_at: string }[];
};

export async function fetchDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const last30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const last7 = new Date(now.getTime() - 7 * 86400000).toISOString();

  const [
    revMonth,
    revPrev,
    paid,
    pending,
    sales30,
    cust7,
    cust30,
    custTotal,
    topPosts,
    emailsQ,
    fiscalP,
    audit,
    reviews,
  ] = await Promise.all([
    supabase.from("orders").select("total_cents").eq("status", "paid").gte("paid_at", monthStart),
    supabase
      .from("orders")
      .select("total_cents")
      .eq("status", "paid")
      .gte("paid_at", prevMonthStart)
      .lt("paid_at", monthStart),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("orders").select("paid_at,total_cents").eq("status", "paid").gte("paid_at", last30),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", last7),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", last30),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("blog_posts")
      .select("id,slug,views_count,comments_count")
      .eq("status", "published")
      .order("views_count", { ascending: false })
      .limit(5),
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "pending"]),
    supabase
      .from("fiscal_invoices")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "error"]),
    supabase
      .from("audit_logs")
      .select("id,action,entity_type,actor_email,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("event_reviews")
      .select("id,rating,comment,created_at")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const revenueMonthCents = (revMonth.data ?? []).reduce(
    (a, r: { total_cents: number | null }) => a + (r.total_cents ?? 0),
    0,
  );
  const revenuePrevMonthCents = (revPrev.data ?? []).reduce(
    (a, r: { total_cents: number | null }) => a + (r.total_cents ?? 0),
    0,
  );
  const totalPaidCents = (sales30.data ?? []).reduce(
    (a, r: { total_cents: number | null }) => a + (r.total_cents ?? 0),
    0,
  );
  const avgTicketCents = (sales30.data ?? []).length
    ? Math.round(totalPaidCents / (sales30.data ?? []).length)
    : 0;

  const buckets = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }
  for (const row of (sales30.data ?? []) as { paid_at: string | null; total_cents: number | null }[]) {
    if (!row.paid_at) continue;
    const k = new Date(row.paid_at).toISOString().slice(0, 10);
    buckets.set(k, (buckets.get(k) ?? 0) + (row.total_cents ?? 0));
  }
  const salesSeries = Array.from(buckets, ([day, cents]) => ({ day, cents }));

  return {
    revenueMonthCents,
    revenuePrevMonthCents,
    paidOrders: paid.count ?? 0,
    pendingOrders: pending.count ?? 0,
    avgTicketCents,
    newCustomers7: cust7.count ?? 0,
    newCustomers30: cust30.count ?? 0,
    totalCustomers: custTotal.count ?? 0,
    topPosts: ((topPosts.data ?? []) as { id: string; slug: string; views_count: number | null; comments_count: number | null }[]).map((p) => ({
      id: p.id,
      slug: p.slug,
      views: Number(p.views_count ?? 0),
      comments: Number(p.comments_count ?? 0),
    })),
    emailsQueued: emailsQ.count ?? 0,
    fiscalPending: fiscalP.count ?? 0,
    recentAudit: (audit.data ?? []) as DashboardData["recentAudit"],
    salesSeries,
    recentReviews: (reviews.data ?? []) as DashboardData["recentReviews"],
  };
}