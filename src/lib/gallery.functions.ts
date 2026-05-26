/**
 * Server function que busca a configuração da página Galeria
 * (hero, fotos, vídeos e textos) em site_settings.
 */
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export interface GalleryVideo {
  id: string;
  title: string;
  poster: string;
  src?: string;
  visible?: boolean;
}

export interface GalleryMediaItem {
  url: string;
  kind: "image" | "video";
  visible: boolean;
  alt?: string;
}

export interface GalleryConfig {
  hero: {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    slides: GalleryMediaItem[];
  };
  videos: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: GalleryVideo[];
  };
  photos: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: GalleryMediaItem[];
  };
}

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogg|ogv)(\?|#|$)/i;

/** Converte um item legado (string ou objeto parcial) para GalleryMediaItem. */
export function normalizeMediaItem(raw: unknown): GalleryMediaItem | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    return {
      url: raw,
      kind: VIDEO_EXT_RE.test(raw) ? "video" : "image",
      visible: true,
    };
  }
  if (typeof raw === "object" && raw !== null) {
    const o = raw as Partial<GalleryMediaItem>;
    if (!o.url || typeof o.url !== "string") return null;
    return {
      url: o.url,
      kind: o.kind ?? (VIDEO_EXT_RE.test(o.url) ? "video" : "image"),
      visible: o.visible !== false,
      alt: o.alt,
    };
  }
  return null;
}

export function normalizeMediaList(raw: unknown): GalleryMediaItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeMediaItem).filter((x): x is GalleryMediaItem => !!x);
}

export interface GalleryPayload {
  json: string;
}

export const getGallery = createServerFn({ method: "GET" }).handler(
  async (): Promise<GalleryPayload> => {
    const withTimeout = <T,>(p: PromiseLike<T>, ms = 1500): Promise<T> =>
      Promise.race([
        Promise.resolve(p),
        new Promise<T>((_, rej) => setTimeout(() => rej(new Error("supabase-timeout")), ms)),
      ]);
    try {
      const { data: settingsRow } = await withTimeout(
        supabase.from("site_settings").select("value").eq("key", "gallery").maybeSingle(),
      );
      const value = ((settingsRow?.value as Record<string, unknown> | undefined) ?? {}) as Record<
        string,
        unknown
      >;
      // Retorna apenas o que foi explicitamente configurado em
      // /admin/settings/gallery. Não mistura outras mídias do site.
      return { json: JSON.stringify(value) };
    } catch {
      return { json: "{}" };
    }
  },
);