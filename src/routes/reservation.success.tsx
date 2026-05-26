import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { ReservationShell } from "@/components/reservation/ReservationShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useReservation } from "@/hooks/use-reservation";
import {
  CheckCircle2,
  Users,
  Copy,
  Share2,
  Mail,
  ListChecks,
  QrCode,
  ArrowRight,
  Clock,
} from "lucide-react";
import { getMyGroups } from "@/lib/groups.functions";
import { getMyOrderCheckin } from "@/lib/checkin.functions";
import { notifySuccess } from "@/lib/notify";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { OrderCheckinQR } from "@/components/account/OrderCheckinQR";

const searchSchema = z.object({
  orderId: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/reservation/success")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Reserva confirmada — Way Home" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SuccessStep />
    </RequireAuth>
  ),
});

function SuccessStep() {
  const { state, reset } = useReservation();
  const { orderId } = Route.useSearch();
  // Captura no primeiro render se a compra foi modo Galera, antes do reset.
  const [wasGroup] = useState(() => state.modality?.kind === "shared");
  const [isHolder] = useState(() => !!state.participant?.isGroupHolder);

  useEffect(() => {
    const t = window.setTimeout(() => reset(), 800);
    return () => window.clearTimeout(t);
  }, [reset]);

  const fetchMyGroups = useServerFn(getMyGroups);
  const { data } = useQuery({
    queryKey: ["success-my-groups"],
    queryFn: () => fetchMyGroups(),
    enabled: wasGroup && isHolder,
    refetchInterval: (q) => {
      const groups = (q.state.data as any)?.groups ?? [];
      return groups.find((g: any) => g.isHolder) ? false : 3000;
    },
  });
  const holderGroup = (data?.groups ?? []).find((g) => g.isHolder);
  const coupon = holderGroup?.couponCode;
  const shareText = coupon
    ? `Comprei minha hospedagem na Way Home (Tomorrowland Brasil)! Use meu cupom para entrar no MEU quarto: ${coupon}`
    : "";
  const copyCoupon = async () => {
    if (!coupon) return;
    await navigator.clipboard.writeText(coupon);
    notifySuccess("Cupom copiado!");
  };
  const shareWhats = () => {
    if (!coupon) return;
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const fetchCheckin = useServerFn(getMyOrderCheckin);
  const checkinQ = useQuery({
    queryKey: ["success-order-status", orderId],
    queryFn: () => fetchCheckin({ data: { orderId: orderId! } }),
    enabled: !!orderId,
    refetchInterval: (q) => {
      const s = (q.state.data as any)?.status;
      return s && s !== "paid" && s !== "refunded" && s !== "canceled" ? 5000 : false;
    },
  });
  const status = checkinQ.data?.status;
  const shortId = orderId ? orderId.slice(0, 8).toUpperCase() : null;

  const statusBadge = (() => {
    if (!orderId) return null;
    if (!status)
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" /> Carregando…
        </Badge>
      );
    if (status === "paid")
      return (
        <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> Pagamento aprovado
        </Badge>
      );
    if (status === "canceled" || status === "refunded")
      return (
        <Badge variant="destructive" className="gap-1">
          Pagamento {status === "refunded" ? "estornado" : "cancelado"}
        </Badge>
      );
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" /> Aguardando confirmação
      </Badge>
    );
  })();

  return (
    <ReservationShell
      step="success"
      title="Reserva recebida!"
      subtitle="Acompanhe o status abaixo. Você receberá um e-mail assim que o pagamento for confirmado."
    >
      <div className="space-y-6">
        {/* Resumo do pedido */}
        <Card className="p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="font-display text-xl font-extrabold leading-tight">
                  Sua reserva foi registrada
                </h2>
                {shortId ? (
                  <p className="text-sm text-muted-foreground">
                    Pedido <span className="font-mono font-semibold text-foreground">#{shortId}</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Acompanhe pela sua área de cliente.
                  </p>
                )}
              </div>
            </div>
            {statusBadge}
          </div>
        </Card>

        {/* Próximos passos */}
        <Card className="p-6 sm:p-7">
          <h3 className="font-display text-lg font-bold">Próximos passos</h3>
          <ol className="mt-4 space-y-4">
            <StepItem
              n={1}
              icon={<ListChecks className="h-4 w-4" />}
              title="Acompanhe o pedido na sua conta"
              desc="Em Minha conta → Meus pedidos você vê o status, o comprovante e todos os detalhes da reserva."
            />
            <StepItem
              n={2}
              icon={<Mail className="h-4 w-4" />}
              title="Receba a confirmação por e-mail"
              desc="Assim que o pagamento for aprovado pelo gateway, enviamos o e-mail oficial com os dados da hospedagem."
            />
            <StepItem
              n={3}
              icon={<QrCode className="h-4 w-4" />}
              title="Apresente o QR Code na chegada"
              desc="Na chegada à hospedagem, mostre o QR Code abaixo na recepção para validar sua vaga."
            />
          </ol>
        </Card>

        {/* QR Code de check-in */}
        {orderId ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Seu QR Code de check-in</h3>
            </div>
            <OrderCheckinQR orderId={orderId} />
            <p className="text-xs text-muted-foreground">
              Dica: baixe o QR Code agora e salve no celular. Ele renova automaticamente
              por segurança, mas você pode apresentar o salvo — a recepção faz a leitura
              do código atual quando você chegar.
            </p>
          </div>
        ) : null}

        {/* Cupom de grupo (Galera) */}
        {wasGroup && isHolder && (
          <Card className="border-2 border-brand/40 bg-brand/5 p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-brand font-semibold">
              <Users className="h-5 w-5" />
              Seu cupom de grupo
            </div>
            <p className="text-sm text-muted-foreground">
              Compartilhe com a sua galera. Quem usar este cupom no checkout entra
              automaticamente no MESMO quarto que você (até o limite escolhido).
            </p>
            {coupon ? (
              <>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-background border px-3 py-2 font-mono text-lg font-bold tracking-wider text-center">
                    {coupon}
                  </code>
                  <Button size="icon" variant="outline" onClick={copyCoupon} aria-label="Copiar cupom">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={shareWhats} className="flex-1">
                    <Share2 className="mr-2 h-4 w-4" />
                    Compartilhar no WhatsApp
                  </Button>
                  <Button variant="outline" onClick={copyCoupon} className="flex-1">
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar mensagem
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Gerando seu cupom… aparecerá aqui em instantes.
              </p>
            )}
          </Card>
        )}

        {/* CTAs */}
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {orderId ? (
              <Button asChild size="lg" className="sm:flex-1">
                <Link to="/conta/pedidos/$id" params={{ id: orderId }}>
                  Acompanhar meu pedido
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="sm:flex-1">
                <Link to="/conta/pedidos">
                  Ver meus pedidos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
            {wasGroup && (
              <Button asChild variant="secondary" size="lg" className="sm:flex-1">
                <Link to="/conta/grupos">
                  <Users className="mr-2 h-4 w-4" />
                  {isHolder ? "Meu cupom de grupo" : "Meu grupo"}
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg" className="sm:flex-1">
              <Link to="/conta">Minha conta</Link>
            </Button>
          </div>
        </Card>
      </div>
    </ReservationShell>
  );
}

function StepItem({
  n,
  icon,
  title,
  desc,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex gap-4">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-brand font-bold text-sm">
        {n}
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-foreground/70">
          {icon}
        </span>
      </div>
      <div className="min-w-0 space-y-1">
        <p className="font-semibold leading-tight">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}