/**
 * Hook que carrega a chave `branding` de site_settings (logo, favicon, OG…).
 * Cacheia em memória durante a sessão para evitar refetch.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveLogoUrl, type LogoSlotId, type LogoVariantId } from "@/lib/logo-catalog";

export interface Branding {
  siteName: string;
  siteShortName: string;
  logoLightUrl: string;
  logoDarkUrl: string;
  logoFooterUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
  primaryColor: string;
  accentColor: string;
  /** Mapeia cada slot para uma variante oficial ou "custom". */
  logos?: Partial<Record<LogoSlotId, LogoVariantId | "custom">>;
  /** URLs personalizadas quando logos[slot] === "custom". */
  logosCustomUrl?: Partial<Record<LogoSlotId, string>>;
  /** Altura final (px) configurada manualmente para cada slot. */
  logoSizes?: Partial<Record<LogoSlotId, number>>;
}

const DEFAULT: Branding = {
  siteName: "Way Home",
  siteShortName: "Way Home",
  logoLightUrl: "",
  logoDarkUrl: "",
  logoFooterUrl: "",
  faviconUrl: "/favicon.png",
  ogImageUrl: "/og-image.png",
  primaryColor: "",
  accentColor: "",
  logos: {},
  logosCustomUrl: {},
  logoSizes: {},
};

let cache: Branding | null = null;
let pending: Promise<Branding> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Branding {
  return cache ?? DEFAULT;
}

async function fetchBranding(): Promise<Branding> {
  if (cache) return cache;
  if (pending) return pending;
  pending = (async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "branding")
      .maybeSingle();
    const merged = { ...DEFAULT, ...((data?.value as Partial<Branding> | undefined) ?? {}) };
    cache = merged;
    pending = null;
    emit();
    return merged;
  })();
  return pending;
}

export function invalidateBranding() {
  cache = null;
  pending = null;
  // refetch immediately and notify subscribers
  void fetchBranding();
}

/** Atualiza o branding em memória e notifica todos os componentes que escutam. */
export function setBranding(next: Branding) {
  cache = { ...DEFAULT, ...next };
  pending = null;
  emit();
}

export function useBranding(): Branding {
  const branding = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (!cache) void fetchBranding();
  }, []);
  return branding;
}

/** Resolve a URL e a altura configurada do logo para um slot. */
export function useLogo(slot: LogoSlotId): { src: string; alt: string; height?: number } {
  const b = useBranding();
  return {
    src: resolveLogoUrl(slot, b.logos, b.logosCustomUrl),
    alt: b.siteName || "Way Home",
    height: b.logoSizes?.[slot],
  };
}