import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Star, XCircle, Loader2 } from "lucide-react";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { OrderCheckinQR } from "@/components/account/OrderCheckinQR";
import { cancelOrder } from "@/lib/orders.functions";
import { getMyOrderCheckin } from "@/lib/checkin.functions";
import { getMyReview } from "@/lib/reviews.functions";
import { toAppError } from "@/lib/errors";

export const Route = createFileRoute("/conta/pedidos/$id")({
  component: OrderDetail,
});

type Order = { id: string; status: string; total_cents: number; currency: string; created_at: string; paid_at: string | null; customer_email: string; checked_in_at: string | null };
type Item = { id: string; description: string; quantity: number; unit_price_cents: number; total_cents: number };
type Receipt = { number: string; pdf_url: string | null };

const fmt = (cents: number, c = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: c }).format(cents / 100);

const statusLabel: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  failed: "Falhou",
  canceled: "Cancelado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

function OrderDetail() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const cancelFn = useServerFn(cancelOrder);
  const fetchCheckin = useServerFn(getMyOrderCheckin);
  const fetchMyReview = useServerFn(getMyReview);
  const checkinQ = useQuery({
    queryKey: ["order-checkin-timeline", id],
    queryFn: () => fetchCheckin({ data: { orderId: id } }),
    enabled: !!order && order.status === "paid",
    refetchInterval: (q) => {
      const d = q.state.data as any;
      return d && !d.fullyCompleted ? 5000 : false;
    },
  });
  const reviewQ = useQuery({
    queryKey: ["my-review", id],
    queryFn: () => fetchMyReview({ data: { orderId: id } }),
    enabled: !!order && order.status === "paid",
  });
  const reviewStatus = (reviewQ.data?.review as { status?: string } | null)?.status ?? null;
  const busAt = checkinQ.data?.busCheckedInAt ?? null;
  const lodgingAt = checkinQ.data?.lodgingCheckedInAt ?? null;
  const anyCheckedIn = !!(busAt || lodgingAt || checkinQ.data?.checkedInAt || order?.checked_in_at);

  const canCancel =
    order &&
    !["paid", "cancelled", "canceled", "refunded"].includes(order.status);

  const onCancel = async () => {
    if (!order) return;
    if (!window.confirm("Cancelar este pedido? Esta ação não pode ser desfeita.")) return;
    setCancelling(true);
    try {
      await cancelFn({ data: { orderId: order.id } });
      setOrder({ ...order, status: "cancelled" });
      toast.success("Pedido cancelado.");
    } catch (e) {
      toast.error("Não foi possível cancelar", { description: toAppError(e).userMessage });
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: it }, { data: rc }] = await Promise.all([
        supabase.from("orders").select("id,status,total_cents,currency,created_at,paid_at,customer_email,checked_in_at").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("id,description,quantity,unit_price_cents,total_cents").eq("order_id", id),
        supabase.from("receipts").select("number,pdf_url").eq("order_id", id).maybeSingle(),
      ]);
      setOrder((o as Order) ?? null);
      setItems((it as Item[]) ?? []);
      setReceipt((rc as Receipt) ?? null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!order) return <p className="text-sm text-muted-foreground">Pedido não encontrado.</p>;

  return (
    <div className="space-y-6">
      <Link to="/conta/pedidos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <header>
        <p className="font-mono text-xs text-muted-foreground">Pedido #{order.id.slice(0, 8)}</p>
        <div className="mt-1 flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-2xl md:text-3xl font-extrabold">{fmt(order.total_cents, order.currency)}</h1>
          <Badge>{statusLabel[order.status] ?? order.status}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Criado em {new Date(order.created_at).toLocaleString("pt-BR")}
          {order.paid_at && ` · Pago em ${new Date(order.paid_at).toLocaleString("pt-BR")}`}
        </p>
      </header>

      <Card className="p-5">
        <h2 className="font-display font-bold mb-3">Itens</h2>
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{it.description}</p>
                <p className="text-xs text-muted-foreground">{it.quantity}× {fmt(it.unit_price_cents, order.currency)}</p>
              </div>
              <p className="font-semibold">{fmt(it.total_cents, order.currency)}</p>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item.</p>}
        </div>
      </Card>

      {receipt && (
        <Card className="p-5">
          <h2 className="font-display font-bold mb-3 flex items-center gap-2"><FileText size={16} /> Recibo</h2>
          <p className="text-sm text-muted-foreground mb-3">Número: <span className="font-mono">{receipt.number}</span></p>
          <Button asChild variant="outline" size="sm">
            <Link to="/recibo/$number" params={{ number: receipt.number }}>Ver recibo</Link>
          </Button>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-display font-bold mb-4">Status da reserva</h2>
        <OrderTimeline
          status={order.status}
          createdAt={order.created_at}
          paidAt={order.paid_at}
          checkInAt={busAt}
          checkOutAt={lodgingAt}
        />
      </Card>

      {canCancel && (
        <Card className="p-5 border-dashed border-destructive/40">
          <h2 className="font-display font-bold mb-2 flex items-center gap-2 text-destructive">
            <XCircle size={16} /> Cancelar pedido
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Você ainda não pagou este pedido. Você pode cancelá-lo agora para liberar a vaga e
            evitar acúmulo de pedidos abertos.
          </p>
          <Button variant="destructive" size="sm" onClick={onCancel} disabled={cancelling}>
            {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancelar pedido
          </Button>
        </Card>
      )}

      {order.status === "paid" && <OrderCheckinQR orderId={order.id} />}

      {order.status === "paid" && anyCheckedIn && !reviewStatus && (
        <Card className="p-5 md:p-6 bg-gradient-to-br from-brand/15 via-card to-transparent border-brand/30 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-brand/20 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={18} className="text-brand fill-brand" />
              ))}
            </div>
            <h2 className="font-display text-lg md:text-xl font-extrabold">
              Como foi sua experiência?
            </h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Sua avaliação ajuda outros viajantes a confiarem na Way Home. Você pode anexar
              fotos e um vídeo da sua experiência.
            </p>
            <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-md shadow-brand/20">
              <Link to="/avaliar/$orderId" params={{ orderId: order.id }}>Avaliar agora</Link>
            </Button>
          </div>
        </Card>
      )}

      {order.status === "paid" && !anyCheckedIn && !reviewStatus && (
        <Card className="p-5 border-dashed">
          <h2 className="font-display font-bold mb-2 flex items-center gap-2">
            <Star size={16} className="text-muted-foreground" /> Avaliação liberada após o check-in
          </h2>
          <p className="text-sm text-muted-foreground">
            Assim que sua presença for confirmada no evento, liberamos o formulário de avaliação
            automaticamente.
          </p>
        </Card>
      )}

      {order.status === "paid" && reviewStatus && (
        <Card className="p-5 border-brand/30 bg-brand/5">
          <h2 className="font-display font-bold mb-1 flex items-center gap-2">
            <Star size={16} className="text-brand fill-brand" />
            Avaliação enviada
          </h2>
          <p className="text-sm text-muted-foreground">
            {reviewStatus === "approved"
              ? "Sua avaliação já foi publicada. Obrigado por compartilhar!"
              : "Recebemos sua avaliação e ela está em moderação. Obrigado!"}
          </p>
        </Card>
      )}
    </div>
  );
}
