/**
 * Helper para envolver handlers de createServerFn com logging estruturado
 * e normalização de erros.
 */
import { logServerError } from "./logger.server";
import { AppError, toAppError } from "./errors";
import { redirect, notFound, isRedirect, isNotFound } from "@tanstack/react-router";

type AnyHandler<C, R> = (args: C) => Promise<R> | R;

/**
 * Envolve o handler de um createServerFn:
 * - deixa passar redirect/notFound do TanStack Router
 * - converte qualquer outro erro em AppError, loga e re-lança
 * - mensagem amigável é preservada; detalhes do erro original ficam só no log
 */
export function withErrorLogging<C, R>(scope: string, handler: AnyHandler<C, R>): AnyHandler<C, R> {
  return async (args: C) => {
    try {
      return await handler(args);
    } catch (err) {
      // Fluxos de controle do router não devem ser tratados como erro.
      if (isRedirect(err) || isNotFound(err)) throw err;

      const app = toAppError(err);
      try {
        const rawMsg = err instanceof Error ? err.message : String((err as any)?.message ?? err);
        const stack = err instanceof Error ? err.stack : undefined;
        console.error(`[withErrorLogging:${scope}] RAW=`, rawMsg, stack ? `\n${stack.split("\n").slice(0,4).join("\n")}` : "");
      } catch {}
      logServerError(app, {
        scope,
        extra: { args: safeArgs(args) },
      });
      // Sempre re-lança um AppError com mensagem segura para o cliente.
      throw new AppError(app.code, app.userMessage, { status: app.status, cause: app.cause });
    }
  };
}

function safeArgs(args: unknown): unknown {
  try {
    // Evita logar campos sensíveis óbvios.
    const json = JSON.stringify(args, (k, v) => {
      if (typeof k === "string" && /password|secret|token|authorization/i.test(k)) return "[redacted]";
      return v;
    });
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

// Re-export para facilitar uso em handlers
export { redirect, notFound };