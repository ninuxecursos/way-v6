import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { useT, useFormatters } from "@/components/i18n/LocaleProvider";
import { DataPagination } from "@/components/admin/common/DataPagination";

export const Route = createFileRoute("/conta/pedidos/")({
  component: OrdersList,
});

type Order = { id: string; status: string; total_cents: number; currency: string; created_at: string };

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
  canceled: "outline",
  cancelled: "outline",
  refunded: "outline",
};

function OrdersList() {
  const { user } = useAuth();
  const t = useT();
  const { formatCurrency, formatDate } = useFormatters();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders")
      .select("id,status,total_cents,currency,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data ?? []) as Order[]);
        setLoading(false);
      });
  }, [user]);

  // Reset page when pageSize changes
  useEffect(() => { setPage(0); }, [pageSize]);

  const total = orders.length;
  const pageItems = useMemo(
    () => orders.slice(page * pageSize, (page + 1) * pageSize),
    [orders, page, pageSize],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{t("account.orders.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("account.orders.subtitle")}</p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loadingShort")}</p>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center">
          <ShoppingBag className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-semibold">{t("account.orders.empty")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("account.orders.emptyDesc")}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {pageItems.map((o) => {
            const variant = statusVariant[o.status] ?? "outline";
            const label = t(`account.orders.status.${o.status}`);
            return (
              <Link key={o.id} to="/conta/pedidos/$id" params={{ id: o.id }}>
                <Card className="p-4 hover:border-brand/40 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</p>
                        <Badge variant={variant} className="text-[10px]">{label}</Badge>
                      </div>
                      <p className="mt-1 text-sm">{formatDate(o.created_at, { day: "2-digit", month: "short", year: "numeric" })}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold">{formatCurrency(o.total_cents, o.currency)}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                  </div>
                </Card>
              </Link>
            );
          })}

          <DataPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}
