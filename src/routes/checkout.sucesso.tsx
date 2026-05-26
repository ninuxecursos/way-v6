import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, XCircle, ArrowRight, FileText, Home, Mail, Calendar, Hash, Loader2, Users, Copy, Share2, Check, Sparkles } from "lucide-react";
import { Header } from "@/components/wh/Header";
import { Footer } from "@/components/wh/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendServerEvent } from "@/lib/tracking-send.functions";

export const Route = createFileRoute("/checkout/sucesso")({
  head: () => ({ meta: [{ title: "Pagamento aprovado — Way Home" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    order: typeof s.order === "string" ? s.order : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
    collection_status: typeof s.collection_status === "string" ? s.collection_status : undefined,
    payment_id: typeof s.payment_id === "string" ? s.payment_id : undefined,
    payment_type: typeof s.payment_type === "string" ? s.payment_type : undefined,
    free: typeof s.free === "string" ? s.free : undefined,
  }),
  component: CheckoutSuccessPage,
});

type Order = {
  id: string;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  customer_email: string;
  payment_method: string | null;
  reservation_type: string | null;
  group_id: string | null;
  metadata: Record<string, unknown> | null;
};
type Item = {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
};
type Group = {
  id: string;
  coupon_code: string;
  capacity: number;
  holder_user_id: string;
  status: string;
};

const fmt = (cents: number, c = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: c }).format(cents / 100);

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date(iso));

function paymentLabel(method: string | null | undefined, type: string | undefined) {
  const v = (method || type || "").toLowerCase();
  if (v.includes("pix")) return "Pix";
  if (v.includes("credit") || v === "card" || v.includes("cart")) return "Cartão de crédito";
  if (v.includes("debit")) return "Cartão de débito";
  if (v.includes("ticket") || v.includes("boleto")) return "Boleto";
  return "Mercado Pago";
}

