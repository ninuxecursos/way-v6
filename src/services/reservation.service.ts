/**
 * Serviço do fluxo de reserva: persistência segura do estado entre etapas.
 * Usa sessionStorage com TTL e validação Zod na hidratação.
 */
import { reservationStateSchema } from "@/schemas/reservation";
import type { ReservationState } from "@/types/reservation";

const STORAGE_KEY = "wh:reservation:v1";
const TTL_MS = 60 * 60 * 1000; // 60 min

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function loadReservationState(): ReservationState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = reservationStateSchema.safeParse(parsed);
    if (!result.success) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - result.data.updatedAt > TTL_MS) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return result.data as ReservationState;
  } catch {
    return null;
  }
}

export function saveReservationState(state: ReservationState): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, updatedAt: Date.now() }),
    );
  } catch {
    /* quota cheia ou storage bloqueado — ignorar silenciosamente */
  }
}

export function clearReservationState(): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export function emptyReservationState(): ReservationState {
  return { updatedAt: Date.now() };
}