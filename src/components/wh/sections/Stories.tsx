/**
 * Seção Stories — vídeos verticais (9:16).
 * - Strip horizontal de cards 9:16 com preview do vídeo.
 * - Clique abre modal fullscreen com o vídeo ocupando a tela e autoplay.
 * - Aceita upload direto OU URL (incluindo Instagram, com extração do MP4).
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play, X, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { EditableText } from "@/components/admin/visual-edit/EditableText";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getInstagramMedia } from "@/lib/instagram.functions";

export interface StoryItem {
  videoUrl: string;
  posterUrl?: string;
  title?: string;
  author?: string;
  description?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export function parseInstagram(url?: string): { shortcode: string; canonicalUrl: string } | null {
  if (!url) return null;
  const m = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  const shortcode = m[1];
  return { shortcode, canonicalUrl: `https://www.instagram.com/p/${shortcode}/` };
}

interface StoriesData {
  eyebrow?: string;
  titleA?: string;
  titleB?: string;
  desc?: string;
  items?: StoryItem[];
}

export function Stories({ data }: { data?: Record<string, unknown> }) {
  const v = (data ?? {}) as StoriesData;
  const items = (v.items ?? []).filter((it) => it && it.videoUrl);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <section className="bg-background py-12">
        <div className="container-wh">
          <p className="text-center text-sm text-muted-foreground">
            Nenhum story publicado ainda.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-14 md:py-20">
      <div className="container-wh">
        <header className="mb-7 max-w-2xl space-y-2 md:mb-10">
          {v.eyebrow ? (
            <EditableText
              path="eyebrow"
              value={v.eyebrow}
              as="p"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            />
          ) : null}
          <h2 className="heading-display text-3xl text-foreground md:text-5xl">
            <EditableText path="titleA" value={v.titleA ?? "Stories"} as="span" />{" "}
            <EditableText
              path="titleB"
              value={v.titleB ?? ""}
              as="span"
              className="italic text-brand"
            />
          </h2>
          {v.desc ? (
            <EditableText
              path="desc"
              value={v.desc}
              as="p"
              singleLine={false}
              className="text-sm text-muted-foreground md:text-base"
            />
          ) : null}
        </header>

        <div
          className="-mx-4 flex snap-x snap-mandatory justify-center gap-3 overflow-x-auto px-4 pb-3 md:gap-5 [scrollbar-width:thin]"
          role="list"
        >
          {items.map((it, i) => (
            <StoryCard key={i} item={it} onOpen={() => setOpenIndex(i)} />
          ))}
        </div>
      </div>

      {openIndex !== null && (
        <StoryViewer
          items={items}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onChange={setOpenIndex}
        />
      )}
    </section>
  );
}

function StoryCard({ item, onOpen }: { item: StoryItem; onOpen: () => void }) {
  const ig = parseInstagram(item.videoUrl);
  const fetchIg = useServerFn(getInstagramMedia);
  const igMedia = useQuery({
    enabled: !!ig && !item.posterUrl,
    queryKey: ["ig-media", ig?.shortcode],
    queryFn: () => fetchIg({ data: { shortcode: ig!.shortcode } }),
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const previewVideo = ig ? igMedia.data?.videoUrl : item.videoUrl;
  const previewPoster = item.posterUrl ?? igMedia.data?.posterUrl;

  return (
    <button
      type="button"
      onClick={onOpen}
      role="listitem"
      className="group relative aspect-[9/16] w-[160px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border/50 bg-muted/40 shadow-sm transition hover:scale-[1.02] hover:shadow-lg sm:w-[180px] md:w-[200px]"
      aria-label={item.title || "Abrir vídeo"}
    >
      {previewVideo ? (
        <video
          src={previewVideo}
          poster={previewPoster ?? undefined}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : previewPoster ? (
        <img
          src={previewPoster}
          alt={item.title || ""}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-full bg-black/50 p-3 text-white opacity-90 backdrop-blur transition group-hover:scale-110 group-hover:bg-brand group-hover:text-brand-foreground">
          <Play className="h-5 w-5 fill-current" />
        </span>
      </div>
      {item.title ? (
        <div className="absolute inset-x-0 bottom-0 p-3 text-left">
          <p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
        </div>
      ) : null}
    </button>
  );
}

function StoryViewer({
  items,
  index,
  onClose,
  onChange,
}: {
  items: StoryItem[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  const item = items[index];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const ig = parseInstagram(item.videoUrl);

  const fetchIg = useServerFn(getInstagramMedia);
  const igMedia = useQuery({
    enabled: !!ig,
    queryKey: ["ig-media", ig?.shortcode],
    queryFn: () => fetchIg({ data: { shortcode: ig!.shortcode } }),
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < items.length - 1) onChange(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onChange(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onChange]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [index, igMedia.data?.videoUrl]);

  if (typeof document === "undefined") return null;

  const resolvedVideo = ig ? igMedia.data?.videoUrl ?? null : item.videoUrl;
  const resolvedPoster = item.posterUrl ?? (ig ? igMedia.data?.posterUrl : undefined);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={item.title || "Vídeo"}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute right-3 top-3 z-20 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        aria-label="Fechar"
      >
        <X className="h-5 w-5" />
      </button>

      {index > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(index - 1); }}
          className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {index < items.length - 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(index + 1); }}
          className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Próximo"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div
        className="relative h-[92vh] max-h-[92vh] overflow-hidden rounded-2xl bg-black shadow-2xl"
        style={{ aspectRatio: "9 / 16" }}
        onClick={(e) => e.stopPropagation()}
      >
        {ig && igMedia.isLoading ? (
          <div className="flex h-full w-full items-center justify-center text-white/60">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          </div>
        ) : !resolvedVideo ? (
          <div className="flex h-full w-full items-center justify-center p-6 text-center text-white/70">
            <p className="text-sm">Não foi possível carregar este vídeo.</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              src={resolvedVideo}
              poster={resolvedPoster ?? undefined}
              autoPlay
              loop
              muted={muted}
              playsInline
              controls={false}
              className="h-full w-full object-contain"
              onClick={(e) => {
                const el = e.currentTarget;
                if (el.paused) el.play();
                else el.pause();
              }}
            />
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="absolute bottom-3 right-3 rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80"
              aria-label={muted ? "Ativar som" : "Silenciar"}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
