/**
 * Seção de Pacotes de Hospedagem.
 * Exibe as opções de quartos e camping com preços e inclusões.
 */
import { Reveal } from "../Reveal";
import { ArrowRight, BadgePercent, Check, Heart, Loader2, MessageCircle, Sparkles, User as UserIcon, Users } from "lucide-react";
import { useT, useFormatters, useLocale } from "@/components/i18n/LocaleProvider";
import { EditableText } from "@/components/admin/visual-edit/EditableText";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { listActiveModalities } from "@/repositories/products.repo";
import type { ModalityChoice } from "@/types/reservation";

// Definição do tipo para os pacotes
type Pkg = {
  name: string;
  capacity: string;
  price: string;
  priceLabel: string;
  badge: string;
  badgeTone: "soldout" | "last" | "available";
  includes: string[];
  bathroom: string;
  altPrice?: string;
  slug?: string;
  recommended?: boolean;
  ctaLabel?: string;
  isWhatsapp?: boolean;
  kind?: "individual" | "shared" | "couple" | "other";
};

/** Chip discreto para disponibilidade (apenas soldout / últimas vagas). */
function StatusChip({ tone, children }: { tone: Pkg["badgeTone"]; children: React.ReactNode }) {
  const styles =
    tone === "soldout"
      ? "border-white/15 text-ink-soft bg-white/[0.03]"
      : "border-brand/50 text-brand bg-brand/10";
  return (
    <span
      className={`font-display inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] ${styles}`}
    >
      <span className={`h-1 w-1 rounded-full ${tone === "soldout" ? "bg-white/40" : "bg-brand"}`} />
      {children}
    </span>
  );
}

function KindIcon({ kind, className }: { kind?: Pkg["kind"]; className?: string }) {
  const Icon = kind === "couple" ? Heart : kind === "shared" ? Users : UserIcon;
  return <Icon className={className} aria-hidden />;
}

// Fallback helper: useT() returns the key when translation is missing.
// This unwraps to the provided default so we never render raw i18n keys.
function tx(value: string, fallback: string): string {
  if (!value) return fallback;
  // missing translations come back as the dotted key itself (e.g. "sections.lodging.onRequest").
  // A real translation never contains a dot AND no spaces AND looks like an i18n key path.
  if (/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)+$/.test(value)) return fallback;
  return value;
}

