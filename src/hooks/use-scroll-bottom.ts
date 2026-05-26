import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Detecta quando o usuário rolou até o final de um elemento (com tolerância).
 * Retorna { ref, reached } — `reached` vira true e nunca volta para false.
 */
export function useScrollBottom<T extends HTMLElement = HTMLDivElement>(
  tolerancePx = 16,
) {
  const ref = useRef<T | null>(null);
  const [reached, setReached] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance <= tolerancePx) setReached(true);
    // Se o conteúdo cabe inteiro sem scroll, libera direto.
    if (el.scrollHeight <= el.clientHeight + tolerancePx) setReached(true);
  }, [tolerancePx]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [check]);

  return { ref, reached };
}