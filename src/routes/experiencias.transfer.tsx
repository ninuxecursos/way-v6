/**
 * Página "Transfer Way Home" — layout fiel à arte oficial.
 * Todo o conteúdo (textos, imagens, benefícios, checklist, institucional)
 * vem do CMS: page slug = "transfer", section type = "experience_detail".
 * Defaults preservam a página caso o CMS esteja vazio.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Armchair, Snowflake, Wifi, Usb, ShieldCheck, CheckCircle2, Bus,
  Instagram, Facebook, Music2, MapPin, Clock, AlertTriangle, Star, ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { Header } from "@/components/wh/Header";
import { Footer } from "@/components/wh/Footer";
import { MediaLightbox } from "@/components/wh/MediaLightbox";
import { getPageSections } from "@/lib/home.functions";
import { getRequestLocale } from "@/lib/locale.functions";

const ICON_MAP: Record<string, LucideIcon> = {
  Armchair, Snowflake, Wifi, Usb, ShieldCheck, CheckCircle2, Bus,
  MapPin, Clock, AlertTriangle, Star,
};
function pickIcon(name?: string): LucideIcon {
  if (!name) return CheckCircle2;
  return ICON_MAP[name] ?? CheckCircle2;
}

const DEFAULT_HERO_IMG = "/wh/transfer/hero.webp";
const DEFAULT_GALLERY = [
  { src: "/wh/transfer/int1.webp", caption: "Conforto do início ao fim" },
  { src: "/wh/transfer/int2.webp", caption: "Viaje com quem vai na mesma vibe" },
  { src: "/wh/transfer/int3.webp", caption: "Carregue sua energia durante a viagem" },
];
const DEFAULT_FEATURES = [
  { icon: "Armchair", title: "Poltronas Confortáveis", text: "" },
  { icon: "Snowflake", title: "Ar Condicionado", text: "" },
  { icon: "Wifi", title: "Wi-Fi a Bordo", text: "" },
  { icon: "Usb", title: "Carregador USB", text: "" },
  { icon: "ShieldCheck", title: "Segurança Garantida", text: "" },
];
const DEFAULT_CHECKLIST = [
  { label: "", value: "Embarques em pontos estratégicos" },
  { label: "", value: "Ônibus confortável e moderno" },
  { label: "", value: "Equipe de apoio durante toda a viagem" },
  { label: "", value: "Pontualidade pra você aproveitar mais" },
  { label: "", value: "Viagem tranquila do início ao fim" },
];

type GalleryItem = { src: string; caption?: string };
type Benefit = { icon?: string; title: string; text?: string };
type InfoItem = { label?: string; value: string };
type Institutional = { image?: string; title?: string; text?: string };
interface TransferContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string;
  banner: string;
  gallery: GalleryItem[];
  benefits: Benefit[];
  info: InfoItem[];
  institutional: Institutional;
  ctaLabel: string;
  ctaUrl: string;
}

function normalizeGallery(raw: unknown): GalleryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((it) => {
      if (typeof it === "string") return { src: it } as GalleryItem;
      if (it && typeof it === "object") {
        const o = it as Record<string, unknown>;
        const src = (o.src ?? o.image ?? o.url) as string | undefined;
        if (!src) return null;
        return { src, caption: (o.caption ?? o.label ?? "") as string };
      }
      return null;
    })
    .filter(Boolean) as GalleryItem[];
}

function buildContent(raw: Record<string, unknown> | null): TransferContent {
  const r = raw ?? {};
  const benefits = Array.isArray(r.benefits) && r.benefits.length
    ? (r.benefits as Benefit[])
    : DEFAULT_FEATURES;
  const gal = normalizeGallery(r.gallery);
  const info = Array.isArray(r.info) && r.info.length
    ? (r.info as InfoItem[])
    : DEFAULT_CHECKLIST;
  return {
    eyebrow: (r.eyebrow as string) || "Transfer Way Home",
    title: (r.title as string) || "VÁ TRANQUILO. VOLTE MELHOR.",
    subtitle: (r.subtitle as string) || "Translado seguro e confortável para você curtir cada momento e voltar com boas histórias.",
    intro: (r.intro as string) || "",
    banner: (r.banner as string) || DEFAULT_HERO_IMG,
    gallery: gal.length ? gal : DEFAULT_GALLERY,
    benefits,
    info,
    institutional: (r.institutional as Institutional) || {},
    ctaLabel: (r.ctaLabel as string) || "",
    ctaUrl: (r.ctaUrl as string) || "",
  };
}

export const Route = createFileRoute("/experiencias/transfer")({
  loader: async () => {
    try {
      const locale = await getRequestLocale();
      const bundle = await getPageSections({ data: { slug: "transfer", locale } });
      const sec = bundle.sections.find((s) => s.type === "experience_detail");
      const raw = sec ? (JSON.parse(sec.data) as Record<string, unknown>) : null;
      return { content: buildContent(raw), page: bundle.page };
    } catch (e) {
      console.error("[transfer/loader]", e);
      return { content: buildContent(null), page: null };
    }
  },
  head: ({ loaderData }) => {
    const c = loaderData?.content ?? buildContent(null);
    const HERO_IMG = c.banner;
    return {
    meta: [
      { title: "Transfer Way Home — Translado oficial Tomorrowland Brasil" },
      {
        name: "description",
        content: loaderData?.page?.description ||
          "Translado seguro e confortável para o Tomorrowland Brasil. Ônibus moderno com Wi-Fi, ar-condicionado, carregador USB e equipe de apoio durante toda a viagem.",
      },
      { property: "og:type", content: "article" },
      { property: "og:title", content: "Transfer Way Home — Translado oficial Tomorrowland Brasil" },
      {
        property: "og:description",
        content: "Vá tranquilo. Volte melhor. Translado oficial Way Home com conforto, segurança e pontualidade.",
      },
      { property: "og:image", content: HERO_IMG },
      { property: "og:url", content: "/experiencias/transfer" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Transfer Way Home" },
      { name: "twitter:description", content: "Translado oficial Way Home para o Tomorrowland Brasil." },
      { name: "twitter:image", content: HERO_IMG },
    ],
    links: [
      { rel: "canonical", href: "/experiencias/transfer" },
      { rel: "preload", as: "image", href: HERO_IMG, fetchpriority: "high" } as any,
    ],
  };
  },
  component: TransferPage,
});

function CompassMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 1 13.6 9.5 22 12 13.6 14.5 12 23 10.4 14.5 2 12 10.4 9.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function splitTitle(title: string): { top: string; bottom: string } {
  // Mantém o efeito "primeira linha branca, segunda linha magenta".
  // Aceita "TOP. BOTTOM" ou "TOP | BOTTOM" ou quebra na metade.
  const t = title.trim();
  const dot = t.indexOf(". ");
  if (dot > 0 && dot < t.length - 2) {
    return { top: t.slice(0, dot + 1), bottom: t.slice(dot + 2) };
  }
  const pipe = t.indexOf("|");
  if (pipe > 0) return { top: t.slice(0, pipe).trim(), bottom: t.slice(pipe + 1).trim() };
  return { top: t, bottom: "" };
}

function TransferPage() {
  const { content: c } = Route.useLoaderData() as { content: TransferContent };
  const { top, bottom } = splitTitle(c.title);
  const HERO_IMG = c.banner;
  const features: Benefit[] = c.benefits.slice(0, 5);
  const gallery: GalleryItem[] = c.gallery.slice(0, 3);
  const checklist: InfoItem[] = c.info;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header variant="dark" />
      <main className="flex-1">
        {/* ============== HERO ============== */}
        <section className="relative overflow-hidden bg-[oklch(0.06_0.005_20)]">
          {/* glow magenta de fundo */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 -right-40 h-[640px] w-[640px] rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(closest-side, var(--brand), transparent)" }}
          />
          <div className="container-wh relative py-14 md:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
              {/* coluna texto */}
              <div className="relative">
                <div className="mb-6 flex items-center gap-2 text-primary">
                  <CompassMark className="h-7 w-7" />
                  <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
                    way<span className="text-primary">home.</span>
                  </span>
                </div>

                <h1 className="font-display text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
                  <span className="block text-foreground">{top}</span>
                  {bottom && <span className="mt-2 block text-primary">{bottom}</span>}
                </h1>

                <p className="mt-6 max-w-md text-base text-ink-soft sm:text-lg">
                  {c.subtitle}
                </p>

                <div className="mt-8 flex items-center gap-4">
                  <div className="h-px flex-1 bg-primary/50" />
                  <CompassMark className="h-4 w-4 text-primary" />
                  <div className="h-px flex-1 bg-primary/50" />
                </div>
                {c.ctaLabel && c.ctaUrl && (
                  <div className="mt-8">
                    <a href={c.ctaUrl} className="btn-brand inline-block">{c.ctaLabel}</a>
                  </div>
                )}
              </div>

              {/* coluna imagem */}
              <div className="relative">
                <div
                  className="overflow-hidden rounded-2xl ring-1 ring-white/5"
                  style={{
                    maskImage:
                      "radial-gradient(120% 100% at 60% 50%, black 70%, transparent 100%)",
                    WebkitMaskImage:
                      "radial-gradient(120% 100% at 60% 50%, black 70%, transparent 100%)",
                  }}
                >
                  <img
                    src={HERO_IMG}
                    alt="Ônibus oficial Way Home — translado Tomorrowland Brasil"
                    width={1240}
                    height={1000}
                    fetchPriority="high"
                    decoding="async"
                    className="block h-auto w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============== FEATURES BAR ============== */}
        <section className="bg-[oklch(0.06_0.005_20)] pb-10">
          <div className="container-wh">
            <div className="rounded-2xl border border-primary/20 bg-[oklch(0.10_0.006_20)] p-4 sm:p-6 ring-1 ring-white/5">
              <ul className="grid grid-cols-2 gap-y-6 sm:grid-cols-3 md:grid-cols-5">
                {features.map((b, i) => {
                  const Icon = pickIcon(b.icon);
                  return (
                    <li
                      key={`${b.title}-${i}`}
                      className={[
                        "flex flex-col items-center gap-3 px-2 text-center",
                        i > 0 ? "md:border-l md:border-primary/25" : "",
                      ].join(" ")}
                    >
                      <Icon className="h-9 w-9 text-primary" strokeWidth={1.6} aria-hidden />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/90 leading-tight">
                        {b.title}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* ============== GALERIA 3 IMAGENS ============== */}
        <section className="bg-[oklch(0.06_0.005_20)] py-6">
          <div className="container-wh">
            <div className="grid gap-4 md:grid-cols-3">
              {gallery.map(({ src, caption }, i) => (
                <button
                  type="button"
                  key={src}
                  onClick={() => setLightboxIndex(i)}
                  aria-label="Ampliar imagem"
                  className="group relative cursor-zoom-in overflow-hidden rounded-xl ring-1 ring-white/10 md:[clip-path:polygon(0_0,100%_0,94%_100%,6%_100%)] md:first:[clip-path:polygon(0_0,100%_0,94%_100%,0_100%)] md:last:[clip-path:polygon(0_0,100%_0,100%_100%,6%_100%)]"
                  style={{ aspectRatio: "4 / 3" }}
                >
                  <img
                    src={src}
                    alt={caption || ""}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[oklch(0.06_0.005_20)] via-[oklch(0.06_0.005_20/0.6)] to-transparent pt-12">
                      <div className="m-3 rounded-md bg-primary/85 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground sm:text-sm">
                        {caption}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Link
                to="/galeria"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white"
              >
                Ver mais na galeria
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <MediaLightbox
              items={gallery.map((g) => ({ url: g.src, caption: g.caption }))}
              index={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
              onIndexChange={setLightboxIndex}
            />
          </div>
        </section>

        {/* ============== CARD TRANSLADO + CHECKLIST ============== */}
        <section className="bg-[oklch(0.06_0.005_20)] py-10 md:py-14">
          <div className="container-wh">
            <div className="grid items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              {/* card translado */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-primary/30 bg-[oklch(0.10_0.006_20)] p-8 text-center ring-1 ring-white/5">
                <Bus className="mb-4 h-12 w-12 text-primary" strokeWidth={1.5} aria-hidden />
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  {c.institutional.title || (<>TRANSLADO <span className="block text-primary font-black">WAY HOME</span></>)}
                </h2>
                <p className="mt-4 max-w-xs text-xs uppercase tracking-[0.16em] text-ink-soft">
                  {c.institutional.text || "Ida e volta com conforto, segurança e pontualidade para você aproveitar cada segundo."}
                </p>
              </div>

              {/* checklist */}
              <div className="rounded-2xl border border-primary/30 bg-[oklch(0.10_0.006_20)] p-6 sm:p-8 ring-1 ring-white/5">
                <ul className="divide-y divide-primary/20">
                  {checklist.map((item, i) => (
                    <li key={`${item.value}-${i}`} className="flex items-center gap-4 py-3.5">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                      <span className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground/90 sm:text-[0.95rem]">
                        {item.value || item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ============== RODAPÉ INTERNO DE MARCA ============== */}
        <section className="bg-[oklch(0.06_0.005_20)] pb-14">
          <div className="container-wh">
            <div className="rounded-2xl border border-primary/30 bg-[oklch(0.10_0.006_20)] p-6 sm:p-8 ring-1 ring-white/5">
              <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
                <div className="flex items-center gap-3">
                  <CompassMark className="h-9 w-9 text-primary" />
                  <div>
                    <div className="font-display text-2xl font-semibold leading-none tracking-tight">
                      way<span className="text-primary">home.</span>
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-ink-soft">
                      o destino é você.
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 sm:items-end">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                      Siga a Wayhome:
                    </span>
                    <a
                      href="https://instagram.com/wayhomeoficial"
                      aria-label="Instagram Way Home"
                      className="rounded-full p-1.5 text-foreground/90 transition-colors hover:text-primary"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                    <a
                      href="https://tiktok.com/@wayhomeoficial"
                      aria-label="TikTok Way Home"
                      className="rounded-full p-1.5 text-foreground/90 transition-colors hover:text-primary"
                    >
                      <Music2 className="h-5 w-5" />
                    </a>
                    <a
                      href="https://facebook.com/wayhomeoficial"
                      aria-label="Facebook Way Home"
                      className="rounded-full p-1.5 text-foreground/90 transition-colors hover:text-primary"
                    >
                      <Facebook className="h-5 w-5" />
                    </a>
                  </div>
                  <a
                    href="https://wayhomeoficial.com.br"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-primary hover:underline"
                  >
                    wayhomeoficial.com.br
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
