import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput, passwordStrength } from "@/components/auth/PasswordInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Check, X, Mail } from "lucide-react";
import { useT } from "@/components/i18n/LocaleProvider";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { useServerFn } from "@tanstack/react-start";
import { sendServerEvent } from "@/lib/tracking-send.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Senha mínima de 8 caracteres").max(100),
  confirm: z.string(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Você precisa aceitar os termos e a política de privacidade" }) }),
}).refine((d) => d.password === d.confirm, { message: "As senhas não coincidem", path: ["confirm"] });

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Criar conta — Way Home" },
      { name: "description", content: "Crie sua conta Way Home e acompanhe seus pacotes Tomorrowland Brasil em um só lugar." },
      { name: "theme-color", content: "#0f0f0f" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const t = useT();
  const fireServerEvent = useServerFn(sendServerEvent);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const barColor = ["bg-destructive", "bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"][strength.score];
  const checks = useMemo(() => ([
    { ok: password.length >= 8, label: "Pelo menos 8 caracteres" },
    { ok: /[A-Z]/.test(password) && /[a-z]/.test(password), label: "Letras maiúsculas e minúsculas" },
    { ok: /\d/.test(password), label: "Pelo menos um número" },
    { ok: /[^A-Za-z0-9]/.test(password), label: "Pelo menos um símbolo (!@#…)" },
  ]), [password]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ name, email, password, confirm, acceptTerms });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? t("auth.invalidData")); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: getAuthRedirectUrl("/conta"),
        data: { display_name: parsed.data.name, full_name: parsed.data.name },
      },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    const w = window as unknown as { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void };
    try { w.fbq?.("track", "CompleteRegistration", { content_name: "signup" }); } catch {}
    try { w.gtag?.("event", "sign_up", { method: "email" }); } catch {}
    fireServerEvent({
      data: {
        event: "CompleteRegistration",
        url: typeof window !== "undefined" ? window.location.href : undefined,
        user: {
          email: parsed.data.email,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
      },
    }).catch(() => {});
    setShowSuccessModal(true);
  };

  return (
    <AuthShell
      title={t("auth.signupTitle")}
      subtitle={t("auth.signupSubtitle")}
      footer={<>{t("auth.hasAccount")} <Link to="/login" className="text-brand font-medium hover:underline">{t("auth.signIn")}</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="space-y-2">
          <Label htmlFor="name">{t("auth.fullName")}</Label>
          <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder={t("auth.namePlaceholder")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder={t("auth.emailPlaceholder")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder={t("auth.passwordMin")} />
          {password.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className={`h-full transition-all ${barColor}`} style={{ width: `${(strength.score / 4) * 100}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{t("auth.strength")}: {strength.label}</p>
              <ul className="grid gap-1 pt-1">
                {checks.map((c) => (
                  <li key={c.label} className={`flex items-center gap-2 text-xs ${c.ok ? "text-emerald-500" : "text-muted-foreground"}`}>
                    {c.ok ? <Check size={14} className="shrink-0" /> : <X size={14} className="shrink-0 opacity-60" />}
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
          <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <div className="flex items-start gap-3 pt-1">
          <Checkbox
            id="terms"
            checked={acceptTerms}
            onCheckedChange={(v) => setAcceptTerms(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground font-normal cursor-pointer">
            Li e aceito os{" "}
            <Link to="/termos" className="text-brand hover:underline font-medium">Termos de Uso</Link>
            {" "}e a{" "}
            <Link to="/privacidade" className="text-brand hover:underline font-medium">Política de Privacidade</Link>.
          </Label>
        </div>
        <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90 h-11 text-base font-semibold" disabled={loading}>
          {loading ? (<><Loader2 className="animate-spin" /> {t("auth.signingUp")}</>) : t("auth.signUp")}
        </Button>
      </form>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md bg-[#0a0a0a] border-white/10 text-white">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Mail className="h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-bold font-display tracking-tight">
              Verifique seu e-mail
            </DialogTitle>
            <DialogDescription className="text-white/60 text-base mt-2">
              Enviamos um link de confirmação para <strong>{email}</strong>. 
              Por favor, verifique sua caixa de entrada (e a pasta de spam) para ativar sua conta.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-3">
            <Button 
              onClick={() => {
                setShowSuccessModal(false);
                navigate({ to: "/login" });
              }}
              className="bg-brand text-brand-foreground hover:bg-brand/90 font-bold uppercase tracking-wider h-12"
            >
              Ir para o Login
            </Button>
            <p className="text-xs text-center text-white/40">
              Após confirmar o e-mail, você poderá acessar todos os benefícios Way Home.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </AuthShell>
  );
}
