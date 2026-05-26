import { toast } from "sonner";

const SUPABASE_MESSAGE_MAP: Array<[RegExp, string]> = [
  [/duplicate key/i, "Já existe um registro com esses dados."],
  [/permission denied|row[- ]level security|forbidden|unauthorized|not authorized/i, "Você não tem permissão para essa ação."],
  [/jwt expired|invalid jwt/i, "Sua sessão expirou. Faça login novamente."],
  [/network|failed to fetch|load failed/i, "Falha de conexão. Verifique sua internet e tente novamente."],
  [/timeout/i, "A operação demorou demais. Tente novamente."],
  [/not found/i, "Registro não encontrado."],
];

export function getErrorMessage(err: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (!err) return fallback;
  let raw = "";
  if (typeof err === "string") raw = err;
  else if (err instanceof Error) raw = err.message;
  else if (typeof err === "object" && err !== null) {
    const anyErr = err as Record<string, unknown>;
    raw = String(anyErr.message ?? anyErr.error ?? "");
  } else raw = String(err);
  if (!raw) return fallback;
  for (const [pat, msg] of SUPABASE_MESSAGE_MAP) {
    if (pat.test(raw)) return msg;
  }
  return raw.length > 200 ? raw.slice(0, 200) + "…" : raw;
}

export function notifyError(err: unknown, fallback?: string): void {
  console.error(err);
  toast.error(getErrorMessage(err, fallback));
}

export function notifySuccess(message: string): void {
  toast.success(message);
}

export function notifyInfo(message: string): void {
  toast(message);
}

export async function notifyPromise<T>(
  promise: Promise<T>,
  messages: { loading: string; success: string; error?: string },
): Promise<T> {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: (err) => getErrorMessage(err, messages.error),
  }).unwrap?.() as Promise<T> ?? promise;
}