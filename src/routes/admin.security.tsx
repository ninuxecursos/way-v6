import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, KeyRound, Loader2, Trash2 } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useConfirmDelete } from "@/components/common/ConfirmDeleteProvider";

type Factor = { id: string; friendly_name?: string | null; factor_type: string; status: string };

export const Route = createFileRoute("/admin/security")({ component: SecurityPage });

function SecurityPage() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollState, setEnrollState] = useState<{
    id: string;
    qr: string;
    secret: string;
    uri: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [aal, setAal] = useState<string>("aal1");
  const confirmDelete = useConfirmDelete();

  const reload = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const all = [...(data?.totp ?? []), ...(data?.phone ?? [])] as Factor[];
      setFactors(all);
      const a = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setAal(a.data?.currentLevel ?? "aal1");
    } catch (e) {
      notifyError(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    reload();
  }, []);

  const startEnroll = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Admin TOTP ${new Date().toLocaleDateString("pt-BR")}`,
      });
      if (error) throw error;
      const totp = data?.totp;
      if (!totp) throw new Error("Falha ao iniciar enroll.");
      setEnrollState({ id: data!.id, qr: totp.qr_code, secret: totp.secret, uri: totp.uri });
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  };

  const finishEnroll = async () => {
    if (!enrollState) return;
    setBusy(true);
    try {
      const ch = await supabase.auth.mfa.challenge({ factorId: enrollState.id });
      if (ch.error) throw ch.error;
      const v = await supabase.auth.mfa.verify({
        factorId: enrollState.id,
        challengeId: ch.data!.id,
        code: code.trim(),
      });
      if (v.error) throw v.error;
      notifySuccess("2FA ativado");
      setEnrollState(null);
      setCode("");
      await reload();
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  };

  const removeFactor = async (f: Factor) => {
    const ok = await confirmDelete({
      title: "Remover este fator de 2FA?",
      description: "Sua conta voltará a depender apenas de senha. Recomendado manter ao menos um fator ativo.",
      resourceLabel: f.friendly_name ?? f.id,
      confirmButtonLabel: "Remover",
      confirmWord: "REMOVER",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
      if (error) throw error;
      notifySuccess("Fator removido");
      await reload();
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 mb-6">
        <ShieldCheck className="h-7 w-7" />
        Segurança da conta
      </h1>

      <div className="bg-card border rounded-lg p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Autenticação em dois fatores (TOTP)
            </h2>
            <p className="text-sm text-muted-foreground">
              Use um app autenticador (Google Authenticator, Authy, 1Password) para gerar códigos de 6 dígitos.
            </p>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded ${
              aal === "aal2" ? "bg-green-500/20" : "bg-muted text-muted-foreground"
            }`}
          >
            Nível atual: {aal.toUpperCase()}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : factors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum fator cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {factors.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between border rounded p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{f.friendly_name ?? "Sem nome"}</div>
                  <div className="text-xs text-muted-foreground uppercase">
                    {f.factor_type} · {f.status}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFactor(f)}
                  disabled={busy}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!enrollState && (
          <Button className="mt-4" onClick={startEnroll} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Adicionar novo fator
          </Button>
        )}
      </div>

      {enrollState && (
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">Escaneie no seu app autenticador</h2>
          <div className="flex justify-center">
            <img
              src={enrollState.qr}
              alt="QR code TOTP"
              className="border rounded bg-white p-2 w-56 h-56"
            />
          </div>
          <div className="text-xs">
            <Label>Ou digite o segredo manualmente:</Label>
            <code className="block bg-muted p-2 rounded mt-1 break-all font-mono">
              {enrollState.secret}
            </code>
          </div>
          <div>
            <Label>Código de 6 dígitos</Label>
            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="font-mono text-center text-lg tracking-widest"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await supabase.auth.mfa.unenroll({ factorId: enrollState.id });
                } catch {
                  /* ignore */
                }
                setEnrollState(null);
                setCode("");
              }}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button onClick={finishEnroll} disabled={busy || code.length < 6}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar e ativar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}