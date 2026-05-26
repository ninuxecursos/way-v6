/**
 * Server function que busca o branding (logos, cores, nomes) configurado
 * em site_settings. Executado em SSR para evitar flash do logo padrão.
 */
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

/** Payload do branding serializado como string JSON para passar pelo SSR. */
export interface BrandingPayload {
  json: string;
}

export const getBranding = createServerFn({ method: "GET" }).handler(
  async (): Promise<BrandingPayload> => {
    const withTimeout = <T,>(p: PromiseLike<T>, ms = 1500): Promise<T> =>
      Promise.race([
        Promise.resolve(p),
        new Promise<T>((_, rej) => setTimeout(() => rej(new Error("supabase-timeout")), ms)),
      ]);
    try {
      const { data } = await withTimeout(
        supabase.from("site_settings").select("value").eq("key", "branding").maybeSingle(),
      );
      const value = (data?.value as Record<string, unknown> | undefined) ?? {};
      return { json: JSON.stringify(value) };
    } catch {
      return { json: "{}" };
    }
  },
);