/**
 * Tratamento de erros padronizado para o app.
 * Compartilhado entre cliente e servidor — não importar nada server-only aqui.
 */

export type AppErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "VALIDATION"
  | "DATABASE"
  | "EXTERNAL"
  | "CONFIG"
  | "INTERNAL";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  DATABASE: 500,
  EXTERNAL: 502,
  CONFIG: 503,
  INTERNAL: 500,
};

/**
 * Erro com mensagem segura para exibir ao usuário e código estável.
 * Sempre prefira lançar AppError em server functions e helpers críticos.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly cause?: unknown;
  readonly userMessage: string;

  constructor(
    code: AppErrorCode,
    userMessage: string,
    options?: { cause?: unknown; status?: number },
  ) {
    super(userMessage);
    this.name = "AppError";
    this.code = code;
    this.userMessage = userMessage;
    this.status = options?.status ?? STATUS_BY_CODE[code];
    this.cause = options?.cause;
  }
}

/** Mensagens amigáveis para códigos comuns do PostgREST/Postgres. */
const PG_FRIENDLY: Record<string, { code: AppErrorCode; message: string }> = {
  PGRST116: { code: "NOT_FOUND", message: "Registro não encontrado." },
  PGRST301: { code: "UNAUTHORIZED", message: "Sessão expirada. Entre novamente." },
  "23505": { code: "CONFLICT", message: "Esse registro já existe." },
  "23503": { code: "BAD_REQUEST", message: "Referência inválida." },
  "23502": { code: "VALIDATION", message: "Campo obrigatório ausente." },
  "42501": { code: "FORBIDDEN", message: "Você não tem permissão para esta ação." },
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Converte qualquer throwable em AppError sem vazar detalhes sensíveis. */
export function toAppError(err: unknown, fallbackMessage = "Algo deu errado. Tente novamente."): AppError {
  if (err instanceof AppError) return err;

  const rawMsg =
    err instanceof Error ? err.message :
    isObject(err) && typeof err.message === "string" ? (err.message as string) : "";
  if (
    rawMsg.includes("Missing Supabase environment variable") ||
    /access[_-]?token ausente/i.test(rawMsg) ||
    /Nenhum gateway de pagamento ativo/i.test(rawMsg)
  ) {
    return new AppError(
      "CONFIG",
      "Esta funcionalidade ainda não foi configurada no painel. Acesse Admin → Configurações para finalizar a integração.",
      { cause: err },
    );
  }

  // Erro tipo Supabase/PostgREST: { code, message, details, hint }
  if (isObject(err) && typeof err.code === "string") {
    const mapped = PG_FRIENDLY[err.code as string];
    if (mapped) return new AppError(mapped.code, mapped.message, { cause: err });
  }

  // Response thrown (h3 / fetch)
  if (err instanceof Response) {
    const status = err.status;
    const code: AppErrorCode =
      status === 401 ? "UNAUTHORIZED"
      : status === 403 ? "FORBIDDEN"
      : status === 404 ? "NOT_FOUND"
      : status === 409 ? "CONFLICT"
      : status === 429 ? "RATE_LIMITED"
      : status >= 500 ? "EXTERNAL" : "BAD_REQUEST";
    return new AppError(code, fallbackMessage, { cause: err, status });
  }

  if (err instanceof Error) {
    return new AppError("INTERNAL", err.message || fallbackMessage, { cause: err });
  }

  return new AppError("INTERNAL", fallbackMessage, { cause: err });
}

/** Versão JSON-safe para logs/respostas. Nunca inclui stack para o cliente. */
export function serializeError(err: unknown, opts: { includeStack?: boolean } = {}) {
  const e = toAppError(err);
  return {
    name: e.name,
    code: e.code,
    status: e.status,
    message: e.userMessage,
    ...(opts.includeStack && e.stack ? { stack: e.stack } : {}),
  };
}

/** Mensagem segura para exibir no UI (toast, fallback). */
export function getUserMessage(err: unknown): string {
  return toAppError(err).userMessage;
}