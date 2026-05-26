/**
 * Códigos rotativos (HMAC) para QR Code de check-in.
 * Curta validade (60s) — impede que prints/screenshots vazados sejam
 * reutilizados depois. O token estático em `orders.checkin_token` continua
 * existindo como fallback (papel, e-mail), mas o QR exibido no app rotaciona.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_MS = 60_000;
const HEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secret(): string {
  return (
    process.env.CHECKIN_QR_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "wayhome-checkin-fallback-secret"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex").slice(0, 16);
}

export type RotatingCode = {
  code: string;
  expiresAt: string;
  ttlMs: number;
};

export function buildRotatingCode(orderId: string, ttlMs = DEFAULT_TTL_MS): RotatingCode {
  if (!HEX_UUID.test(orderId)) throw new Error("invalid orderId");
  const exp = Math.floor((Date.now() + ttlMs) / 1000);
  const oid = orderId.replace(/-/g, "").toLowerCase();
  const payload = `${oid}.${exp.toString(36)}`;
  const sig = sign(payload);
  return {
    code: `v1-${oid}-${exp.toString(36)}-${sig}`,
    expiresAt: new Date(exp * 1000).toISOString(),
    ttlMs,
  };
}

export function verifyRotatingCode(input: string): { orderId: string } | null {
  const m = /^v1-([0-9a-f]{32})-([0-9a-z]+)-([0-9a-f]{16})$/i.exec(input.trim());
  if (!m) return null;
  const [, oidHex, expB36, sig] = m;
  const payload = `${oidHex.toLowerCase()}.${expB36.toLowerCase()}`;
  const expected = sign(payload);
  try {
    const a = Buffer.from(sig.toLowerCase(), "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const exp = parseInt(expB36, 36);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  const h = oidHex.toLowerCase();
  const orderId = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  return { orderId };
}

export const CHECKIN_CODE_TTL_MS = DEFAULT_TTL_MS;