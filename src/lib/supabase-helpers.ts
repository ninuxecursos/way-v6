/**
 * Wrappers para queries Supabase com tratamento de erro padronizado no cliente.
 */
import { handleClientError } from "./use-error-handler";
import { toAppError } from "./errors";

type PostgrestLike<T> = { data: T | null; error: unknown };

/**
 * Executa uma query Supabase, dispara toast em erro e retorna { data, error }.
 * Use em handlers de eventos (botões, forms) onde queremos UX amigável.
 */
export async function safeQuery<T>(
  promise: PromiseLike<PostgrestLike<T>>,
  opts: { fallbackMessage?: string; scope?: string; silent?: boolean } = {},
): Promise<{ data: T | null; error: ReturnType<typeof toAppError> | null }> {
  try {
    const { data, error } = await promise;
    if (error) {
      const app = handleClientError(error, {
        userMessage: opts.fallbackMessage,
        scope: opts.scope ?? "supabase",
        silent: opts.silent,
      });
      return { data: null, error: app };
    }
    return { data, error: null };
  } catch (err) {
    const app = handleClientError(err, {
      userMessage: opts.fallbackMessage,
      scope: opts.scope ?? "supabase",
      silent: opts.silent,
    });
    return { data: null, error: app };
  }
}