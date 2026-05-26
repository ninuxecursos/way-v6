/**
 * Hook + Provider do fluxo de reserva.
 * Mantém o estado em memória sincronizado com sessionStorage.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  emptyReservationState,
  loadReservationState,
  saveReservationState,
  clearReservationState,
} from "@/services/reservation.service";
import type {
  ModalityChoice,
  ParticipantData,
  ReservationState,
  TermsAcceptance,
} from "@/types/reservation";
import { useAuth } from "@/hooks/use-auth";
import {
  loadReservationDraft,
  saveReservationDraft,
  clearReservationDraft,
} from "@/lib/reservation-draft.functions";
import { reservationStateSchema } from "@/schemas/reservation";

interface ReservationContextValue {
  state: ReservationState;
  hydrated: boolean;
  setModality: (m: ModalityChoice) => void;
  setParticipant: (p: ParticipantData) => void;
  setTerms: (t: TermsAcceptance) => void;
  setGateway: (id: string | undefined) => void;
  reset: () => void;
}

const ReservationContext = createContext<ReservationContextValue | null>(null);

export function ReservationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ReservationState>(() => emptyReservationState());
  const [hydrated, setHydrated] = useState(false);
  const { user } = useAuth();
  const loadDraftFn = useServerFn(loadReservationDraft);
  const saveDraftFn = useServerFn(saveReservationDraft);
  const clearDraftFn = useServerFn(clearReservationDraft);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerialized = useRef<string>("");
  const remoteHydratedFor = useRef<string | null>(null);

  // Hidratação client-only para evitar mismatch SSR.
  useEffect(() => {
    const persisted = loadReservationState();
    if (persisted) setState(persisted);
    setHydrated(true);
  }, []);

  // Mescla o rascunho remoto (Supabase) ao logar — vence o mais recente.
  useEffect(() => {
    if (!hydrated || !user) {
      remoteHydratedFor.current = null;
      return;
    }
    if (remoteHydratedFor.current === user.id) return;
    remoteHydratedFor.current = user.id;
    (async () => {
      try {
        const remote = await loadDraftFn();
        const remoteState = remote?.state ? reservationStateSchema.safeParse(remote.state) : null;
        if (remoteState?.success) {
          setState((local) => {
            if (!local.modality && !local.participant) return remoteState.data;
            return remoteState.data.updatedAt > local.updatedAt ? remoteState.data : local;
          });
        }
      } catch {
        /* noop — se falhar, segue só com sessionStorage */
      }
    })();
  }, [hydrated, user, loadDraftFn]);

  const update = useCallback((patch: Partial<ReservationState>) => {
    setState((prev) => {
      const next: ReservationState = { ...prev, ...patch, updatedAt: Date.now() };
      saveReservationState(next);
      return next;
    });
  }, []);

  // Debounce: ao mudar o estado e usuário logado, sincroniza com Supabase.
  useEffect(() => {
    if (!hydrated || !user) return;
    if (!state.modality && !state.participant && !state.terms) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraftFn({ data: { state: state as unknown as Record<string, never> } }).catch(
        () => undefined,
      );
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, hydrated, user, saveDraftFn]);

  const value = useMemo<ReservationContextValue>(
    () => ({
      state,
      hydrated,
      setModality: (modality) => update({ modality }),
      setParticipant: (participant) => update({ participant }),
      setTerms: (terms) => update({ terms }),
      setGateway: (gatewayId) => update({ gatewayId }),
      reset: () => {
        clearReservationState();
        setState(emptyReservationState());
        if (user) clearDraftFn().catch(() => undefined);
      },
    }),
    [state, hydrated, update, user, clearDraftFn],
  );

  return (
    <ReservationContext.Provider value={value}>{children}</ReservationContext.Provider>
  );
}

export function useReservation(): ReservationContextValue {
  const ctx = useContext(ReservationContext);
  if (!ctx) {
    // Fora do ReservationProvider (ex.: /conta), devolve um stub somente-leitura
    // hidratado a partir do sessionStorage. Evita quebra ao consultar rascunho
    // de reserva pendente em telas fora do fluxo de reserva.
    const persisted = loadReservationState() ?? emptyReservationState();
    return {
      state: persisted,
      hydrated: true,
      setModality: () => undefined,
      setParticipant: () => undefined,
      setTerms: () => undefined,
      setGateway: () => undefined,
      reset: () => clearReservationState(),
    };
  }
  return ctx;
}