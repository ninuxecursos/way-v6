/**
 * Consent helper compartilhado entre o CookieBanner e o init de Consent Mode v2.
 * Estados: "all" (consente tudo), "essential" (apenas essenciais), null (não decidiu).
 */
export const CONSENT_KEY = "wh-cookie-consent";
export type ConsentValue = "all" | "essential";

export function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "all" || v === "essential" ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(v: ConsentValue) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(CONSENT_KEY, v); } catch {}
  applyConsent(v);
  try { window.dispatchEvent(new CustomEvent("wh:consent", { detail: v })); } catch {}
}

/** Atualiza Consent Mode v2 (Google) e o consenso do Meta Pixel. */
export function applyConsent(v: ConsentValue) {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    gtag?: (...a: unknown[]) => void;
    fbq?: (...a: unknown[]) => void;
    dataLayer?: unknown[];
  };
  // Garante dataLayer/gtag stub para enfileirar antes do GTM carregar.
  w.dataLayer = w.dataLayer || [];
  if (!w.gtag) w.gtag = function () { (w.dataLayer as unknown[]).push(arguments as unknown as IArguments); };
  const granted = v === "all";
  w.gtag("consent", "update", {
    ad_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
    analytics_storage: granted ? "granted" : "denied",
    personalization_storage: granted ? "granted" : "denied",
    functionality_storage: "granted",
    security_storage: "granted",
  });
  if (typeof w.fbq === "function") {
    w.fbq("consent", granted ? "grant" : "revoke");
  }
}

/** Snippet sÍncrono injetado no <head> para definir o estado padrão DENIED. */
export const consentDefaultsScript = `(function(){window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments);};var s='denied';try{var v=localStorage.getItem('${CONSENT_KEY}');if(v==='all')s='granted';}catch(e){}gtag('consent','default',{ad_storage:s,ad_user_data:s,ad_personalization:s,analytics_storage:s,personalization_storage:s,functionality_storage:'granted',security_storage:'granted',wait_for_update:500,region:['BR']});})();`;