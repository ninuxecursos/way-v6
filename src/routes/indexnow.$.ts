import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Serve o arquivo de verificação IndexNow em /{key}.txt.
 * O Bing/Yandex baixam esse arquivo para validar a posse do site
 * antes de aceitar submissões.
 * Captura qualquer caminho que termine em .txt e devolve a key se bater.
 */
export const Route = createFileRoute("/indexnow/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const splat = (params as { _splat?: string })._splat || "";
        const reqKey = splat.replace(/\.txt$/, "");
        try {
          const { data } = await supabase.from("site_settings").select("value").eq("key", "seo").maybeSingle();
          const k = (data?.value as Record<string, unknown> | null)?.indexNowKey as string | undefined;
          if (k && k === reqKey) {
            return new Response(k, { headers: { "Content-Type": "text/plain" } });
          }
        } catch {/* noop */}
        return new Response("Not found", { status: 404 });
      },
    },
  },
});