// Captura antecipada do evento `beforeinstallprompt` e estado global de instalação.
// Importado pelo `__root` e pelos componentes que oferecem "Instalar App".
//
// Por que existe: o Chrome dispara `beforeinstallprompt` MUITO cedo, antes do
// React montar. Se o listener for adicionado dentro de useEffect, perdemos
// o evento e nunca conseguimos chamar `.prompt()` — resultado: o botão não
// abre o popup nativo e o usuário acha que "não está instalando".
//
// Solução: um script inline no <head> (ver `earlyInstallCaptureScript`) salva
// o evento em `window.__whInstallPrompt`. Os componentes lêem daqui.

export interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __whInstallPrompt?: BIPEvent | null;
    __whInstalled?: boolean;
  }
}

export const PWA_INSTALL_EVENT = "wh:installprompt";
export const PWA_INSTALLED_EVENT = "wh:appinstalled";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    // @ts-expect-error iOS Safari standalone flag
    window.navigator.standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

export function getDeferredPrompt(): BIPEvent | null {
  if (typeof window === "undefined") return null;
  return window.__whInstallPrompt ?? null;
}

export function clearDeferredPrompt() {
  if (typeof window === "undefined") return;
  window.__whInstallPrompt = null;
}

// Script inlinado no <head> antes do React montar.
// Mantém a referência viva e re-emite um custom event quando os componentes
// React montarem depois.
export const earlyInstallCaptureScript = `
(function(){
  try {
    if (window.__whPwaCaptureInstalled) return;
    window.__whPwaCaptureInstalled = true;
    window.__whInstallPrompt = null;
    window.__whInstalled = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    window.addEventListener('beforeinstallprompt', function(e){
      e.preventDefault();
      window.__whInstallPrompt = e;
      try { window.dispatchEvent(new CustomEvent('${PWA_INSTALL_EVENT}')); } catch(_) {}
    });
    window.addEventListener('appinstalled', function(){
      window.__whInstalled = true;
      window.__whInstallPrompt = null;
      try { window.dispatchEvent(new CustomEvent('${PWA_INSTALLED_EVENT}')); } catch(_) {}
    });
  } catch(_) {}
})();
`;
