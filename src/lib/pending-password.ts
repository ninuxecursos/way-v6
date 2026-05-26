/**
 * Armazenamento efêmero da senha do visitante entre o quiz e o aceite dos
 * termos. Usa sessionStorage (per-aba, limpo ao fechar) — JAMAIS é persistido
 * em banco. A chave é vinculada ao e-mail para evitar reuso entre cadastros.
 */
const KEY_PREFIX = "wh:pending-pwd:";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function setPendingPassword(email: string, password: string): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(KEY_PREFIX + email.toLowerCase(), password);
  } catch {
    /* noop */
  }
}

export function getPendingPassword(email: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage.getItem(KEY_PREFIX + email.toLowerCase());
  } catch {
    return null;
  }
}

export function clearPendingPassword(email: string): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(KEY_PREFIX + email.toLowerCase());
  } catch {
    /* noop */
  }
}