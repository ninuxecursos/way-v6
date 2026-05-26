import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share } from "lucide-react";
import {
  PWA_INSTALL_EVENT,
  PWA_INSTALLED_EVENT,
  clearDeferredPrompt,
  getDeferredPrompt,
  isStandalone,
  type BIPEvent,
} from "@/lib/pwa-install";

const NEVER_KEY = "wh_pwa_install_never";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosShow, setIosShow] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(NEVER_KEY) === "1") return;
    if (isStandalone()) return;

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !/Android/.test(ua);

    // Evento capturado antes do React montar.
    const early = getDeferredPrompt();
    if (early) {
      setDeferred(early);
      setVisible(true);
    }
    const onCaptured = () => {
      const p = getDeferredPrompt();
      if (p) {
        setDeferred(p);
        setVisible(true);
      }
    };
    const onInstalled = () => {
      setDeferred(null);
      setVisible(false);
      clearDeferredPrompt();
    };
    window.addEventListener(PWA_INSTALL_EVENT, onCaptured);
    window.addEventListener(PWA_INSTALLED_EVENT, onInstalled);
    const onBIP = (e: Event) => {
      e.preventDefault();
      const ev = e as BIPEvent;
      window.__whInstallPrompt = ev;
      setDeferred(ev);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    if (isIos) {
      setIosShow(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener(PWA_INSTALL_EVENT, onCaptured);
      window.removeEventListener(PWA_INSTALLED_EVENT, onInstalled);
      window.removeEventListener("beforeinstallprompt", onBIP);
    };
  }, []);

  if (!visible) return null;

  // Fecha só para esta sessão/reload — volta a aparecer no próximo carregamento.
  const closeForNow = () => setVisible(false);

  // Persistente: usuário não quer mais ver o toast.
  const dontShowAgain = () => {
    localStorage.setItem(NEVER_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    clearDeferredPrompt();
    setVisible(false);
  };

  return (
    <div className="fixed left-3 right-3 bottom-[calc(72px+env(safe-area-inset-bottom))] md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-40">
      <div className="rounded-2xl border border-white/10 bg-[#0f0f0f]/95 shadow-2xl p-4 text-white">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand shrink-0">
            <Download size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm">Instale o app Way Home</p>
            {iosShow ? (
              <p className="mt-1 text-xs text-white/70 leading-relaxed">
                Toque em <Share size={12} className="inline mx-1" /> e em "Adicionar à Tela de Início".
              </p>
            ) : (
              <p className="mt-1 text-xs text-white/70 leading-relaxed">
                Acesso rápido aos seus pedidos direto da tela inicial.
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!iosShow && (
                <Button onClick={install} size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90 h-8 text-xs font-semibold">
                  Instalar agora
                </Button>
              )}
              <button
                type="button"
                onClick={dontShowAgain}
                className="h-8 text-[11px] font-medium text-white/60 hover:text-white underline-offset-2 hover:underline"
              >
                Não exibir mais
              </button>
            </div>
          </div>
          <button onClick={closeForNow} aria-label="Fechar" className="text-white/50 hover:text-white">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
