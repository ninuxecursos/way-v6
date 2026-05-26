import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  Clock,
  Eye,
  FileCheck,
  Inbox,
  Newspaper,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { DashboardSection } from "@/components/admin/dashboard/DashboardSection";
import { RevenueChart } from "@/components/admin/dashboard/RevenueChart";
import { TopPostsCard } from "@/components/admin/dashboard/TopPostsCard";
import { CustomersCard } from "@/components/admin/dashboard/CustomersCard";
import { RecentAuditCard } from "@/components/admin/dashboard/RecentAuditCard";
import { fmtBRL } from "@/lib/format";
import { fetchDashboardData } from "@/repositories/dashboard.repo";
import { getAnalyticsDashboardSummary } from "@/lib/analytics.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: fetchDashboardData,
    staleTime: 30_000,
  });

  const [trafficRange, setTrafficRange] = useState<"today" | "7d" | "30d">("7d");
  const summaryFn = useServerFn(getAnalyticsDashboardSummary);
  const trafficQ = useQuery({
    queryKey: ["admin", "dashboard", "traffic", trafficRange],
    queryFn: () => summaryFn({ data: { range: trafficRange } }),
    refetchInterval: 15_000,
  });

  const trendRevenue = useMemo(() => {
    if (!data?.revenuePrevMonthCents) return null;
    const v =
      ((data.revenueMonthCents - data.revenuePrevMonthCents) / data.revenuePrevMonthCents) * 100;
    return { value: v, label: "vs mês anterior" };
  }, [data?.revenueMonthCents, data?.revenuePrevMonthCents]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visão geral"
        title="Dashboard"
        description="Indicadores de vendas, conteúdo, clientes e operação em um só lugar."
        actions={
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            Ver pedidos
          </Link>
        }
      />

      {/* Tráfego do site */}
      <DashboardSection
        title="Visitas ao site"
        linkTo="/admin/analytics"
        linkLabel="Ver analytics"
        hint={
          <div className="flex gap-1">
            {(["today", "7d", "30d"] as const).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={trafficRange === r ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => setTrafficRange(r)}
              >
                {r === "today" ? "Hoje" : r === "7d" ? "7 dias" : "30 dias"}
              </Button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Ao vivo"
            value={
              <span className="inline-flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                {trafficQ.data?.live ?? 0}
              </span>
            }
            sub="últimos 5 min"
            icon={<Activity className="h-4 w-4" />}
            loading={trafficQ.isLoading}
            to="/admin/analytics"
          />
          <StatCard
            label="Visitantes únicos"
            value={(trafficQ.data?.visitors ?? 0).toLocaleString("pt-BR")}
            icon={<Users className="h-4 w-4" />}
            loading={trafficQ.isLoading}
            to="/admin/analytics"
          />
          <StatCard
            label="Sessões"
            value={(trafficQ.data?.sessions ?? 0).toLocaleString("pt-BR")}
            icon={<TrendingUp className="h-4 w-4" />}
            loading={trafficQ.isLoading}
            to="/admin/analytics"
          />
          <StatCard
            label="Pageviews"
            value={(trafficQ.data?.pageviews ?? 0).toLocaleString("pt-BR")}
            icon={<Eye className="h-4 w-4" />}
            loading={trafficQ.isLoading}
            to="/admin/analytics"
          />
        </div>
      </DashboardSection>

      {/* Bloco 1 — Vendas e receita */}
      <DashboardSection title="Vendas e receita" hint="Últimos 30 dias">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Receita do mês"
            value={fmtBRL(data?.revenueMonthCents ?? 0)}
            trend={trendRevenue}
            icon={<Wallet className="h-4 w-4" />}
            loading={isLoading}
            to="/admin/finance"
          />
          <StatCard
            label="Pedidos pagos"
            value={(data?.paidOrders ?? 0).toLocaleString("pt-BR")}
            sub={`${data?.pendingOrders ?? 0} pendente${(data?.pendingOrders ?? 0) === 1 ? "" : "s"}`}
            icon={<ShoppingBag className="h-4 w-4" />}
            loading={isLoading}
            to="/admin/orders"
          />
          <StatCard
            label="Ticket médio"
            value={fmtBRL(data?.avgTicketCents ?? 0)}
            sub="30 dias"
            icon={<TrendingUp className="h-4 w-4" />}
            loading={isLoading}
            to="/admin/finance"
          />
          <StatCard
            label="Clientes ativos"
            value={(data?.totalCustomers ?? 0).toLocaleString("pt-BR")}
            sub={`+${data?.newCustomers30 ?? 0} no mês`}
            icon={<Users className="h-4 w-4" />}
            loading={isLoading}
            to="/admin/customers"
          />
        </div>
        <RevenueChart data={data?.salesSeries ?? []} />
      </DashboardSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloco 2 — Tráfego e conteúdo */}
        <DashboardSection title="Tráfego e conteúdo" linkTo="/admin/blog" linkLabel="Ver blog">
          <TopPostsCard posts={data?.topPosts ?? []} />
        </DashboardSection>

        {/* Bloco 3 — Clientes */}
        <DashboardSection title="Clientes" linkTo="/admin/customers" linkLabel="Ver todos">
          <CustomersCard
            newCustomers7={data?.newCustomers7 ?? 0}
            newCustomers30={data?.newCustomers30 ?? 0}
            totalCustomers={data?.totalCustomers ?? 0}
            reviews={data?.recentReviews ?? []}
          />
        </DashboardSection>
      </div>

      {/* Bloco 4 — Operação */}
      <DashboardSection title="Operação">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pedidos pendentes"
            value={data?.pendingOrders ?? 0}
            icon={<Clock className="h-4 w-4" />}
            loading={isLoading}
            to="/admin/orders"
          />
          <StatCard
            label="NF-e pendentes"
            value={data?.fiscalPending ?? 0}
            icon={<FileCheck className="h-4 w-4" />}
            loading={isLoading}
            to="/admin/fiscal-invoices"
          />
          <StatCard
            label="E-mails na fila"
            value={data?.emailsQueued ?? 0}
            icon={<Inbox className="h-4 w-4" />}
            loading={isLoading}
            to="/admin/email-outbox"
          />
          <StatCard
            label="Posts publicados"
            value={data?.topPosts.length ?? 0}
            icon={<Newspaper className="h-4 w-4" />}
            loading={isLoading}
            to="/admin/blog"
          />
        </div>
        <RecentAuditCard items={data?.recentAudit ?? []} />
      </DashboardSection>
    </div>
  );
}