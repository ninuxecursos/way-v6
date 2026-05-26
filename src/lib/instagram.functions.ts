/**
 * Server function que extrai a URL direta do vídeo (mp4) e poster
 * de um post público do Instagram, lendo as meta tags og:video / og:image
 * da página pública. Permite reproduzir o vídeo inline no site,
 * sem usar o iframe oficial (que sempre redireciona para instagram.com).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface InstagramMedia {
  shortcode: string;
  videoUrl: string | null;
  posterUrl: string | null;
  caption: string | null;
}

function pickMeta(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  if (m) return decodeHtml(m[1]);
  // ordem invertida (content antes de property)
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2 ? decodeHtml(m2[1]) : null;
}

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export const getInstagramMedia = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ shortcode: z.string().min(3).max(40) }).parse(data),
  )
  .handler(async ({ data }) => {
    const url = `https://www.instagram.com/p/${data.shortcode}/embed/captioned/`;
    try {
      const res = await fetch(url, {
        headers: {
          // UA de navegador real — IG entrega meta tags públicas.
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
      });
      if (!res.ok) {
        return {
          shortcode: data.shortcode,
          videoUrl: null,
          posterUrl: null,
          caption: null,
        } satisfies InstagramMedia;
      }
      const html = await res.text();

      // Meta tags OpenGraph
      let videoUrl =
        pickMeta(html, "og:video:secure_url") ||
        pickMeta(html, "og:video") ||
        pickMeta(html, "og:video:url");
      let posterUrl =
        pickMeta(html, "og:image:secure_url") || pickMeta(html, "og:image");
      const caption =
        pickMeta(html, "og:description") || pickMeta(html, "description");

      // Fallback: tenta extrair video_url de JSON inline do embed
      if (!videoUrl) {
        const m =
          html.match(/"video_url":\s*"([^"]+\.mp4[^"]*)"/i) ||
          html.match(/"contentUrl":\s*"([^"]+\.mp4[^"]*)"/i);
        if (m) videoUrl = m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
      }
      if (!posterUrl) {
        const m = html.match(/"display_url":\s*"([^"]+)"/i);
        if (m) posterUrl = m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
      }

      return {
        shortcode: data.shortcode,
        videoUrl,
        posterUrl,
        caption,
      } satisfies InstagramMedia;
    } catch {
      return {
        shortcode: data.shortcode,
        videoUrl: null,
        posterUrl: null,
        caption: null,
      } satisfies InstagramMedia;
    }
  });
