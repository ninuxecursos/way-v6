import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { notifyError, notifySuccess } from "@/lib/notify";
import { ShieldCheck, ShieldAlert, KeyRound } from "lucide-react";
import { useT } from "@/components/i18n/LocaleProvider";
import { useConfirmDelete } from "@/components/common/ConfirmDeleteProvider";

export const Route = createFileRoute("/conta/seguranca")({
  component: SecurityPage,
});

function SecurityPage() {
  const { user } = useAuth();
  const t = useT();
  const confirmDelete = useConfirmDelete();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loadingPw, setLoadingPw] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [loadingEmail, setLoadingEmail] = useState(false);

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { notifyError(t("auth.passwordMin8")); return; }
    if (pw !== pw2) { notifyError(t("auth.passwordsDontMatch")); return; }
    setLoadingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoadingPw(false);
    if (error) notifyError(error);
    else { setPw(""); setPw2(""); notifySuccess(t("account.security.passwordUpdated")); }
  };

  const changeEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || email === user?.email) return;
    setLoadingEmail(true);
    const { error } = await supabase.auth.updateUser({ email });
    setLoadingEmail(false);
    if (error) notifyError(error);
    else notifySuccess(t("account.security.emailConfirmSent"));
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{t("account.security.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("account.security.subtitle")}</p>
      </header>

      <TwoFactorSection />

      <Card className="p-5">
        <h2 className="font-display font-bold mb-3">{t("account.security.changePassword")}</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw">{t("account.security.newPassword")}</Label>
            <PasswordInput id="pw" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">{t("account.security.confirmNewPassword")}</Label>
            <PasswordInput id="pw2" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loadingPw} className="bg-brand text-brand-foreground hover:bg-brand/90">
            {loadingPw ? t("common.saving") : t("account.security.updatePassword")}
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-display font-bold mb-3">{t("account.security.changeEmail")}</h2>
        <form onSubmit={changeEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loadingEmail} variant="outline">
            {loadingEmail ? t("common.sending") : t("account.security.requestChange")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("account.security.emailConfirmHint")}</p>
        </form>
      </Card>
    </div>
  );
}

type FactorState = {
  enrolled: boolean;
  factorId: string | null;
  qr: string | null;
  secret: string | null;
};

function TwoFactorSection() {
  const t = useT();
  const confirmDelete = useConfirmDelete();
  const [state, setState] = useState<FactorState>({ enrolled: false, factorId: null, qr: null, secret: null });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const refresh = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return;
    const totp = data?.totp?.find((f) => f.status === "verified");
    setState((s) => ({ ...s, enrolled: !!totp, factorId: totp?.id ?? null }));
  };

  useEffect(() => { refresh(); }, []);

  const startEnroll = async () => {
    setBusy(true);
    // Remove fatores não verificados antigos para evitar erro de duplicidade.
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.totp ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Way Home" });
    setBusy(false);
    if (error) { notifyError(error); return; }
    setState({ enrolled: false, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setEnrolling(true);
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!state.factorId) return;
    setBusy(true);
    const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId: state.factorId });
    if (chalErr || !chal) { setBusy(false); notifyError(chalErr ?? t("account.security.challengeFailed")); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId: state.factorId, challengeId: chal.id, code });
    setBusy(false);
    if (error) { notifyError(error); return; }
    notifySuccess(t("account.security.activated"));
    setEnrolling(false);
    setCode("");
    refresh();
  };

  const disable = async () => {
    if (!state.factorId) return;
    const ok = await confirmDelete({
      title: t("account.security.deactivate"),
      description: t("account.security.deactivateConfirm"),
      confirmButtonLabel: t("account.security.deactivate"),
    });
    if (!ok) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: state.factorId });
    setBusy(false);
    if (error) { notifyError(error); return; }
    notifySuccess(t("account.security.deactivated"));
    setState({ enrolled: false, factorId: null, qr: null, secret: null });
    setEnrolling(false);
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-lg ${state.enrolled ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"}`}>
            {state.enrolled ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          </div>
          <div>
            <h2 className="font-display font-bold">{t("account.security.twoFactor")}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {state.enrolled ? t("account.security.twoFactorOnDesc") : t("account.security.twoFactorOffDesc")}
            </p>
          </div>
        </div>
        {state.enrolled && (
          <Button variant="outline" size="sm" onClick={disable} disabled={busy}>{t("account.security.deactivate")}</Button>
        )}
      </div>

      {!state.enrolled && !enrolling && (
        <div className="mt-4">
          <Button onClick={startEnroll} disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand/90">
            <KeyRound size={14} className="mr-1.5" /> {busy ? t("account.security.preparing") : t("account.security.activate2fa")}
          </Button>
        </div>
      )}

      {enrolling && state.qr && (
        <form onSubmit={verify} className="mt-5 space-y-4 border-t border-border pt-5">
          <div className="flex flex-col md:flex-row gap-5 items-start">
            <div className="rounded-lg border border-border bg-white p-3">
              <img src={state.qr} alt="QR Code 2FA" className="h-44 w-44" />
            </div>
            <div className="flex-1 space-y-2 text-sm">
              <p className="font-medium">{t("account.security.scanStep")}</p>
              <p className="text-muted-foreground">{t("account.security.manualKey")}</p>
              <code className="block bg-muted px-3 py-2 rounded font-mono text-xs break-all select-all">
                {state.secret}
              </code>
              <p className="font-medium pt-2">{t("account.security.codeStep")}</p>
            </div>
          </div>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="totp">{t("account.security.codeLabel")}</Label>
            <Input
              id="totp"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || code.length !== 6} className="bg-brand text-brand-foreground hover:bg-brand/90">
              {busy ? t("account.security.verifying") : t("account.security.confirmActivate")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setEnrolling(false); disable(); }}>
              {t("account.security.cancel")}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
