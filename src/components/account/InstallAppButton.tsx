import { useEffect, useState } from "react";
import { Download, Share, Plus, MoreVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  PWA_INSTALL_EVENT,
  PWA_INSTALLED_EVENT,
  clearDeferredPrompt,
  getDeferredPrompt,
  isStandalone,
  type BIPEvent,
} from "@/lib/pwa-install";

type Props = {
  variant?: "sidebar" | "sheet" | "featured";
};

export function InstallAppButton({ variant = "sidebar" }: Props) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [desktopHelpOpen, setDesktopHelpOpen] = useState(false);
  const [androidHelpOpen, setAndroidHelpOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setInstalled(isStandalone());
    // Lê o evento capturado antes do React montar (early script no __root).
    const early = getDeferredPrompt();
    if (early) setDeferred(early);

    const onCaptured = () => {
      const p = getDeferredPrompt();
      if (p) setDeferred(p);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      clearDeferredPrompt();
    };
    window.addEventListener(PWA_INSTALL_EVENT, onCaptured);
    window.addEventListener(PWA_INSTALLED_EVENT, onInstalled);
    // Fallback: caso o early script não tenha rodado (edge case), também
    // escuta o evento nativo aqui.
    const onBIP = (e: Event) => {
      e.preventDefault();
      const ev = e as BIPEvent;
      window.__whInstallPrompt = ev;
      setDeferred(ev);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => {
      window.removeEventListener(PWA_INSTALL_EVENT, onCaptured);
      window.removeEventListener(PWA_INSTALLED_EVENT, onInstalled);
      window.removeEventListener("beforeinstallprompt", onBIP);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isIos = /iPad|iPhone|iPod/.test(ua) && !/Android/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
        setDeferred(null);
        clearDeferredPrompt();
      } catch {
        // ignore
      }
      return;
    }
    if (isIos) {
      setIosOpen(true);
      return;
    }
    if (isAndroid) {
      setAndroidHelpOpen(true);
      return;
    }
    setDesktopHelpOpen(true);
  };

  const baseCls =
    variant === "sidebar"
      ? "mx-3 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer w-[calc(100%-1.5rem)] transition-colors"
      : variant === "featured"
      ? "group w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left bg-gradient-to-br from-brand to-brand/80 text-brand-foreground font-semibold shadow-[0_12px_28px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] hover:shadow-[0_18px_36px_-14px_color-mix(in_oklab,var(--brand)_80%,transparent)] active:scale-[0.99] transition-all"
      : "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[15px] font-medium text-foreground hover:bg-accent transition-colors";

  return (
    <>
      {variant === "featured" ? (
        <button type="button" onClick={handleClick} className={baseCls} aria-label="Instalar App">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 text-brand-foreground">
            <Download size={20} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] leading-tight">Instalar o app Way Home</span>
            <span className="block text-[11.5px] font-medium opacity-85 mt-0.5">Acesso rápido na tela inicial · offline</span>
          </span>
        </button>
      ) : (
        <button type="button" onClick={handleClick} className={baseCls} aria-label="Instalar App">
          <Download size={variant === "sidebar" ? 18 : 20} />
          <span className="flex-1 text-left">Instalar App</span>
        </button>
      )}

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Instalar Way Home</DialogTitle>
            <DialogDescription>Adicione à sua Tela de Início em 2 toques.</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/15 text-brand font-bold">1</span>
              <span className="pt-1">Toque em <Share size={14} className="inline mx-1 -mt-0.5" /> (Compartilhar) na barra do Safari.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/15 text-brand font-bold">2</span>
              <span className="pt-1">Escolha <Plus size={14} className="inline mx-1 -mt-0.5" /> "Adicionar à Tela de Início".</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>

      <Dialog open={desktopHelpOpen} onOpenChange={setDesktopHelpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Instalar Way Home</DialogTitle>
            <DialogDescription>Use Chrome, Edge ou Brave para instalar como app.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Procure o ícone <Download size={14} className="inline mx-1 -mt-0.5" /> na barra de endereço, ou abra o menu do navegador e selecione <strong>"Instalar Way Home"</strong>.</p>
            <p className="text-xs">Em alguns navegadores (como Firefox), a instalação como app não está disponível.</p>
          </div>
          <Button onClick={() => setDesktopHelpOpen(false)} className="w-full mt-2">Entendi</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={androidHelpOpen} onOpenChange={setAndroidHelpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Instalar Way Home</DialogTitle>
            <DialogDescription>Adicione o app à tela inicial em poucos toques.</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/15 text-brand font-bold">1</span>
              <span className="pt-1">Toque em <MoreVertical size={14} className="inline mx-1 -mt-0.5" /> (menu do Chrome) no canto superior direito.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/15 text-brand font-bold">2</span>
              <span className="pt-1">Escolha <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/15 text-brand font-bold">3</span>
              <span className="pt-1">Confirme em <strong>"Instalar"</strong>. O ícone Way Home aparecerá na sua tela inicial.</span>
            </li>
          </ol>
          <Button onClick={() => setAndroidHelpOpen(false)} className="w-full mt-2">Entendi</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
