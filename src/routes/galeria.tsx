/**
 * Página Galeria — hero slider, carrossel de vídeos 9:16 e catálogo de fotos.
 * Todo conteúdo é configurável em /admin/settings/gallery.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Camera, Play, X } from "lucide-react";
import { Header } from "@/components/wh/Header";
import { Footer } from "@/components/wh/Footer";
import {
  getGallery,
  normalizeMediaList,
  type GalleryConfig,
  type GalleryMediaItem,
  type GalleryVideo,
} from "@/lib/gallery.functions";
import { useT } from "@/components/i18n/LocaleProvider";

export const Route = createFileRoute("/galeria")({
  loader: async () => {
    try {
      const { json } = await getGallery();
      return { gallery: JSON.parse(json) as Partial<GalleryConfig> };
    } catch {
      return { gallery: {} as Partial<GalleryConfig> };
    }
  },
  head: () => ({
    meta: [
      { title: "Galeria — Way Home Tomorrowland Brasil" },
      {
        name: "description",
        content:
          "Fotos e vídeos da experiência Way Home no Tomorrowland Brasil. Suítes, áreas comuns, festas e momentos inesquecíveis.",
      },
      { property: "og:title", content: "Galeria — Way Home" },
      {
        property: "og:description",
        content: "Mergulhe na atmosfera Way Home através das nossas fotos e vídeos.",
      },
    ],
    links: [{ rel: "canonical", href: "/galeria" }],
  }),
  component: GaleriaPage,
});

function resolveConfig(
  partial: Partial<GalleryConfig> | undefined,
  t: (key: string) => string,
): GalleryConfig {
  const p = partial ?? {};
  const heroSlides = normalizeMediaList(p.hero?.slides ?? []).filter((s) => s.visible !== false);
  const photoItems = normalizeMediaList(p.photos?.items ?? []).filter((s) => s.visible !== false);
  // Aceita tanto o shape legado (GalleryVideo: {src,poster,title})
  // quanto o novo (GalleryMediaItem: {url,kind,visible,alt}).
  const rawVideoItems = (p.videos?.items ?? []) as unknown[];
  const manualVideos: GalleryVideo[] = rawVideoItems
    .map((it, idx): GalleryVideo | null => {
      if (!it || typeof it !== "object") return null;
      const o = it as Record<string, unknown>;
      if (o.visible === false) return null;
      const url =
        (typeof o.src === "string" && o.src) ||
        (typeof o.url === "string" && o.url) ||
        "";
      if (!url) return null;
      const poster =
        (typeof o.poster === "string" && o.poster) || url;
      const title =
        (typeof o.title === "string" && o.title) ||
        (typeof o.alt === "string" && o.alt) ||
        `Vídeo ${idx + 1}`;
      const id = (typeof o.id === "string" && o.id) || `v-${idx}-${url}`;
      return { id, title, poster, src: url, visible: true };
    })
    .filter((v): v is GalleryVideo => !!v);

  // Auto-popula o carrossel de vídeos com TODOS os vídeos enviados nas
  // outras abas (hero/fotos) — assim, basta o admin enviar um .mp4 na galeria
  // que ele aparece automaticamente abaixo do hero. Mantém também os vídeos
  // cadastrados manualmente em "videos.items", evitando duplicidade por src/poster.
  const seen = new Set<string>(
    manualVideos.flatMap((v) => [v.src, v.poster].filter((x): x is string => !!x)),
  );
  const autoVideos: GalleryVideo[] = [...heroSlides, ...photoItems]
    .filter((m) => m.kind === "video")
    .filter((m) => !seen.has(m.url) && (seen.add(m.url), true))
    .map((m, i) => ({
      id: `auto-${i}-${m.url}`,
      title: m.alt || `Vídeo ${i + 1}`,
      poster: m.url,
      src: m.url,
      visible: true,
    }));

  return {
    hero: {
      eyebrow: p.hero?.eyebrow || t("gallery.hero.eyebrow"),
      title: p.hero?.title || t("gallery.hero.title"),
      titleHighlight: p.hero?.titleHighlight || t("gallery.hero.titleHighlight"),
      subtitle: p.hero?.subtitle || t("gallery.hero.subtitle"),
      // Exibe somente o que está salvo no admin (sem fallback de mídia hardcoded).
      slides: heroSlides,
    },
    videos: {
      eyebrow: p.videos?.eyebrow || t("gallery.videos.eyebrow"),
      title: p.videos?.title || t("gallery.videos.title"),
      subtitle: p.videos?.subtitle || t("gallery.videos.subtitle"),
      items: [...manualVideos, ...autoVideos],
    },
    photos: {
      eyebrow: p.photos?.eyebrow || t("gallery.photos.eyebrow"),
      title: p.photos?.title || t("gallery.photos.title"),
      subtitle: p.photos?.subtitle || t("gallery.photos.subtitle"),
      items: photoItems,
    },
  };
}

function GaleriaPage() {
  const { gallery } = Route.useLoaderData();
  const t = useT();
  const cfg = resolveConfig(gallery, t);
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <HeroSlider hero={cfg.hero} />
        {cfg.videos.items.length > 0 && <VideoSection videos={cfg.videos} />}
        {cfg.photos.items.length > 0 && <PhotoCatalog photos={cfg.photos} />}
      </main>
      <Footer />
    </div>
  );
}

function HeroSlider({ hero }: { hero: GalleryConfig["hero"] }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const slides = hero.slides;
  const total = slides.length;

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % total), 5500);
    return () => clearInterval(t);
  }, [total]);

  const go = (delta: number) => setIndex((i) => (i + delta + total) % total);

  return (
    <section className="relative h-[90vh] min-h-[560px] w-full overflow-hidden bg-black">
      {total === 0 && (
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black" />
      )}
      {slides.map((item, i) => (
        <div
          key={item.url + i}
          className="absolute inset-0 transition-opacity duration-1000 ease-out"
          style={{ opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
        >
          {item.kind === "video" ? (
            <video
              src={item.url}
              autoPlay
              muted
              loop
              playsInline
              preload={i === 0 ? "auto" : "metadata"}
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={item.url}
              alt={item.alt ?? ""}
              className="h-full w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
        </div>
      ))}

      <div className="absolute inset-x-0 bottom-0 z-10 pb-16 sm:pb-24">
        <div className="container-wh px-20 md:px-32">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-md">
            <Camera size={12} /> {hero.eyebrow}
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold leading-[1.05] text-white md:text-6xl lg:text-7xl">
            {hero.title}
            <br />
            <span className="text-brand">{hero.titleHighlight}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/75 md:text-lg">
            {hero.subtitle}
          </p>
        </div>
      </div>

      {/* Controls */}
      {total > 1 && (
      <>
      <button
        onClick={() => go(-1)}
        aria-label={t("gallery.controls.prev")}
        className="absolute left-4 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 md:left-8"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => go(1)}
        aria-label={t("gallery.controls.next")}
        className="absolute right-4 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 md:right-8"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dots */}
      <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`${t("gallery.controls.slide")} ${i + 1}`}
            className={[
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-8 bg-brand" : "w-1.5 bg-white/40 hover:bg-white/60",
            ].join(" ")}
          />
        ))}
      </div>
      </>
      )}
    </section>
  );
}

