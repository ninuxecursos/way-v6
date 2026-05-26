import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { clearLockout, registerFailedLogin } from "@/lib/auth-lockout.functions";
import { useT } from "@/components/i18n/LocaleProvider";

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha mínima de 6 caracteres").max(100),
});

const AUTH_QUERY_TIMEOUT_MS = 2500;

function withTimeout<T>(promise: PromiseLike<T>, ms = AUTH_QUERY_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("auth-timeout")), ms)),
  ]);
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Way Home" },
      { name: "description", content: "Acesse sua conta Way Home para acompanhar pedidos, recibos e dados de cadastro." },
      { name: "theme-color", content: "#0f0f0f" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const safeRedirect = (() => {
    const r = search.redirect;
    if (typeof r !== "string") return null;
    // Aceita apenas paths internos (começa com "/" e sem "//" ou ":")
    if (!r.startsWith("/") || r.startsWith("//") || r.includes(":")) return null;
    return r;
  })();
  const t = useT();
  const registerFail = useServerFn(registerFailedLogin);
  const clearLock = useServerFn(clearLockout);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveDestination = async (userId: string): Promise<"/admin" | "/conta"> => {
    if (safeRedirect) return safeRedirect as "/admin" | "/conta";
    const [rolesResult, adminResult] = await Promise.allSettled([
      withTimeout(supabase.from("user_roles").select("role").eq("user_id", userId)),
      withTimeout(supabase.rpc("is_admin", { _user_id: userId })),
    ]);

    const rolesResponse = rolesResult.status === "fulfilled" ? rolesResult.value : null;
    const hasRole = (rolesResponse?.data ?? []).some((r) => r.role === "admin" || r.role === "super_admin");
    const isAdmin = adminResult.status === "fulfilled" && !adminResult.value.error && !!adminResult.value.data;
    return hasRole || isAdmin ? "/admin" : "/conta";
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active || !session?.user) return;
      window.__showRouteLoading?.(); navigate({ to: await resolveDestination(session.user.id), replace: true });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("auth.invalidData"));
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword(parsed.data);
    if (err) {
      setLoading(false);
      setError(t("auth.invalidCredentials"));
      registerFail({ data: { email: parsed.data.email } }).catch(() => undefined);
      return;
    }
    // Decide destino: admin → /admin, demais → /conta
    const { data: u } = await supabase.auth.getUser();
    const dest = u.user ? await resolveDestination(u.user.id) : "/conta";
    clearLock({ data: { email: parsed.data.email } }).catch(() => undefined);
    setLoading(false);
    window.__showRouteLoading?.(); navigate({ to: dest, replace: true });
  };

  return (
    <AuthShell
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footer={<>{t("auth.noAccount")} <Link to="/signup" className="text-brand font-medium hover:underline">{t("auth.createNow")}</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder={t("auth.emailPlaceholder")} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-brand">{t("auth.forgotPassword")}</Link>
          </div>
          <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90 h-11 text-base font-semibold" disabled={loading}>
          {loading ? (<><Loader2 className="animate-spin" /> {t("auth.signingIn")}</>) : t("auth.signIn")}
        </Button>
      </form>
    </AuthShell>
  );
}