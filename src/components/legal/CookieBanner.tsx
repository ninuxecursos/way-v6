import * as React from "react";
import { Link } from "@tanstack/react-router";
import { CONSENT_KEY as KEY, writeConsent, type ConsentValue } from "@/lib/consent";

export function CookieBanner() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    // Difere para fora do caminho crítico do LCP: só monta após o navegador
    // ficar ocioso (ou 1.5s, o que vier antes). Antes o banner pintava cedo
    // e era escolhido como elemento LCP no PageSpeed.
    const reveal = () => {
      try {
        if (!localStorage.getItem(KEY)) setShow(true);
      } catch {}
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(reveal, { timeout: 1500 });
    } else {
      const id = window.setTimeout(reveal, 1500);
      return () => window.clearTimeout(id);
    }
  }, []);

  if (!show) return null;

  const accept = (value: ConsentValue) => {
    writeConsent(value);
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed bottom-4 inset-x-4 md:bottom-6 md:right-6 md:left-auto md:max-w-md z-[60] rounded-2xl border border-border bg-card text-card-foreground shadow-2xl p-4 md:p-5 animate-fade-in"
    >
      <p className="text-sm leading-relaxed">
        Usamos cookies essenciais para o funcionamento do site e cookies opcionais
        para melhorar sua experiência. Veja a nossa{" "}
        <Link to="/cookies" className="text-brand underline-offset-4 hover:underline">
          Política de Cookies
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => accept("all")}
          className="px-3 py-2 rounded-full bg-brand text-brand-foreground text-xs font-bold uppercase tracking-wider cursor-pointer hover:opacity-90 transition"
        >
          Ok
        </button>
        <button
          onClick={() => accept("essential")}
          className="px-3 py-2 rounded-full border border-border text-foreground text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-accent transition"
        >
          Saber mais
        </button>
      </div>
    </div>
  );
}