function PhotoCatalog({ photos }: { photos: GalleryConfig["photos"] }) {
  const t = useT();
  const [active, setActive] = useState<GalleryMediaItem | null>(null);

  return (
    <section className="py-20 md:py-28">
      <div className="container-wh">
        <div className="mb-10 flex items-end justify-between gap-6 md:mb-14">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              {photos.eyebrow}
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-5xl">
              {photos.title}
            </h2>
          </div>
          <p className="hidden max-w-sm text-sm text-muted-foreground md:block">
            {photos.subtitle}
          </p>
        </div>
      </div>

      <div className="w-full px-2 md:px-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {photos.items.map((item, i) => (
            <button
              key={item.url + i}
              onClick={() => setActive(item)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-muted"
            >
              {item.kind === "video" ? (
                <video
                  src={item.url}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
              ) : (
                <img
                  src={item.url}
                  alt={item.alt || `${t("gallery.controls.photoAlt")} ${i + 1}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              {item.kind === "video" && (
                <span className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md">
                    <Play size={20} className="ml-0.5" fill="currentColor" />
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {active && (
        <div
          onClick={() => setActive(null)}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/90 p-4 backdrop-blur-sm animate-fade-in"
        >
          {active.kind === "video" ? (
            <video
              src={active.url}
              controls
              autoPlay
              playsInline
              className="max-h-[90vh] max-w-[92vw] rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={active.url}
              alt={active.alt ?? ""}
              className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <button
            onClick={() => setActive(null)}
            className="absolute right-6 top-6 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
            aria-label={t("gallery.controls.close")}
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}

function VideoSection({ videos }: { videos: GalleryConfig["videos"] }) {
  const t = useT();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<GalleryVideo | null>(null);
  // Triplicamos a lista para criar a sensação de loop infinito.
  const loop = [...videos.items, ...videos.items, ...videos.items];

  // Auto-scroll contínuo do carrossel.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || videos.items.length === 0) return;
    let raf = 0;
    let last = performance.now();
    let paused = false;
    const onEnter = () => (paused = true);
    const onLeave = () => (paused = false);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    const oneThird = () => el.scrollWidth / 3;
    // Aguarda layout para posicionar no terço central (loop em ambos sentidos).
    const init = () => {
      if (el.scrollWidth > 0) el.scrollLeft = oneThird();
    };
    init();
    const t0 = window.setTimeout(init, 100);
    let acc = 0; // acumulador subpixel para movimento fluido em baixa velocidade
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!paused && !active) {
        acc += (dt / 1000) * 60; // 60px/s
        if (acc >= 1) {
          const step = Math.floor(acc);
          acc -= step;
          el.scrollLeft = el.scrollLeft + step;
          const third = oneThird();
          if (third > 0) {
            if (el.scrollLeft >= third * 2) el.scrollLeft -= third;
            else if (el.scrollLeft <= 0) el.scrollLeft += third;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t0);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [videos.items, active]);

  const scrollBy = (delta: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  // Fecha o modal com Esc.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <section className="relative bg-[#0b0b0b] py-20 text-white md:py-28">
      <div className="container-wh">
        <div className="mb-8 flex items-end justify-between gap-6 md:mb-12">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              {videos.eyebrow}
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-5xl">
              {videos.title}
            </h2>
          </div>
          <p className="hidden max-w-sm text-sm text-white/60 md:block">
            {videos.subtitle}
          </p>
        </div>
      </div>

      <div className="relative">
        {/* Fades laterais */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0b0b0b] to-transparent md:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0b0b0b] to-transparent md:w-24" />

        <div
          ref={trackRef}
          className="no-scrollbar flex gap-4 overflow-x-auto px-6 md:gap-6 md:px-12"
          style={{ scrollbarWidth: "none" }}
        >
          {loop.map((v, i) => (
            <button
              key={`${v.id}-${i}`}
              onClick={() => setActive(v)}
              className="group relative aspect-[9/16] w-[180px] flex-shrink-0 overflow-hidden rounded-2xl bg-black ring-1 ring-white/10 transition hover:ring-brand/60 md:w-[240px]"
              aria-label={v.title}
            >
              <img
                src={v.poster}
                alt={v.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition group-hover:scale-110 group-hover:bg-brand">
                  <Play size={22} className="ml-1" fill="currentColor" />
                </span>
              </span>
              <div className="absolute inset-x-0 bottom-0 p-3 text-left">
                <p className="text-xs font-semibold tracking-wide text-white/90 line-clamp-2">
                  {v.title}
                </p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => scrollBy(-400)}
          aria-label={t("gallery.controls.prev")}
          className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 md:grid"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => scrollBy(400)}
          aria-label={t("gallery.controls.next")}
          className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 md:grid"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {active && <VideoLightbox video={active} onClose={() => setActive(null)} />}
    </section>
  );
}

function VideoLightbox({ video, onClose }: { video: GalleryVideo; onClose: () => void }) {
  const t = useT();
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[90] grid place-items-center bg-black/95 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="relative aspect-[9/16] h-[88vh] max-w-[92vw] overflow-hidden rounded-2xl bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {video.src ? (
        <video
          src={video.src}
          controls
          autoPlay
            loop
          playsInline
          className="h-full w-full object-cover"
        />
        ) : (
          <>
            <img src={video.poster} alt={video.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm text-white/80">
              {t("gallery.controls.videoUnavailable")}
            </div>
          </>
      )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5">
          <p className="text-sm font-semibold text-white">{video.title}</p>
        </div>
    </div>
      <button
        onClick={onClose}
        className="absolute right-6 top-6 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
        aria-label={t("gallery.controls.close")}
      >
        <X size={20} />
      </button>
    </div>
  );
}