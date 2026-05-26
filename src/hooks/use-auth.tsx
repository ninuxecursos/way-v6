/**
 * Hook e Provider de autenticação Supabase.
 * - Mantém sessão e usuário em estado React.
 * - Carrega papéis do usuário (RBAC) da tabela user_roles.
 * - Expõe helpers `hasRole` e `isAdmin` para gates de UI.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "editor" | "financeiro" | "customer";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_QUERY_TIMEOUT_MS = 2500;
const ROLES_CACHE_TTL_MS = 5 * 60_000;
const ROLES_CACHE_PREFIX = "wh:roles:";

function readCachedRoles(uid: string, allowStale = false): AppRole[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ROLES_CACHE_PREFIX + uid);
    if (!raw) return null;
    const { roles, at } = JSON.parse(raw) as { roles: AppRole[]; at: number };
    if (!allowStale && Date.now() - at > ROLES_CACHE_TTL_MS) return null;
    return roles;
  } catch { return null; }
}

function writeCachedRoles(uid: string, roles: AppRole[]) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(ROLES_CACHE_PREFIX + uid, JSON.stringify({ roles, at: Date.now() })); } catch { /* noop */ }
}

function withTimeout<T>(promise: PromiseLike<T>, ms = AUTH_QUERY_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("auth-timeout")), ms)),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);
  const userRef = useRef<User | null>(null);
  const rolesRef = useRef<AppRole[]>([]);
  const signingOutRef = useRef(false);

  const setCurrentSession = (nextSession: Session | null) => {
    sessionRef.current = nextSession;
    userRef.current = nextSession?.user ?? null;
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
  };

  const setCurrentRoles = (nextRoles: AppRole[]) => {
    rolesRef.current = nextRoles;
    setRoles(nextRoles);
  };

  const loadRoles = async (uid: string): Promise<AppRole[]> => {
    // fix(S4): consulta única em user_roles. Antes, em caso de falha, o fallback
    // RPC is_admin retornava ["admin"] mesmo para super_admin — colapsando o papel
    // real. Agora retornamos [] em falha; gates pesados continuam funcionando
    // porque o servidor revalida o papel via RLS/middleware.
    try {
      const { data, error } = await withTimeout(
        supabase.from("user_roles").select("role").eq("user_id", uid),
      );
      if (error) {
        // eslint-disable-next-line no-console
        console.error("[auth] loadRoles falhou:", error);
        return readCachedRoles(uid, true) ?? (userRef.current?.id === uid ? rolesRef.current : []);
      }
      return (data ?? []).map((r) => r.role as AppRole);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[auth] loadRoles timeout:", e);
      return readCachedRoles(uid, true) ?? (userRef.current?.id === uid ? rolesRef.current : []);
    }
  };

  useEffect(() => {
    let active = true;
    // fix(B5): dedupe — getSession + INITIAL_SESSION disparam applySession 2×.
    let lastAppliedKey: string | null = null;

    const applySession = async (newSession: Session | null) => {
      const key = newSession?.user?.id
        ? `${newSession.user.id}:${newSession.access_token ?? ""}`
        : "anon";
      if (key === lastAppliedKey) {
        if (loading) setLoading(false);
        return;
      }
      lastAppliedKey = key;
      const previousSession = sessionRef.current;
      if (!newSession?.user && previousSession?.user && !signingOutRef.current) {
        window.setTimeout(async () => {
          if (!active || signingOutRef.current) return;
          const { data: { session: confirmedSession } } = await supabase.auth.getSession();
          if (!active || confirmedSession?.user || sessionRef.current?.user?.id !== previousSession.user.id) return;
          setCurrentSession(null);
          setCurrentRoles([]);
        }, 500);
        setLoading(false);
        return;
      }
      if (newSession?.user) {
        signingOutRef.current = false;
      }
      setCurrentSession(newSession);

      if (!newSession?.user) {
        setCurrentRoles([]);
        setLoading(false);
        return;
      }

      // Cache hit: usa imediatamente, evita refetch a cada navegação.
      const cached = readCachedRoles(newSession.user.id);
      if (cached) {
        setCurrentRoles(cached);
        setLoading(false);
        return;
      }

      try {
        const nextRoles = await loadRoles(newSession.user.id);
        if (!active) return;
        setCurrentRoles(nextRoles);
        writeCachedRoles(newSession.user.id, nextRoles);
      } catch {
        if (!active) return;
        // Falha: mantém roles atuais em vez de zerar (evita flicker).
      } finally {
        if (active) setLoading(false);
      }
    };

    // CRÍTICO: Listener PRIMEIRO, getSession depois (evita race condition).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Recuperação de senha: força o usuário para /reset-password antes que
      // qualquer outra rota consuma a sessão como login normal.
      if (event === "PASSWORD_RECOVERY" && typeof window !== "undefined") {
        if (window.location.pathname !== "/reset-password") {
          window.location.replace("/reset-password");
          return;
        }
      }
      // TOKEN_REFRESHED não muda usuário — não disparar loading (evita re-renders pesados).
      if (event !== "TOKEN_REFRESHED" && event !== "USER_UPDATED") {
        setLoading(true);
      }
      // Defer: chamadas Supabase dentro do callback podem deadlockar.
      setTimeout(() => applySession(newSession), 0);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => applySession(s))
      .catch(() => applySession(null));

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // perf(P2): memoizar o value evita re-render em todos os consumers a cada
  // render do AuthProvider. Só muda quando session/user/roles/loading mudam.
  const value = useMemo<AuthContextValue>(() => ({
    session,
    user,
    roles,
    loading,
    hasRole: (role) => roles.includes(role),
    isAdmin: roles.includes("admin") || roles.includes("super_admin"),
    signOut: async () => {
      signingOutRef.current = true;
      setLoading(true);
      setCurrentSession(null);
      setCurrentRoles([]);
      const { error } = await supabase.auth.signOut();
      setLoading(false);
      if (error) throw error;
    },
    refreshRoles: async () => {
      const u = userRef.current;
      if (u) setCurrentRoles(await loadRoles(u.id));
    },
  }), [session, user, roles, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}