function CheckoutSuccessPage() {
  const search = Route.useSearch();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [paidMembers, setPaidMembers] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const fireServerEvent = useServerFn(sendServerEvent);

  const mpStatus = (search.status || search.collection_status || "").toLowerCase();
  const isPending = mpStatus === "in_process" || mpStatus === "pending";
  const isRejected = mpStatus === "rejected";

  // Dispara Purchase no Meta CAPI + GA4 MP (server-side, deduplicado por orderId).
  // Tambem dispara client-side pelo Pixel/GA4 ja injetado no <head>.
  useEffect(() => {
    if (!order || isPending || isRejected) return;
    const w = window as unknown as { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void };
    const value = order.total_cents / 100;
    const contents = items.map((i) => ({ id: i.id, quantity: i.quantity, price: i.unit_price_cents / 100 }));
    try { w.fbq?.("track", "Purchase", { value, currency: order.currency, contents, content_type: "product" }, { eventID: order.id }); } catch {}
    try { w.gtag?.("event", "purchase", { transaction_id: order.id, value, currency: order.currency, items: contents }); } catch {}
    fireServerEvent({
      data: {
        event: "Purchase",
        eventId: order.id,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        value,
        currency: order.currency,
        contents,
        user: {
          email: order.customer_email,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
      },
    }).catch(() => {});
  }, [order, items, isPending, isRejected, fireServerEvent]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!search.order) { setLoading(false); return; }
      const [{ data: o }, { data: it }] = await Promise.all([
        supabase
          .from("orders")
          .select("id,status,total_cents,currency,created_at,paid_at,customer_email,payment_method,reservation_type,group_id,metadata")
          .eq("id", search.order)
          .maybeSingle(),
        supabase
          .from("order_items")
          .select("id,description,quantity,unit_price_cents,total_cents")
          .eq("order_id", search.order),
      ]);
      if (!alive) return;
      const ord = (o as Order) ?? null;
      setOrder(ord);
      setItems((it as Item[]) ?? []);
      if (ord?.group_id) {
        const [{ data: g }, { count }] = await Promise.all([
          supabase
            .from("reservation_groups")
            .select("id,coupon_code,capacity,holder_user_id,status")
            .eq("id", ord.group_id)
            .maybeSingle(),
          supabase
            .from("reservation_group_members")
            .select("id", { count: "exact", head: true })
            .eq("group_id", ord.group_id)
            .eq("payment_status", "paid"),
        ]);
        if (alive) {
          setGroup((g as Group) ?? null);
          setPaidMembers(count ?? 1);
        }
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [search.order]);

  const headline = useMemo(() => {
    if (isRejected) return { icon: XCircle, color: "text-destructive", title: "Pagamento não aprovado", desc: "Seu pagamento foi recusado. Você pode tentar novamente com outro método." };
    if (isPending) return { icon: Clock, color: "text-amber-500", title: "Pagamento em análise", desc: "Recebemos sua reserva. Assim que o pagamento for confirmado, enviaremos o comprovante por e-mail." };
    return { icon: CheckCircle2, color: "text-emerald-500", title: "Reserva confirmada!", desc: "Seu pagamento foi aprovado e sua experiência Way Home está garantida. Enviamos os detalhes para o seu e-mail." };
  }, [isPending, isRejected]);

  const Icon = headline.icon;

  const isHolder = !!(order && group && order.metadata && (order.metadata as Record<string, unknown>).is_group_holder === true);
  const showGroupCoupon = !isRejected && !!group && order?.reservation_type === "shared";
  const remainingSlots = group ? Math.max(0, group.capacity - paidMembers) : 0;
  const shareUrl = typeof window !== "undefined" && group ? `${window.location.origin}/grupo/${group.coupon_code}` : "";

  const handleCopy = async (text: string, label = "Cupom") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copiado!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleShare = async () => {
    if (!group) return;
    const text = `Reservei nossa hospedagem Way Home no Tomorrowland Brasil! Use o cupom ${group.coupon_code} para entrar no nosso quarto: ${shareUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Way Home — Cupom do quarto", text, url: shareUrl }); return; } catch { /* user cancelled */ }
    }
    handleCopy(text, "Convite");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-28 md:pt-32 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className={`mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-card ring-1 ring-border shadow-sm ${headline.color}`}>
              <Icon className="h-10 w-10" strokeWidth={2.25} />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">{headline.title}</h1>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">{headline.desc}</p>
          </div>

          {/* Cupom do quarto (modo Galera) */}
          {showGroupCoupon && group && (
            <Card className="mb-8 overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg">
              <div className="p-6 md:p-8">
                <div className="flex items-start gap-3 mb-5">
                  <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0">
                        <Sparkles className="h-3 w-3 mr-1" /> Modo Galera
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {paidMembers}/{group.capacity} confirmados
                      </Badge>
                    </div>
                    <h2 className="font-display text-xl md:text-2xl font-bold mt-2">
                      {isHolder ? "Seu cupom do quarto está pronto" : "Você entrou no quarto galera"}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isHolder
                        ? `Compartilhe este código com seus amigos para que eles comprem a hospedagem em seu quarto. Faltam ${remainingSlots} ${remainingSlots === 1 ? "vaga" : "vagas"} para completar.`
                        : "Sua vaga está garantida neste quarto. Você pode acompanhar todos os detalhes na sua conta."}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-dashed border-primary/40 bg-card p-5 md:p-6">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 text-center">
                    Cupom do quarto
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-2xl md:text-4xl font-extrabold tracking-[0.2em] text-primary select-all">
                      {group.coupon_code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(group.coupon_code)}
                      className="h-10 w-10 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition"
                      aria-label="Copiar cupom"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {isHolder && (
                  <div className="mt-5 flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleShare} className="flex-1" size="lg">
                      <Share2 className="mr-2 h-4 w-4" /> Compartilhar convite
                    </Button>
                    <Button asChild variant="outline" size="lg" className="flex-1">
                      <Link to="/conta/grupos">
                        <Users className="mr-2 h-4 w-4" /> Gerenciar em Grupos Galera
                      </Link>
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-4 text-center">
                  {isHolder ? (
                    <>
                      Acompanhe quem já confirmou no painel{" "}
                      <Link to="/conta/grupos" className="text-primary font-medium underline">
                        Grupos Galera
                      </Link>{" "}
                      na sua área do usuário.
                    </>
                  ) : (
                    <>
                      Veja o status do seu quarto em{" "}
                      <Link to="/conta/grupos" className="text-primary font-medium underline">
                        Grupos Galera
                      </Link>.
                    </>
                  )}
                </p>
              </div>
            </Card>
          )}

          {/* Order card */}
          {loading ? (
            <Card className="p-10 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando seu pedido…</span>
            </Card>
          ) : order ? (
            <Card className="overflow-hidden">
              <div className="p-6 md:p-8 border-b bg-muted/30">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Número do pedido</p>
                    <p className="font-mono text-lg font-semibold mt-1">#{order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <Badge variant={isRejected ? "destructive" : isPending ? "secondary" : "default"} className="text-xs">
                    {isRejected ? "Recusado" : isPending ? "Em análise" : "Pago"}
                  </Badge>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                {items.length > 0 && (
                  <div className="space-y-3">
                    {items.map((it) => (
                      <div key={it.id} className="flex justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{it.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {it.quantity} × {fmt(it.unit_price_cents, order.currency)}
                          </p>
                        </div>
                        <p className="font-semibold whitespace-nowrap">{fmt(it.total_cents, order.currency)}</p>
                      </div>
                    ))}
                    <Separator />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-display text-2xl font-extrabold">{fmt(order.total_cents, order.currency)}</span>
                </div>

                <Separator />

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <dt className="text-muted-foreground text-xs">Data</dt>
                      <dd className="font-medium">{fmtDate(order.paid_at ?? order.created_at)}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Hash className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <dt className="text-muted-foreground text-xs">Forma de pagamento</dt>
                      <dd className="font-medium">{search.free ? "Cortesia (cupom 100%)" : paymentLabel(order.payment_method, search.payment_type)}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <dt className="text-muted-foreground text-xs">Comprovante enviado para</dt>
                      <dd className="font-medium truncate">{order.customer_email}</dd>
                    </div>
                  </div>
                </dl>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Não encontramos os detalhes deste pedido aqui, mas se o pagamento foi processado você o verá em
                <Link to="/conta/pedidos" className="text-primary font-medium ml-1 underline">Meus pedidos</Link>.
              </p>
            </Card>
          )}

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {order && (
              <Button asChild size="lg">
                <Link to="/conta/pedidos/$id" params={{ id: order.id }}>
                  <FileText className="mr-2 h-4 w-4" /> Ver detalhes do pedido
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg">
              <Link to="/conta/pedidos">
                Meus pedidos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" /> Início
              </Link>
            </Button>
          </div>

          {/* Next steps */}
          {!isRejected && (
            <div className="mt-12 grid sm:grid-cols-3 gap-4">
              {[
                { n: 1, t: "Confirmação por e-mail", d: "Você recebeu o comprovante e os próximos passos no e-mail informado." },
                { n: 2, t: "Comunicações da viagem", d: "Enviaremos detalhes de check-in, transfer e roteiro conforme a data se aproxima." },
                { n: 3, t: "Acesso na sua conta", d: "Todos os documentos e QR Code de check-in ficam disponíveis em Meus pedidos." },
              ].map((s) => (
                <div key={s.n} className="rounded-lg border bg-card p-5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold mb-3">{s.n}</div>
                  <p className="font-semibold text-sm">{s.t}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.d}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}