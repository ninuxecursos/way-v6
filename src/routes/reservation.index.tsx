import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listActiveModalities } from "@/repositories/products.repo";
import { getReservationContact, buildWhatsappUrl } from "@/lib/reservation-contact";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { ReservationShell } from "@/components/reservation/ReservationShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useReservation } from "@/hooks/use-reservation";
import { notifyError } from "@/lib/notify";
import { Check, Sparkles, Users, User, Heart, ArrowRight, MessageCircle, BadgePercent } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/payment-fees";
import type { ModalityChoice } from "@/types/reservation";
import { getGroupCouponPublic } from "@/lib/groups.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/reservation/")({
  validateSearch: (raw): { coupon?: string; modality?: string } => {
    const schema = z.object({
      coupon: z
        .string()
        .trim()
        .max(64)
        .regex(/^[A-Za-z0-9-]+$/)
        .optional(),
      modality: z
        .string()
        .trim()
        .max(80)
        .regex(/^[A-Za-z0-9_-]+$/)
        .optional(),
    });
    return schema.parse(raw ?? {});
  },
  head: () => ({
    meta: [
      { title: "Escolha sua modalidade — Way Home" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ModalityStep,
});

function kindIcon(kind: ModalityChoice["kind"]) {
  if (kind === "individual") return User;
  if (kind === "shared") return Users;
  if (kind === "couple") return Heart;
  return Sparkles;
}

function ModalityStep() {
  const navigate = useNavigate();
  const { state, setModality, setParticipant } = useReservation();
  const search = Route.useSearch();
  const { locale } = useLocale();
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [autoApplying, setAutoApplying] = useState<boolean>(
    Boolean(search.coupon || search.modality),
  );
  const fetchCoupon = useServerFn(getGroupCouponPublic);

  const { data, isLoading, error } = useQuery({
    queryKey: ["reservation", "modalities", locale],
    queryFn: () => listActiveModalities(locale),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (error) notifyError(error, "Não foi possível carregar as modalidades.");
  }, [error]);

  // Cupom Galera vindo da landing /grupo/$coupon — auto-aplica modalidade
  // compartilhada do produto correto e pré-preenche o cupom do membro.
  useEffect(() => {
    const code = search.coupon;
    if (!code || !data || data.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const preview = await fetchCoupon({ data: { coupon: code } });
        if (cancelled) return;
        if (preview.status !== "open" || preview.available <= 0) {
          toast.error("Este grupo não está mais disponível.");
          setAutoApplying(false);
          return;
        }
        const shared = data.find(
          (m) => m.kind === "shared" && m.productSlug === preview.productSlug,
        );
        if (!shared) {
          toast.error("Modalidade Galera deste cupom não está ativa.");
          setAutoApplying(false);
          return;
        }
        setModality(shared);
        setParticipant({
          name: state.participant?.name ?? "",
          email: state.participant?.email ?? "",
          whatsapp: state.participant?.whatsapp ?? "",
          cpf: state.participant?.cpf ?? "",
          city: state.participant?.city ?? "",
          gender: state.participant?.gender ?? "other",
          reservationType: shared.productSlug,
          quantity: 1,
          companions: [],
          groupCouponCode: preview.couponCode,
          isGroupHolder: false,
        });
        toast.success(`Cupom ${preview.couponCode} aplicado!`);
        navigate({ to: "/reservation/register" });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Cupom inválido.";
        toast.error(msg);
        setAutoApplying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.coupon, data]);

  // Deep-link da Home (?modality=slug) — auto-seleciona a modalidade e avança.
  // Cupom de grupo (?coupon=...) tem prioridade; só roda se não houver cupom.
  useEffect(() => {
    if (search.coupon) return;
    const slug = search.modality;
    if (!slug || !data || data.length === 0) return;
    const m = data.find((x) => x.productSlug === slug);
    if (!m) {
      setAutoApplying(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (m.checkoutMode === "whatsapp") {
          const contact = await getReservationContact();
          if (cancelled) return;
          const message = m.whatsappMessage || contact.whatsappCoupleMessage;
          const url = buildWhatsappUrl(contact.whatsappE164, message);
          window.open(url, "_blank", "noopener,noreferrer");
          setAutoApplying(false);
          return;
        }
        setModality(m);
        navigate({ to: "/reservation/register" });
      } catch (e) {
        if (!cancelled) {
          setAutoApplying(false);
          notifyError(e, "Não foi possível abrir a modalidade selecionada.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.modality, search.coupon, data]);

  const handleSelect = async (m: ModalityChoice) => {
    setBusy(m.productSlug);
    try {
      // Modalidade Casal: NÃO usa checkout — abre WhatsApp.
      if (m.checkoutMode === "whatsapp") {
        const contact = await getReservationContact();
        const message = m.whatsappMessage || contact.whatsappCoupleMessage;
        const url = buildWhatsappUrl(contact.whatsappE164, message);
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      setModality(m);
      navigate({ to: "/reservation/register" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <ReservationShell
      step="modality"
      title={t("reservation.chooseTitle")}
      subtitle={t("reservation.chooseSubtitle")}
    >
      {autoApplying ? (
        <Card className="flex items-center justify-center gap-3 p-10">
          <Sparkles className="h-5 w-5 animate-pulse text-brand" />
          <span className="text-sm text-muted-foreground">
            Aplicando cupom do grupo…
          </span>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-5 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[440px] w-full rounded-2xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma modalidade disponível no momento.
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {data.map((m) => {
            const Icon = kindIcon(m.kind);
            const isSelected = state.modality?.productSlug === m.productSlug;
            const isCouple = m.checkoutMode === "whatsapp";
            const isLoading = busy === m.productSlug;

            return (
              <Card
                key={m.productSlug}
                className={cn(
                  "group relative flex flex-col overflow-hidden border bg-card/80 backdrop-blur-sm",
                  "transition-all duration-300 will-change-transform",
                  "hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand/10 hover:border-brand/50",
                  m.recommended && "border-brand/60 shadow-lg shadow-brand/10 ring-1 ring-brand/30",
                  isSelected && "ring-2 ring-brand",
                )}
              >
                {m.recommended ? (
                  <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                    <Sparkles className="h-3 w-3" />
                    {t("reservation.recommended")}
                  </div>
                ) : null}

                <div
                  className={cn(
                    "relative h-32 overflow-hidden",
                    m.kind === "individual" && "bg-gradient-to-br from-sky-500/30 via-brand/15 to-transparent",
                    m.kind === "shared" && "bg-gradient-to-br from-brand/40 via-violet-500/20 to-transparent",
                    m.kind === "couple" && "bg-gradient-to-br from-rose-500/30 via-brand/20 to-transparent",
                    m.kind === "other" && "bg-gradient-to-br from-muted to-transparent",
                  )}
                >
                  {m.coverImageUrl ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-70 transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url(${m.coverImageUrl})` }}
                      aria-hidden
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" aria-hidden />
                  <div className="absolute bottom-3 left-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-card text-brand shadow-md ring-1 ring-border">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="space-y-1">
                    <h3 className="font-display text-xl font-extrabold leading-tight">{m.name}</h3>
                    {m.description ? (
                      <p className="text-sm text-muted-foreground">{m.description}</p>
                    ) : null}
                  </div>

                  <div>
                    {isCouple ? (
                      <p className="text-2xl font-black text-brand">
                        Sob consulta
                        <span className="ml-1 block text-xs font-medium text-muted-foreground">
                          Valor personalizado via WhatsApp
                        </span>
                      </p>
                    ) : (
                      <>
                        <p className="text-3xl font-black tracking-tight text-foreground">
                          {formatBRL(m.priceCents, m.currency)}
                          <span className="ml-1 text-xs font-medium text-muted-foreground">
                            por pessoa
                          </span>
                        </p>
                        {m.economyLabel ? (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <BadgePercent className="h-3 w-3" />
                            {m.economyLabel}
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>

                  <ul className="flex-1 space-y-2 text-sm text-muted-foreground">
                    {m.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelect(m)}
                    disabled={isLoading}
                    className={cn(
                      "w-full gap-2 transition-all",
                      isCouple
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : m.recommended
                          ? "bg-brand text-white hover:bg-brand/90"
                          : "",
                    )}
                    variant={isCouple || m.recommended ? "default" : "outline"}
                    size="lg"
                  >
                    {isCouple ? (
                      <>
                        <MessageCircle className="h-4 w-4" />
                         {t("sections.lodging.talkOnWhatsapp")}
                      </>
                    ) : isSelected ? (
                      <>
                         {t("reservation.continueWithThis")}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                         {t("reservation.select")}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        {t("reservation.pixHint")}
      </p>
    </ReservationShell>
  );
}