export function Hospedagem({ data }: { data?: Record<string, unknown> }) {
  const t = useT();
  const { locale } = useLocale();
  const { formatCurrency } = useFormatters();
  const eyebrow = (data?.eyebrow as string | undefined) ?? t("sections.lodging.eyebrow");
  const titleA = (data?.titleA as string | undefined) ?? t("sections.lodging.titleA");
  const titleB = (data?.titleB as string | undefined) ?? t("sections.lodging.titleB");
  const titleC = (data?.titleC as string | undefined) ?? t("sections.lodging.titleC");
  const desc = (data?.desc as string | undefined) ?? t("sections.lodging.desc");

  // Sincroniza com produtos reais cadastrados no admin (type = reservation_modality).
  const { data: modalities, isLoading } = useQuery({
    queryKey: ["home", "modalities", locale],
    queryFn: () => listActiveModalities(locale),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const overridePkgs = data?.packages as Pkg[] | undefined;
  const PKGS: Pkg[] = Array.isArray(overridePkgs) && overridePkgs.length > 0
    ? overridePkgs
    : (modalities ?? []).map((m) => modalityToPkg(m, { t, formatCurrency, locale }));
  return (
    <section id="hospedagem" className="relative bg-background py-20 md:py-32">
      <div className="container-wh">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <EditableText path="eyebrow" value={eyebrow} as="span" className="eyebrow mx-auto" />
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="heading-display mt-5 text-4xl text-ink md:text-6xl">
              <EditableText path="titleA" value={titleA} as="span" />
              <EditableText path="titleB" value={titleB} as="span" className="text-italic-brand italic" />
              <EditableText path="titleC" value={titleC} as="span" />
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <EditableText path="desc" value={desc} as="p" singleLine={false} className="mt-6 text-base text-ink-soft md:text-lg" />
          </Reveal>
        </div>

        <div className={`mt-12 grid items-stretch gap-5 md:gap-6 ${PKGS.length >= 3 ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2"}`}>
          {isLoading && PKGS.length === 0 && (
            <div className="col-span-full flex items-center justify-center py-16 text-ink-soft">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("sections.lodging.loading") || "Carregando pacotes..."}
            </div>
          )}
          {PKGS.map((p, i) => {
            const isRec = !!p.recommended;
            const isSold = p.badgeTone === "soldout";
            const isWhats = !!p.isWhatsapp;
            const allItems = [...p.includes, ...(p.bathroom && !isRec ? [p.bathroom] : [])];
            return (
              <Reveal key={p.slug ?? p.name} delay={i * 0.1}>
                <article
                  className={`group relative flex h-full flex-col rounded-3xl p-7 md:p-8 transition-all duration-300 motion-safe:hover:-translate-y-1.5 ${
                    isRec
                      ? "border-2 border-brand bg-card shadow-[0_0_40px_-15px_color-mix(in_oklab,var(--brand)_55%,transparent)]"
                      : "border border-line bg-card/60 hover:border-line/80 hover:bg-card"
                  }`}
                >
                  {isRec && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-brand-foreground shadow-lg">
                      <Sparkles size={11} className="shrink-0" />
                      {tx(t("sections.lodging.recommended"), "Recomendado")}
                    </div>
                  )}

                  {/* Ícone + status */}
                  <div className="flex items-start justify-between">
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-2xl transition-colors ${
                        isRec ? "bg-brand/10 text-brand" : "bg-white/[0.04] text-ink-soft group-hover:bg-white/[0.07]"
                      }`}
                    >
                      <KindIcon kind={p.kind} className="h-6 w-6" />
                    </div>
                    {(isSold || (p.badgeTone === "last" && !isRec)) && (
                      <StatusChip tone={p.badgeTone}>{p.badge}</StatusChip>
                    )}
                  </div>

                  {/* Título + descrição */}
                  <h3 className="heading-display mt-6 text-2xl leading-tight text-ink">{p.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.capacity}</p>

                  {/* Preço */}
                  <div className="mt-7">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span
                        className={`font-display break-words text-4xl font-extrabold leading-none tracking-tight ${
                          isRec || isWhats ? "text-brand" : "text-ink"
                        }`}
                      >
                        {p.price}
                      </span>
                      <span className="text-xs text-ink-soft">{p.priceLabel}</span>
                    </div>
                    {p.bathroom && isRec && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400">
                        <BadgePercent size={14} className="shrink-0" />
                        {p.bathroom}
                      </div>
                    )}
                    {p.altPrice && (
                      <p className="mt-2 text-[0.7rem] text-ink-soft">{p.altPrice}</p>
                    )}
                  </div>

                  {/* Lista de inclusos */}
                  <ul className="mt-7 space-y-3.5 flex-grow">
                    {allItems.map((item) => (
                      <li
                        key={item}
                        className={`flex items-start gap-3 text-sm leading-relaxed ${
                          isRec ? "text-ink/90" : "text-ink-soft"
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                            isRec ? "bg-brand/15 text-brand" : "bg-white/[0.06] text-brand"
                          }`}
                        >
                          <Check size={12} strokeWidth={3} />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="mt-9">
                    <Link
                      to={
                        p.slug === "way-connect"
                          ? "/hospedagem/way-connect"
                          : p.slug === "way-squad"
                            ? "/hospedagem/way-squad"
                            : "/reservation"
                      }
                      search={
                        p.slug === "way-connect" || p.slug === "way-squad"
                          ? undefined
                          : p.slug
                            ? { modality: p.slug }
                            : undefined
                      }
                      aria-disabled={isSold}
                      className={`group/btn flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold transition-all active:scale-[0.98] ${
                        isSold
                          ? "pointer-events-none border border-line text-ink-soft opacity-60"
                          : isWhats
                            ? "bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-[0_8px_30px_-8px_rgba(16,185,129,0.45)]"
                            : isRec
                              ? "bg-brand text-brand-foreground hover:brightness-110 hover:shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--brand)_70%,transparent)]"
                              : "border border-line text-ink hover:bg-inverse hover:text-inverse-foreground"
                      }`}
                    >
                      {isWhats && <MessageCircle size={16} className="shrink-0" />}
                      <span>
                        {p.ctaLabel ?? (isSold
                          ? tx(t("sections.lodging.exhausted"), "Esgotado")
                          : tx(t("sections.lodging.book"), "Reservar"))}
                      </span>
                      {!isWhats && !isSold && (
                        <ArrowRight size={16} className="shrink-0 transition-transform group-hover/btn:translate-x-0.5" />
                      )}
                    </Link>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ----- helpers -----

function modalityToPkg(
  m: ModalityChoice,
  opts: { t: (k: string) => string; formatCurrency: (cents: number, currency?: string) => string; locale: string },
): Pkg {
  const { t, formatCurrency } = opts;
  const isWhats = m.checkoutMode === "whatsapp";
  const soldOut = m.maxPerOrder === 0;
  const badgeTone: Pkg["badgeTone"] = soldOut ? "soldout" : m.recommended ? "last" : "available";
  const badge = soldOut
    ? tx(t("sections.lodging.soldOut"), "Esgotado")
    : m.recommended
      ? tx(t("sections.lodging.lastSpots"), "Últimas vagas")
      : tx(t("sections.lodging.available"), "Disponível");
  const price = isWhats || m.priceCents <= 0
    ? tx(t("sections.lodging.onRequest"), "Sob consulta")
    : formatCurrency(m.priceCents, m.currency || "BRL");
  const capacity = m.description || (m.kind === "couple" ? "Casal" : m.kind === "shared" ? "Compartilhado" : "Individual");
  return {
    slug: m.productSlug,
    name: m.name,
    capacity,
    priceLabel: isWhats ? tx(t("sections.lodging.perCouple"), "por casal") : tx(t("sections.lodging.perPerson"), "por pessoa"),
    price,
    badge,
    badgeTone,
    includes: (m.highlights && m.highlights.length > 0) ? m.highlights : [m.description].filter(Boolean) as string[],
    bathroom: m.economyLabel || "",
    altPrice: m.altPrice || undefined,
    recommended: m.recommended,
    ctaLabel: isWhats ? tx(t("sections.lodging.talkOnWhatsapp"), "Falar no WhatsApp") : undefined,
    isWhatsapp: isWhats,
    kind: m.kind,
  };
}
