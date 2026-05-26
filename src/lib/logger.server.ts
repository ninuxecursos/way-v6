/**
 * Logger estruturado server-side.
 * Usar APENAS dentro de server functions / server routes / arquivos *.server.ts.
 */
import { serializeError, toAppError } from "./errors";

export type LogContext = {
  scope?: string;
  userId?: string | null;
  route?: string;
  requestId?: string;
  extra?: Record<string, unknown>;
};

export function logServerError(err: unknown, ctx: LogContext = {}) {
  const app = toAppError(err);
  const payload = {
    level: "error",
    timestamp: new Date().toISOString(),
    scope: ctx.scope ?? "server",
    userId: ctx.userId ?? null,
    route: ctx.route ?? null,
    requestId: ctx.requestId ?? null,
    ...(ctx.extra ?? {}),
    ...serializeError(app, { includeStack: true }),
  };
  // console.error preserva stack nos Worker logs.
  console.error(JSON.stringify(payload));
}

export function logServerWarning(message: string, ctx: LogContext = {}) {
  console.warn(JSON.stringify({
    level: "warn",
    timestamp: new Date().toISOString(),
    scope: ctx.scope ?? "server",
    message,
    userId: ctx.userId ?? null,
    route: ctx.route ?? null,
    requestId: ctx.requestId ?? null,
    ...(ctx.extra ?? {}),
  }));
}