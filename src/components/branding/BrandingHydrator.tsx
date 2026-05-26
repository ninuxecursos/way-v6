/**
 * Recebe o branding carregado em SSR (root loader) e popula o cache
 * em memória de useBranding ANTES do primeiro render — garante que
 * <Logo /> já saia com a URL configurada no admin, sem flash do padrão.
 */
import { setBranding, type Branding } from "@/hooks/use-branding";

let seeded = false;

export function BrandingHydrator({ initial }: { initial: Partial<Branding> | null }) {
  // Executado durante render — síncrono em SSR e client. Só semeia 1x.
  if (!seeded && initial) {
    seeded = true;
    setBranding({
      siteName: initial.siteName ?? "Way Home",
      siteShortName: initial.siteShortName ?? "Way Home",
      logoLightUrl: initial.logoLightUrl ?? "",
      logoDarkUrl: initial.logoDarkUrl ?? "",
      logoFooterUrl: initial.logoFooterUrl ?? "",
      faviconUrl: initial.faviconUrl ?? "/favicon.png",
      ogImageUrl: initial.ogImageUrl ?? "/og-image.png",
      primaryColor: initial.primaryColor ?? "",
      accentColor: initial.accentColor ?? "",
      logos: initial.logos ?? {},
      logosCustomUrl: initial.logosCustomUrl ?? {},
      logoSizes: initial.logoSizes ?? {},
    });
  }
  // Injeta cores configuradas no admin como overrides dos tokens globais.
  // Renderizado como <style> tag — funciona em SSR e no client sem flash.
  const primary = initial?.primaryColor?.trim();
  const accent = initial?.accentColor?.trim();
  if (!primary && !accent) return null;
  const css = `:root{${primary ? `--brand:${primary};` : ""}${accent ? `--accent:${accent};` : ""}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}