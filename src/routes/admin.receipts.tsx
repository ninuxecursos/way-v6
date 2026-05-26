import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { issueReceipt } from "@/lib/receipts.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { ReceiptActions } from "@/components/admin/ReceiptActions";
import { notifyError, notifySuccess } from "@/lib/notify";

export const Route = createFileRoute("/admin/receipts")({ component: ReceiptsList });

function ReceiptsList() {
  const issueFn = useServerFn(issueReceipt);
  const [items, setItems] = useState<any[]>([]);
  const [orderId, setOrderId] = useState("");
  const [orderMap, setOrderMap] = useState<Record<string, any>>({});

  const load = async () => {
    const { data } = await supabase.from("receipts").select("*").order("issued_at", { ascending: false }).limit(100);
    const rs = data ?? [];
    setItems(rs);
    const ids = Array.from(new Set(rs.map((r) => r.order_id)));
    if (ids.length > 0) {
      const { data: orders } = await supabase.from("orders").select("id,customer_email,metadata").in("id", ids);
      const map: Record<string, any> = {};
      (orders ?? []).forEach((o: any) => { map[o.id] = o; });
      setOrderMap(map);
    }
  };
  useEffect(() => { load(); }, []);

  const issue = async () => {
    if (!orderId.trim()) return;
    try {
      await issueFn({ data: { orderId, origin: window.location.origin } as any });
      setOrderId(""); load();
    } catch (e) { notifyError(e); }
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Recibos</h1>
        <Link to="/admin/receipt-templates" className="text-sm text-primary hover:underline">Gerenciar templates →</Link>
      </div>
      <div className="flex gap-2 mb-6 p-4 bg-card border rounded-lg">
        <Input placeholder="UUID do pedido" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
        <Button onClick={issue}><Plus className="h-4 w-4 mr-2" />Emitir manualmente</Button>
      </div>
      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-3">Número</th>
            <th className="text-left p-3">Pedido / Cliente</th>
            <th className="text-left p-3">Emitido em</th>
            <th className="text-right p-3">Ações</th>
          </tr></thead>
          <tbody>
            {items.map((r) => {
              const order = orderMap[r.order_id];
              const meta = (order?.metadata as any) ?? {};
              return (
                <tr key={r.id} className="border-t align-middle">
                  <td className="p-3 font-mono">{r.number}</td>
                  <td className="p-3">
                    <Link to="/admin/orders/$id" params={{ id: r.order_id }} className="text-primary hover:underline block">
                      {r.order_id.slice(0, 8)}…
                    </Link>
                    {order && (
                      <span className="text-xs text-muted-foreground">
                        {meta.customer_name ?? order.customer_email}
                        {meta.customer_phone ? ` · ${meta.customer_phone}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-xs">{new Date(r.issued_at).toLocaleString("pt-BR")}</td>
                  <td className="p-3">
                    <div className="flex justify-end">
                      <ReceiptActions
                        number={r.number}
                        customerPhone={meta.customer_phone}
                        customerName={meta.customer_name}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhum recibo emitido ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}