import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { setOrderCheckIn } from "@/lib/event-reminders.functions";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/lib/notify";
import { issueReceipt } from "@/lib/receipts.functions";
import { ReceiptActions } from "@/components/admin/ReceiptActions";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/admin/orders_/$id")({ component: OrderDetail });

function OrderDetail() {
  const { id } = Route.useParams();
  const [o, setO] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [intents, setIntents] = useState<any[]>([]);
  const [receipt, setReceipt] = useState<any>(null);
  const checkInFn = useServerFn(setOrderCheckIn);
  const issueFn = useServerFn(issueReceipt);
  const [busy, setBusy] = useState(false);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // fix(B3): paralelizar + tratar erro.
      try {
        const [oRes, itRes, inRes, rcRes] = await Promise.all([
          supabase.from("orders").select("*").eq("id", id).single(),
          supabase.from("order_items").select("*").eq("order_id", id),
          supabase.from("payment_intents").select("*").eq("order_id", id).order("created_at"),
          supabase.from("receipts").select("*").eq("order_id", id).maybeSingle(),
        ]);
        if (cancelled) return;
        if (oRes.error) throw oRes.error;
        setO(oRes.data);
        setItems(itRes.data ?? []);
        setIntents(inRes.data ?? []);
        setReceipt(rcRes.data ?? null);
      } catch (e) {
        if (cancelled) return;
        console.error("[admin/order-detail]", e);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (!o) return <div className="p-8">Carregando...</div>;

  const issue = async () => {
    setIssuing(true);
    try {
      await issueFn({ data: { orderId: o.id, origin: window.location.origin } as any });
      const { data } = await supabase.from("receipts").select("*").eq("order_id", id).maybeSingle();
      setReceipt(data ?? null);
      notifySuccess("Recibo emitido.");
    } catch (e) { notifyError(e); } finally { setIssuing(false); }
  };

  const toggleCheckIn = async () => {
    setBusy(true);
    try {
      await checkInFn({ data: { orderId: o.id, checkedIn: !o.checked_in_at } });
      notifySuccess(o.checked_in_at ? "Check-in removido." : "Check-in registrado.");
      const { data } = await supabase.from("orders").select("*").eq("id", id).single();
      setO(data);
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <Link to="/admin/orders" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>
      <h1 className="text-3xl font-bold mb-1">Pedido #{o.id.slice(0, 8)}</h1>
      <p className="text-muted-foreground mb-6">{new Date(o.created_at).toLocaleString("pt-BR")}</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card title="Cliente"><p>{o.customer_email}</p><p className="text-xs text-muted-foreground">{(o.metadata as any)?.customer_name}</p></Card>
        <Card title="Status"><p className="text-lg font-semibold">{o.status}</p><p className="text-xs">{o.payment_provider ?? "—"}</p></Card>
        <Card title="Total"><p className="text-2xl font-bold">{o.currency} {(o.total_cents / 100).toFixed(2)}</p></Card>
        <Card title="Pago em"><p>{o.paid_at ? new Date(o.paid_at).toLocaleString("pt-BR") : "—"}</p></Card>
      </div>

      {o.status === "paid" && (
        <div className="bg-card border p-4 rounded-lg mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">Check-in no evento</p>
            <p className="font-semibold">
              {o.checked_in_at
                ? `Confirmado em ${new Date(o.checked_in_at).toLocaleString("pt-BR")}`
                : "Hóspede ainda não fez check-in"}
            </p>
          </div>
          <Button onClick={toggleCheckIn} disabled={busy} variant={o.checked_in_at ? "outline" : "default"}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {o.checked_in_at ? "Desfazer check-in" : "Marcar check-in"}
          </Button>
        </div>
      )}

      {o.status === "paid" && (
        <div className="bg-card border p-4 rounded-lg mb-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1 flex items-center gap-1"><FileText className="h-3 w-3" /> Recibo</p>
              <p className="font-semibold">
                {receipt ? <>Nº <span className="font-mono">{receipt.number}</span></> : "Ainda não emitido"}
              </p>
              {receipt && <p className="text-xs text-muted-foreground mt-0.5">Emitido em {new Date(receipt.issued_at).toLocaleString("pt-BR")}</p>}
            </div>
            {!receipt && (
              <Button onClick={issue} disabled={issuing}>
                <FileText className="h-4 w-4 mr-2" />{issuing ? "Emitindo..." : "Emitir recibo"}
              </Button>
            )}
          </div>
          {receipt && (
            <ReceiptActions
              number={receipt.number}
              customerPhone={(o.metadata as any)?.customer_phone}
              customerName={(o.metadata as any)?.customer_name}
            />
          )}
        </div>
      )}

      <h2 className="font-semibold mb-2">Itens</h2>
      <div className="bg-card border rounded-lg mb-6">
        {items.map((it) => (
          <div key={it.id} className="flex justify-between p-3 border-b last:border-0">
            <div><p>{it.description}</p><p className="text-xs text-muted-foreground">{it.product_type} · qtd {it.quantity}</p></div>
            <p className="font-mono">{(it.total_cents / 100).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <h2 className="font-semibold mb-2">Tentativas de pagamento</h2>
      <div className="bg-card border rounded-lg">
        {intents.map((p) => (
          <div key={p.id} className="p-3 border-b last:border-0 text-sm">
            <div className="flex justify-between">
              <span><strong>{p.status}</strong> · {p.external_id ?? "—"}</span>
              <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("pt-BR")}</span>
            </div>
            {p.checkout_url && <a href={p.checkout_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Abrir checkout</a>}
            {p.last_error && <p className="text-xs text-destructive mt-1">{p.last_error}</p>}
          </div>
        ))}
        {intents.length === 0 && <p className="p-4 text-muted-foreground text-sm">Nenhuma tentativa.</p>}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-card border p-4 rounded-lg"><p className="text-xs uppercase text-muted-foreground mb-1">{title}</p>{children}</div>;
}