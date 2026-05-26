import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput, passwordStrength } from "@/components/auth/PasswordInput";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { clearLockout } from "@/lib/auth-lockout.functions";
import { useT } from "@/components/i18n/LocaleProvider";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Way Home" },
      { name: "description", content: "Defina uma nova senha para sua conta Way Home." },
      { name: "theme-color", content: "#0f0f0f" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const t = useT();
  const clearLock = useServerFn(clearLockout);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const strength = useMemo(() => passwordStrength(password), [password]);
  const barColor = ["bg-destructive", "bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"][strength.score];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError(t("auth.passwordMin8")); return; }
    if (password !== confirm) { setError(t("auth.passwordsDontMatch")); return; }
    setLoading(true);
    const { data: updated, error: err } = await supabase.auth.updateUser({ password });
    if (!err) {
      const email = updated?.user?.email;
      if (email) {
        try { await clearLock({ data: { email } }); } catch { /* noop */ }
      }
    }
    setLoading(false);
    if (err) { setError(err.message); return; }
    window.__showRouteLoading?.(); navigate({ to: "/login" });
  };

  return (
    <AuthShell
      title={t("auth.resetTitle")}
      subtitle={t("auth.resetSubtitle")}
      footer={<><Link to="/login" className="text-brand font-medium hover:underline">{t("auth.backToLogin")}</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.newPassword")}</Label>
          <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder={t("auth.passwordMin")} />
          {password.length > 0 && (
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className={`h-full transition-all ${barColor}`} style={{ width: `${(strength.score / 4) * 100}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{t("auth.strength")}: {strength.label}</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t("auth.confirmNewPassword")}</Label>
          <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90 h-11 text-base font-semibold" disabled={loading}>
          {loading ? (<><Loader2 className="animate-spin" /> {t("common.saving")}</>) : t("auth.resetCta")}
        </Button>
      </form>
    </AuthShell>
  );
}
