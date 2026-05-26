/**
 * Hook cliente para tratar erros de forma consistente:
 * loga no console e mostra toast amigável.
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { getUserMessage, toAppError } from "./errors";

type HandleOptions = {
  /** Mensagem alternativa exibida ao usuário (sobrescreve a do erro). */
  userMessage?: string;
  /** Escopo logado no console para facilitar diagnóstico. */
  scope?: string;
  /** Não mostrar toast (apenas logar). */
  silent?: boolean;
};

// Deduplicação simples — evita enxurrada de toasts em loops de rede.
const TOAST_DEDUPE_MS = 2000;
let lastToast: { key: string; at: number } | null = null;

function shouldShowToast(key: string): boolean {
  const now = Date.now();
  if (lastToast && lastToast.key === key && now - lastToast.at < TOAST_DEDUPE_MS) {
    return false;
  }
  lastToast = { key, at: now };
  return true;
}

function emit(err: unknown, opts: HandleOptions) {
  const app = toAppError(err);
  // eslint-disable-next-line no-console
  console.error(`[${opts.scope ?? "client"}]`, app.code, app.userMessage, app.cause ?? app);
  if (!opts.silent) {
    const msg = opts.userMessage ?? getUserMessage(app);
    if (shouldShowToast(`${app.code}:${msg}`)) {
      toast.error(msg);
    }
  }
  return app;
}

export function useErrorHandler() {
  return useCallback((err: unknown, opts: HandleOptions = {}) => emit(err, opts), []);
}

/** Versão sem hook para usar fora de componentes. */
export function handleClientError(err: unknown, opts: HandleOptions = {}) {
  return emit(err, opts);
}