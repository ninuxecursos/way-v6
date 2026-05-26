/**
 * Proxy público que serve mídia do bucket `media-public` sob o domínio
 * oficial wayhomeoficial.com.br, ocultando a URL do Supabase.
 *
 * GET /cdn/<path-no-bucket>  →  streams o objeto correspondente.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cdn/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = params._splat;
        if (!path) return new Response("Not found", { status: 404 });

        const supaUrl =
          process.env.SUPABASE_URL ||
          process.env.VITE_SUPABASE_URL ||
          "";
        if (!supaUrl) return new Response("Misconfigured", { status: 500 });

        const upstream = `${supaUrl.replace(/\/$/, "")}/storage/v1/object/public/media-public/${path}`;
        const range = request.headers.get("range");
        const res = await fetch(upstream, {
          headers: range ? { range } : undefined,
        });
        if (!res.ok && res.status !== 206) {
          return new Response("Not found", { status: res.status });
        }

        const headers = new Headers();
        const passthrough = [
          "content-type",
          "content-length",
          "content-range",
          "accept-ranges",
          "etag",
          "last-modified",
        ];
        for (const h of passthrough) {
          const v = res.headers.get(h);
          if (v) headers.set(h, v);
        }
        headers.set("cache-control", "public, max-age=31536000, immutable");
        headers.set("x-content-type-options", "nosniff");

        return new Response(res.body, { status: res.status, headers });
      },
    },
  },
});