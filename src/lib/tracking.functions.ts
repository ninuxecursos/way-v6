/**
 * Tracking & integrações: lê/grava `site_settings.tracking` (admin) e
 * expõe um snapshot público sem segredos para o SSR injetar no <head>.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";

export interface PublicTracking {
  meta: { pixelId: string; enabled: boolean };
  ga4: { measurementId: string; enabled: boolean };
  gtm: { containerId: string; enabled: boolean };
  googleAds: { conversionId: string; enabled: boolean };
  tiktok: { pixelId: string; enabled: boolean };
  pinterest: { tagId: string; enabled: boolean };
  linkedin: { partnerId: string; enabled: boolean };
  hotjar: { siteId: string; enabled: boolean };
  clarity: { projectId: string; enabled: boolean };
  searchConsole: { verificationToken: string };
  custom: { headHtml: string; bodyStartHtml: string; bodyEndHtml: string };
  consent: { requireConsent: boolean; defaultRegion: string };
}

/** Devolve apenas IDs públicos – sem accessToken/apiSecret. Para SSR. */
export const getPublicTracking = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ json: string }> => {
    try {
      const { data } = await supabase.rpc("get_public_tracking");
      return { json: JSON.stringify(data ?? {}) };
    } catch {
      return { json: "{}" };
    }
  },
);

/** Admin: lê o registro completo de tracking (com segredos). Devolve JSON serializado. */
export const getAdminTracking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ json: string }> => {
    const { supabase: sb } = context;
    const { data, error } = await sb
      .from("site_settings")
      .select("value")
      .eq("key", "tracking")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { json: JSON.stringify(data?.value ?? {}) };
  });

/** Admin: salva o registro completo de tracking. Recebe JSON serializado. */
export const saveAdminTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { json: string }) => d)
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { supabase: sb, userId } = context;
    const parsed = JSON.parse(data.json);
    const { error } = await sb
      .from("site_settings")
      .upsert({ key: "tracking", value: parsed, updated_by: userId, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
