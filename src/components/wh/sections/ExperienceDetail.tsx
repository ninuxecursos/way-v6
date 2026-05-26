/**
 * Seção rica reutilizável usada nas páginas individuais da Experiência Way Home
 * (Hospedagem, Transfer, Experiência, Café da manhã, Kits Especiais).
 *
 * Estrutura: banner, intro, benefícios (ícones), galeria, bloco de informações,
 * bloco institucional e CTA final. Todos os campos são editáveis pelo CMS.
 */
import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "../Reveal";
import { MediaLightbox } from "../MediaLightbox";
import { displayMediaUrl } from "@/lib/cdn";

type Benefit = { icon?: string; title?: string; text?: string };
type Info = { label?: string; value?: string };
type Institutional = { title?: string; text?: string; image?: string };
type GalleryEntry = string | { src?: string; url?: string; caption?: string };

type Data = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  banner?: string;
  intro?: string;
  benefits?: Benefit[];
  info?: Info[];
  institutional?: Institutional;
  gallery?: GalleryEntry[];
  ctaLabel?: string;
  ctaUrl?: string;
};

function Icon({ name, className }: { name?: string; className?: string }) {
  const map = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const Cmp = (name && map[name]) || Icons.Sparkles;
  return <Cmp className={className} />;
}

const VIDEO_RE = /\.(mp4|webm|mov|m4v|ogg|ogv)(\?|#|$)/i;

function normalizeGallery(items: GalleryEntry[] | undefined) {
  return (items ?? [])
    .map((it) => {
      if (!it) return null;
      if (typeof it === "string") return { url: it, caption: "" };
      const url = it.src || it.url || "";
      return url ? { url, caption: it.caption ?? "" } : null;
    })
    .filter((x): x is { url: string; caption: string } => !!x);
}

export function ExperienceDetail({ data }: { data?: Record<string, unknown> }) {
  const v = (data ?? {}) as Data;
  const benefits = v.benefits ?? [];
  const info = v.info ?? [];
  const gallery = normalizeGallery(v.gallery);
  const inst = v.institutional ?? {};
  const bannerUrl = v.banner ? displayMediaUrl(v.banner) : "";
  const bannerIsVideo = v.banner ? VIDEO_RE.test(v.banner) : false;
  const instImageUrl = inst.image ? displayMediaUrl(inst.image) : "";
  const instIsVideo = inst.image ? VIDEO_RE.test(inst.image) : false;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <article className="bg-background text-ink">
      {/* Banner */}
      <header className="relative isolate overflow-hidden">
        <div className="relative aspect-[16/9] md:aspect-[21/9] w-full">
          {v.banner ? (
            bannerIsVideo ? (
              <video
                src={bannerUrl}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <img
                src={bannerUrl}
                alt={v.title ?? ""}
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
              />
            )
          ) : (
            <div className="absolute inset-0 bg-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>
        <div className="container-wh -mt-32 md:-mt-48 relative pb-12 md:pb-20">
          <Reveal>
            {v.eyebrow && (
              <span className="eyebrow text-white/90">{v.eyebrow}</span>
            )}
            <h1 className="heading-display mt-3 text-4xl text-white md:text-6xl drop-shadow-lg">
              {v.title}
            </h1>
            {v.subtitle && (
              <p className="mt-4 max-w-2xl text-base text-white/85 md:text-lg">
                {v.subtitle}
              </p>
            )}
          </Reveal>
        </div>
      </header>

      {/* Intro + Info block */}
      {(v.intro || info.length > 0) && (
        <section className="container-wh py-12 md:py-20">
          <div className="grid gap-10 md:grid-cols-5">
            {v.intro && (
              <div className="md:col-span-3">
                <Reveal>
                  <p className="text-base leading-relaxed text-ink-soft md:text-lg">
                    {v.intro}
                  </p>
                </Reveal>
              </div>
            )}
            {info.length > 0 && (
              <aside className="md:col-span-2">
                <Reveal delay={0.1}>
                  <dl className="card-wh divide-y divide-border/60 overflow-hidden">
                    {info.map((row, i) => (
                      <div key={i} className="flex items-baseline justify-between gap-4 px-5 py-4">
                        <dt className="text-xs uppercase tracking-wider text-ink-soft">{row.label}</dt>
                        <dd className="text-sm font-medium text-ink text-right">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Reveal>
              </aside>
            )}
          </div>
        </section>
      )}

      {/* Benefits */}
      {benefits.length > 0 && (
        <section className="bg-muted/30 py-14 md:py-20">
          <div className="container-wh">
            <Reveal>
              <h2 className="heading-display text-3xl text-ink md:text-4xl">Benefícios inclusos</h2>
            </Reveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((b, i) => (
                <Reveal key={i} delay={i * 0.06}>
                  <div className="card-wh h-full p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon name={b.icon} className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold text-ink">{b.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="container-wh py-14 md:py-20">
          <Reveal>
            <h2 className="heading-display text-3xl text-ink md:text-4xl">Galeria</h2>
          </Reveal>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((item, i) => {
              const url = displayMediaUrl(item.url);
              const isVideo = VIDEO_RE.test(item.url);
              return (
              <Reveal key={i} delay={i * 0.05}>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  aria-label={isVideo ? "Ampliar vídeo" : "Ampliar imagem"}
                  className={`photo-vignette group block w-full cursor-zoom-in overflow-hidden ${i === 0 ? "lg:col-span-2 lg:row-span-2 aspect-[4/3]" : "aspect-square"}`}
                >
                  {isVideo ? (
                    <video
                      src={url}
                      muted
                      loop
                      playsInline
                      autoPlay
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={url}
                      alt={item.caption || ""}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                </button>
              </Reveal>
              );
            })}
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              to="/galeria"
              className="inline-flex items-center gap-2 rounded-full border border-line/60 px-5 py-2.5 text-sm font-medium text-ink-soft transition hover:border-line hover:text-ink"
            >
              Ver mais na galeria
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <MediaLightbox
            items={gallery.map((g) => ({ url: g.url, caption: g.caption }))}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onIndexChange={setLightboxIndex}
          />
        </section>
      )}

      {/* Institucional */}
      {(inst.title || inst.text || inst.image) && (
        <section className="bg-inverse text-inverse-foreground py-16 md:py-24">
          <div className="container-wh grid gap-10 md:grid-cols-2 md:items-center">
            {inst.image && (
              <Reveal>
                <div className="photo-vignette aspect-[4/5] overflow-hidden">
                  {instIsVideo ? (
                    <video src={instImageUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" />
                  ) : (
                    <img src={instImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
              </Reveal>
            )}
            <Reveal delay={0.1}>
              <div>
                {inst.title && (
                  <h2 className="heading-display text-3xl md:text-5xl text-white">{inst.title}</h2>
                )}
                {inst.text && (
                  <p className="mt-5 text-base leading-relaxed text-white/80 md:text-lg">
                    {inst.text}
                  </p>
                )}
                {v.ctaLabel && v.ctaUrl && (
                  <div className="mt-8">
                    <Link to={v.ctaUrl} className="btn-brand inline-flex">
                      {v.ctaLabel}
                    </Link>
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </article>
  );
}
