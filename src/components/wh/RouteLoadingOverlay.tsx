/**
 * Overlay global de carregamento durante navegações entre rotas.
 *
 * Estratégia: dispara IMEDIATAMENTE no clique em qualquer link interno
 * (ou elemento com [data-nav-loading]), e permanece visível por pelo menos
 * MIN_VISIBLE_MS, mesmo quando a rota é cacheada/preloadada e resolve rápido.
 *
 * Para navegações programáticas (useNavigate), chame:
 *   window.__showRouteLoading?.()
 * antes da chamada `navigate(...)`.
 */
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/branding/Logo";
import { useTheme } from "@/components/theme/ThemeProvider";

const MIN_VISIBLE_MS = 650;
const ARM_DELAY_MS = 120;

declare global {
  interface Window {
    __showRouteLoading?: () => void;
  }
}

export function RouteLoadingOverlay() {
  const isLoading = useRouterState({
    select: (s) => s.isLoading || s.isTransitioning,
  });
  const { resolved } = useTheme();
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ignora o primeiro mount: evita flash do overlay durante hidratação SSR.
  const armedRef = useRef(false);

  // Dispara overlay imediatamente
  useEffect(() => {
    const show = () => {
      if (!armedRef.current) return;
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      shownAtRef.current = Date.now();
      setVisible(true);
    };

    window.__showRouteLoading = show;

    // "Arma" o overlay logo após a hidratação para responder ao primeiro clique.
    const armTimer = setTimeout(() => {
      armedRef.current = true;
    }, ARM_DELAY_MS);

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Botão/elemento marcado explicitamente
      const navEl = target.closest<HTMLElement>("[data-nav-loading]");
      if (navEl && navEl.getAttribute("data-nav-loading") !== "false") {
        show();
        return;
      }

      // Link interno
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.getAttribute("data-nav-loading") === "false") return;

      const href = anchor.getAttribute("href") || "";
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      )
        return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Mesma rota (apenas hash/query) — ignora
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return;

      show();
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimeout(armTimer);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      delete window.__showRouteLoading;
    };
  }, []);

  // Dispara overlay quando o router informa que está carregando uma rota real
  useEffect(() => {
    if (isLoading && armedRef.current) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (!visible) {
        shownAtRef.current = Date.now();
        setVisible(true);
      }
    }
  }, [isLoading, visible]);

  // Esconde overlay respeitando tempo mínimo + estado do router
  useEffect(() => {
    if (!visible) return;
    if (isLoading) {
      // Se voltou a carregar antes de sumir, cancela qualquer timer de fechamento
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      return;
    }

    const elapsed = shownAtRef.current ? Date.now() - shownAtRef.current : MIN_VISIBLE_MS;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      shownAtRef.current = null;
      hideTimerRef.current = null;
    }, remaining);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [visible, isLoading]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="route-loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 bg-background/95 backdrop-blur-xl"
          role="status"
          aria-live="polite"
          aria-label="Carregando página"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-44 w-44 items-center justify-center"
          >
            {/* Anel externo sutil */}
            <span className="absolute inset-0 rounded-full border border-brand/10" />
            {/* Anel girando ao redor do logo */}
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand border-r-brand/60"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
            />
            {/* Brilho pulsante atrás do logo */}
            <motion.span
              aria-hidden
              className="absolute h-24 w-24 rounded-full bg-brand/15 blur-2xl"
              animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.9, 1.05, 0.9] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
              className="relative flex items-center justify-center"
            >
              <Logo
                slot={resolved === "light" ? "loadingLight" : "loading"}
                height={88}
                alt="Way Home"
                className="relative select-none drop-shadow-[0_0_24px_rgba(0,0,0,0.25)]"
              />
            </motion.div>
          </motion.div>

          <motion.p
            className="text-sm tracking-[0.25em] uppercase text-muted-foreground"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          >
            Carregando
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
