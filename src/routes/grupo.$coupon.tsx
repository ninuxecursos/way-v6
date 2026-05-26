import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Users, Copy, Share2, MessageCircle, ArrowRight, Loader2, CheckCircle2, XCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicErrorBoundary } from "@/components/errors/PublicErrorBoundary";
import { getGroupCouponPublic } from "@/lib/groups.functions";
import { Header } from "@/components/wh/Header";

export const Route = createFileRoute("/grupo/$coupon")({
  head: ({ params }) => ({
    meta: [
      { title: `Entrar no grupo ${params.coupon} — Way Home` },
      {
        name: "description",
        content:
          "Você foi convidado para um quarto Galera no Way Home. Garanta sua vaga com o cupom do grupo.",
      },
      { property: "og:title", content: `Convite para o grupo ${params.coupon}` },
      {
        property: "og:description",
        content: "Entre no quarto Galera no Way Home com o cupom do grupo.",
      },
    ],
  }),
  component: GroupCouponPage,
  errorComponent: ({ error, reset }) => (
    <PublicErrorBoundary error={error} reset={reset} title="Cupom inválido" />
  ),
});

function GroupCouponPage() {
  const { coupon } = Route.useParams();
  const navigate = useNavigate();
  const fetchPreview = useServerFn(getGroupCouponPublic);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["group-coupon-public", coupon],
    queryFn: () => fetchPreview({ data: { coupon } }),
    retry: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/grupo/${encodeURIComponent(coupon)}`;
    setShareUrl(url);
    QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [coupon]);

  const copyCoupon = async () => {
    try {
      await navigator.clipboard.writeText(coupon.toUpperCase());
      toast.success("Cupom copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const shareNative = async () => {
    const text = data
      ? `Entra no meu quarto Galera no Way Home! Cupom: ${data.couponCode}`
      : `Entra no meu quarto Galera no Way Home!`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: "Convite Way Home — Galera",
          text,
          url: shareUrl,
        });
        return;
      } catch {
        /* usuário cancelou ou navegador sem suporte */
      }
    }
    await copyLink();
  };

  const whatsappMsg = encodeURIComponent(
    data
      ? `Oi! Já garanti meu lugar no Way Home. Entra no meu quarto Galera com este cupom: ${data.couponCode}\n\n${shareUrl}`
      : `Oi! Quer entrar no meu quarto Galera no Way Home? ${shareUrl}`,
  );

  const goToCheckout = () => {
    if (!data) return;
    navigate({ to: "/reservation", search: { coupon: data.couponCode } as never });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-brand/5 px-4 pt-28 md:pt-32 pb-12">
      <Header />
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="text-center">
          <Badge variant="outline" className="mb-3 gap-1">
            <Users className="h-3.5 w-3.5" /> Convite Galera
          </Badge>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Você foi convidado para um quarto Galera
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Garanta sua vaga usando o cupom do grupo no checkout.
          </p>
        </header>

        {isLoading && (
          <Card className="flex items-center justify-center gap-3 p-10">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
            <span className="text-sm text-muted-foreground">Validando cupom…</span>
          </Card>
        )}

        {error && !isLoading && (
          <Card className="space-y-3 p-8 text-center">
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <h2 className="font-semibold">Cupom não encontrado</h2>
            <p className="text-sm text-muted-foreground">
              O cupom <code className="font-mono">{coupon}</code> não existe ou foi removido.
            </p>
            <Button asChild variant="outline">
              <Link to="/reservation">Ver modalidades</Link>
            </Button>
          </Card>
        )}

        {data && (
          <>
            <Card className="overflow-hidden">
              <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Grupo de
                    </p>
                    <p className="font-display text-2xl font-extrabold">
                      {data.holderFirstName || "Way Home"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Modalidade
                    </p>
                    <p className="text-base font-medium">{data.productName}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={data.status === "open" ? "default" : "secondary"}
                      className="gap-1"
                    >
                      {data.status === "open" ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Aberto
                        </>
                      ) : (
                        "Fechado"
                      )}
                    </Badge>
                    <Badge variant="outline">
                      {data.used}/{data.capacity} vagas
                    </Badge>
                    {data.available > 0 ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        {data.available} vaga{data.available === 1 ? "" : "s"} restante
                        {data.available === 1 ? "" : "s"}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Lotado</Badge>
                    )}
                  </div>

                  <div className="space-y-2 rounded-xl border border-dashed bg-muted/30 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Cupom do grupo
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-md border bg-background px-3 py-2 font-mono text-lg font-bold tracking-wider">
                        {data.couponCode}
                      </code>
                      <Button variant="outline" size="icon" onClick={copyCoupon} aria-label="Copiar cupom">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {qrDataUrl && (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={qrDataUrl}
                      alt={`QR Code para o cupom ${data.couponCode}`}
                      className="h-40 w-40 rounded-lg border bg-white p-2 shadow-sm sm:h-44 sm:w-44"
                    />
                    <p className="text-center text-[11px] text-muted-foreground">
                      Aponte a câmera<br />para escanear
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t bg-muted/20 p-4 sm:p-6">
                {data.status === "open" && data.available > 0 ? (
                  <Button
                    size="lg"
                    onClick={goToCheckout}
                    className="w-full gap-2 bg-brand text-white hover:bg-brand/90"
                  >
                    Entrar no grupo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="lg" disabled className="w-full">
                    {data.status !== "open" ? "Grupo encerrado" : "Sem vagas disponíveis"}
                  </Button>
                )}
              </div>
            </Card>

            <Card className="space-y-3 p-5">
              <p className="text-sm font-semibold">Compartilhar convite</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={shareNative}>
                  <Share2 className="mr-1.5 h-3.5 w-3.5" /> Compartilhar
                </Button>
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar link
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-emerald-500 text-white hover:bg-emerald-500/90"
                >
                  <a
                    href={`https://wa.me/?text=${whatsappMsg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                  </a>
                </Button>
              </div>
              <p className="break-all text-[11px] text-muted-foreground">{shareUrl}</p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}