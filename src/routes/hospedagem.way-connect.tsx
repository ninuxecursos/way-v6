/**
 * Página individual da modalidade "Way Connect".
 * Lê os dados da modalidade real (products) — qualquer edição no admin reflete aqui.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Snowflake,
  Tv,
  Refrigerator,
  Bath,
  Sparkles,
  HeartHandshake,
  Users,
  CheckCircle2,
  MessageCircle,
  Instagram,
  Facebook,
  Music2,
  ShieldCheck,
  Coffee,
} from "lucide-react";
import { Header } from "@/components/wh/Header";
import { Footer } from "@/components/wh/Footer";
import { useFormatters, useLocale } from "@/components/i18n/LocaleProvider";
import { getModalityBySlug } from "@/repositories/products.repo";
import type { ModalityChoice } from "@/types/reservation";

const SLUG = "way-connect";
const HERO_IMG = "/wh/aru9eTRt206G3gmo9ggFw3VlmRM.webp";
const WHATSAPP_URL =
  "https://wa.me/5511992012731?text=" +
  encodeURIComponent("Olá! Tenho dúvidas sobre o Way Connect.");

const modalityQuery = (locale: string) =>
  queryOptions({
    queryKey: ["modality", SLUG, locale] as const,
    queryFn: async (): Promise<ModalityChoice> => {
      const m = await getModalityBySlug(SLUG, locale);
      if (!m) throw notFound();
      return m;
    },
    staleTime: 60_000,
  });

export const Route = createFileRoute("/hospedagem/way-connect")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(modalityQuery("pt-BR")),
  head: ({ loaderData }) => {
    const m = loaderData as ModalityChoice | undefined;
    const title = m?.name
      ? `${m.name} — Hospedagem oficial Tomorrowland Brasil`
      : "Way Connect — Hospedagem oficial Tomorrowland Brasil";
    const description =
      m?.description?.split("\n")[0] ??
      "Hospedagem compartilhada Way Home no Tomorrowland Brasil. Para quem vai sozinho, mas não quer viver isso sozinho.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: "/hospedagem/way-connect" },
        ...(m?.coverImageUrl
          ? [{ property: "og:image", content: m.coverImageUrl }]
          : []),
      ],
      links: [{ rel: "canonical", href: "/hospedagem/way-connect" }],
    };
  },
  component: WayConnectPage,
  errorComponent: () => (
    <div className="grid min-h-[60vh] place-items-center text-ink-soft">
      Não foi possível carregar esta hospedagem.
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-[60vh] place-items-center text-ink-soft">
      Modalidade não encontrada.
    </div>
  ),
});

function iconFor(label: string) {
  const s = label.toLowerCase();
  if (s.includes("pessoa") || s.includes("people")) return Users;
  if (s.includes("ar-cond") || s.includes("air")) return Snowflake;
  if (s.includes("tv")) return Tv;
  if (s.includes("frigobar") || s.includes("fridge") || s.includes("nevera")) return Refrigerator;
  if (s.includes("banheiro") || s.includes("bath") || s.includes("baño")) return Bath;
  if (s.includes("café") || s.includes("breakfast") || s.includes("desayuno")) return Coffee;
  if (s.includes("experiência") || s.includes("experience") || s.includes("social")) return Sparkles;
  if (s.includes("conex") || s.includes("amizade") || s.includes("friend")) return HeartHandshake;
  if (s.includes("acesso") || s.includes("área") || s.includes("areas")) return ShieldCheck;
  if (s.includes("cama") || s.includes("bed") || s.includes("roupa")) return BedDouble;
  return CheckCircle2;
}

function WayConnectPage() {
  const { locale } = useLocale();
  const { formatCurrency } = useFormatters();
  const { data: m } = useSuspenseQuery(modalityQuery(locale));

  const price = formatCurrency(m.priceCents, m.currency || "BRL");
  const highlights = m.highlights ?? [];

  return (
    <div className="min-h-screen bg-background text-ink">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-line/40">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${HERO_IMG})` }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background"
        />
        <div className="container-wh relative z-10 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            {(() => {
              const size = Math.max(16, Math.min(400, m.heroLogoSize || 40));
              return (
                <div
                  className="mx-auto mb-6 flex items-center justify-center text-brand"
                  style={{ height: size, width: size }}
                >
                  <img
                    src={m.heroLogoUrl || "/logos/wayhome-symbol-white.svg"}
                    alt="Way Home"
                    style={{ height: size, width: size }}
                    className="object-contain"
                  />
                </div>
              );
            })()}
            <span className="eyebrow mx-auto inline-flex items-center gap-2 text-brand">
              Way Connect · Hospedagem individual
            </span>
            <h1 className="heading-display mt-5 text-4xl leading-tight text-ink md:text-6xl">
              SUA CASA NO{" "}
              <span className="text-italic-brand italic text-brand">TOMORROWLAND</span>{" "}
              BRASIL 2025
            </h1>
            <p className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-base text-ink-soft md:text-lg">
              {m.description}
            </p>
            <Link
              to="/hospedagem/way-squad"
              className="mx-auto mt-5 inline-flex items-center gap-1.5 rounded-lg border border-line/60 px-4 py-2 text-xs font-medium text-ink-soft transition hover:border-line hover:text-ink"
            >
              Conhecer Way Squad
              <ArrowUpRight size={14} />
            </Link>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/reservation"
                search={{ modality: SLUG }}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-bold text-brand-foreground transition hover:brightness-110 hover:shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--brand)_70%,transparent)]"
              >
                Reservar agora
                <ArrowRight size={16} />
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-line px-6 py-3.5 text-sm font-bold text-ink transition hover:bg-white/[0.04]"
              >
                <MessageCircle size={16} />
                Tirar dúvidas no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTEÚDO + STICKY PRICE */}
      <section className="bg-background py-16 md:py-24">
        <div className="container-wh">
          <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
            {/* COLUNA ESQUERDA */}
            <div className="space-y-12">
              {/* O que está incluso */}
              <div>
                <span className="eyebrow text-brand">O que está incluso</span>
                <h2 className="heading-display mt-3 text-3xl text-ink md:text-4xl">
                  Tudo pra você viver o festival sem preocupação
                </h2>
                <p className="mt-4 text-ink-soft">{m.description?.split("\n").slice(1).join(" ")}</p>

                {/* Card destaque do quarto */}
                <div className="mt-8 flex items-start gap-5 rounded-2xl border border-line bg-card/60 p-6">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                    <BedDouble size={28} />
                  </div>
                  <div>
                    <h3 className="heading-display text-xl text-ink">
                      Quarto compartilhado masculino ou feminino
                    </h3>
                    <p className="mt-1 text-sm text-ink-soft">{m.description?.split("\n")[0]}</p>
                  </div>
                </div>

                {/* Grid de features */}
                <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
                  {highlights.map((h) => {
                    const Icon = iconFor(h);
                    return (
                      <li
                        key={h}
                        className="flex items-start gap-3 rounded-xl border border-line bg-card/40 p-4"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                          <Icon size={18} />
                        </span>
                        <span className="text-sm leading-snug text-ink/90">{h}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Por que escolher */}
              <div>
                <span className="eyebrow text-brand">Por quê</span>
                <h2 className="heading-display mt-3 text-3xl text-ink md:text-4xl">
                  Por que escolher o Way Connect?
                </h2>
                <div className="mt-8 grid gap-5 md:grid-cols-3">
                  {[
                    {
                      Icon: Users,
                      title: "Pra quem vai sozinho",
                      body: "Mas não quer viver o festival sozinho. Quarto compartilhado com gente da mesma vibe.",
                    },
                    {
                      Icon: HeartHandshake,
                      title: "Comunidade Way Home",
                      body: "Novas conexões e amizades durante toda a estadia, dentro e fora do festival.",
                    },
                    {
                      Icon: Sparkles,
                      title: "Conforto garantido",
                      body: "Ar-condicionado, TV, frigobar e banheiro no próprio quarto. Estrutura pensada pra descanso.",
                    },
                  ].map((c) => (
                    <div
                      key={c.title}
                      className="rounded-2xl border border-line bg-card/40 p-6 transition hover:border-line/70 hover:bg-card/60"
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand">
                        <c.Icon size={22} />
                      </span>
                      <h3 className="heading-display mt-4 text-lg text-ink">{c.title}</h3>
                      <p className="mt-2 text-sm text-ink-soft">{c.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CARD STICKY DE PREÇO */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-3xl border-2 border-brand bg-card p-7 shadow-[0_0_40px_-15px_color-mix(in_oklab,var(--brand)_55%,transparent)]">
                <span className="font-display inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                  <Sparkles size={11} /> Últimas vagas
                </span>
                <h3 className="heading-display mt-4 text-2xl text-ink">{m.name}</h3>
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-extrabold leading-none tracking-tight text-brand">
                    {price}
                  </span>
                  <span className="text-xs text-ink-soft">por pessoa</span>
                </div>
                {m.altPrice && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400">
                    {m.altPrice}
                  </div>
                )}
                <Link
                  to="/reservation"
                  search={{ modality: SLUG }}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-brand-foreground transition hover:brightness-110"
                >
                  Garantir minha vaga
                  <ArrowRight size={16} />
                </Link>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/[0.04]"
                >
                  <MessageCircle size={16} />
                  Falar no WhatsApp
                </a>
                <p className="mt-4 text-center text-[11px] text-ink-soft">
                  Pagamento em até 12x · Reserva confirmada após pagamento
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden border-y border-line/40 bg-card/30 py-20 md:py-28">
        <div className="container-wh relative z-10 text-center">
          <h2 className="heading-display text-3xl text-ink md:text-5xl">
            GARANTA SUA{" "}
            <span className="text-italic-brand italic text-brand">HOSPEDAGEM</span>
            <br className="hidden md:block" /> HOJE MESMO!
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-ink-soft">
            Vagas limitadas e por ordem de reserva.
          </p>
          <Link
            to="/reservation"
            search={{ modality: SLUG }}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-4 text-sm font-bold text-brand-foreground transition hover:brightness-110"
          >
            Reservar agora
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer interno */}
      <section className="border-b border-line/30 bg-background py-10">
        <div className="container-wh flex flex-col items-center gap-4 text-center">
          <img
            src="/logos/wayhome-slogan-white.svg"
            alt="Way Home"
            className="h-10 opacity-90"
          />
          <p className="max-w-xl text-xs text-ink-soft">
            Way Connect é parte da experiência oficial Way Home no Tomorrowland Brasil 2025.
          </p>
          <div className="mt-2 flex items-center gap-4 text-ink-soft">
            <a href="https://instagram.com/wayhomeoficial" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="transition hover:text-brand">
              <Instagram size={20} />
            </a>
            <a href="https://tiktok.com/@wayhomeoficial" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="transition hover:text-brand">
              <Music2 size={20} />
            </a>
            <a href="https://facebook.com/wayhomeoficial" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="transition hover:text-brand">
              <Facebook size={20} />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}