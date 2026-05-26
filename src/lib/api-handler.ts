/**
 * Wrapper para handlers de rotas API públicas/admin.
 * Garante resposta JSON consistente em erro e log estruturado.
 */
import { toAppError, serializeError } from "./errors";
import { logServerError } from "./logger.server";

type Handler = (ctx: { request: Request; params: Record<string, string> }) => Promise<Response> | Response;

export function withApiErrorHandler(scope: string, handler: Handler): Handler {
  return async (ctx) => {
    try {
      return await handler(ctx);
    } catch (err) {
      const app = toAppError(err);
      logServerError(app, {
        scope,
        route: new URL(ctx.request.url).pathname,
        extra: { method: ctx.request.method },
      });
      return Response.json(
        { error: serializeError(app) },
        { status: app.status, headers: { "content-type": "application/json" } },
      );
    }
  };
}

export function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return Response.json({ error: { code, message, status } }, { status });
}

export function jsonOk<T>(data: T, init: ResponseInit = {}) {
  return Response.json(data, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
}