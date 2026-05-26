/** Detecção pura de tipo de mídia (sem dependências de browser). Safe em SSR. */
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogg|ogv)(\?|#|$)/i;

export function detectMediaKind(url: string, mime?: string | null): "image" | "video" {
  if (mime?.startsWith("video/")) return "video";
  if (mime?.startsWith("image/")) return "image";
  return VIDEO_EXT_RE.test(url) ? "video" : "image";
}