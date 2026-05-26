import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/finance")({ component: Finance });

function Finance() {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: paid } = await supabase.from("orders").select("total_cents,currency,paid_at").eq("status", "paid").gte("paid_at", since);
      const { data: pending } = await supabase.from("orders").select("id").eq("status", "pending");
      const { data: refunded } = await supabase.from("orders").select("total_cents").eq("status", "refunded").gte("created_at", since);
      const grossCents = (paid ?? []).reduce((s, o) => s + Number(o.total_cents), 0);
      const refundCents = (refunded ?? []).reduce((s, o) => s + Number(o.total_cents), 0);
      const byDay: Record<string, number> = {};
      (paid ?? []).forEach((o) => {
        const d = (o.paid_at ?? "").slice(0, 10);
        byDay[d] = (byDay[d] ?? 0) + Number(o.total_cents);
      });
      setStats({
        count: paid?.length ?? 0,
        pending: pending?.length ?? 0,
        gross: grossCents / 100,
        refunds: refundCents / 100,
        net: (grossCents - refundCents) / 100,
        byDay,
      });
      const { data: r } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(8);
      setRecent(r ?? []);
    })();
  }, []);

  if (!stats) return <div className="p-8">Carregando...</div>;

  const days = Object.entries(stats.byDay).sort();
  const max = Math.max(1, ...days.map(([, v]) => v as number));

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Dashboard Financeiro <span className="text-sm text-muted-foreground font-normal">— últimos 30 dias</span></h1>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Stat label="Receita bruta" value={`R$ ${stats.gross.toFixed(2)}`} />
        <Stat label="Reembolsos" value={`R$ ${stats.refunds.toFixed(2)}`} tone="warn" />
        <Stat label="Receita líquida" value={`R$ ${stats.net.toFixed(2)}`} tone="good" />
        <Stat label="Pagos / Pendentes" value={`${stats.count} / ${stats.pending}`} />
      </div>

      <div className="bg-card border rounded-lg p-6 mb-8">
        <h2 className="font-semibold mb-4">Receita por dia</h2>
        {days.length === 0 ? <p className="text-muted-foreground text-sm">Sem vendas no período.</p> : (
          <div className="flex items-end gap-1 h-40">
            {days.map(([d, v]) => (
              <div key={d} className="flex-1 flex flex-col items-center justify-end" title={`${d}: R$ ${((v as number) / 100).toFixed(2)}`}>
                <div className="w-full bg-primary rounded-t" style={{ height: `${((v as number) / max) * 100}%` }} />
                <div className="text-[10px] text-muted-foreground mt-1 rotate-45 origin-left">{d.slice(5)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h2 className="font-semibold mb-4">Pedidos recentes</h2>
        <div className="space-y-2 text-sm">
          {recent.map((o) => (
            <Link key={o.id} to="/admin/orders/$id" params={{ id: o.id }} className="flex justify-between p-2 hover:bg-accent rounded">
              <span>{o.customer_email}</span>
              <span><span className="text-xs text-muted-foreground mr-2">{o.status}</span><strong>R$ {(o.total_cents / 100).toFixed(2)}</strong></span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
  const cls = tone === "good" ? "text-green-600" : tone === "warn" ? "text-yellow-600" : "";
  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${cls}`}>{value}</div>
    </div>
  );
}