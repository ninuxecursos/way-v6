/**
 * Reescreve URLs públicas do Supabase Storage para o proxy `/cdn/<path>`,
 * ocultando o backend. Usamos caminho relativo (sem host) para que funcione
 * em qualquer ambiente (preview, custom domain, etc.).
 */
const STORAGE_RE =
  /^https?:\/\/[a-z0-9-]+\.supabase\.(?:co|in)\/storage\/v1\/object\/public\/media-public\/(.+)$/i;
const ABS_CDN_RE = /^https?:\/\/(?:www\.)?wayhomeoficial\.com\.br\/cdn\/(.+)$/i;
const REL_CDN_RE = /^\/cdn\/(.+)$/i;

export function toCdnUrl(url: string | null | undefined): string {
  if (!url) return "";
  const m = url.match(STORAGE_RE);
  if (m) return `/cdn/${m[1]}`;
  // Converte URLs absolutas antigas em relativas para funcionar em qualquer host.
  const abs = url.match(ABS_CDN_RE);
  if (abs) return `/cdn/${abs[1]}`;
  return url;
}

/** Versão de exibição: aceita URLs antigas (absolutas) e novas (relativas). */
export function displayMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  const abs = url.match(ABS_CDN_RE);
  if (abs) return `/cdn/${abs[1]}`;
  return url;
}

export function fromCdnUrl(url: string): string {
  const rel = url.match(REL_CDN_RE);
  const abs = url.match(ABS_CDN_RE);
  const path = rel?.[1] ?? abs?.[1];
  if (!path) return url;
  const supaUrl =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
    "";
  if (!supaUrl) return url;
  return `${supaUrl}/storage/v1/object/public/media-public/${path}`;
}

/** Mostra/edita como CDN, persiste mantendo a forma original já aceita pelo backend. */
export function normalizeMediaUrl(url: string): string {
  return toCdnUrl(url);
}