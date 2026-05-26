/**
 * Provider global de confirmação de exclusão "avançada".
 *
 * Toda exclusão sensível do app passa por aqui:
 *  1. Diálogo modal explicando o que será apagado.
 *  2. Usuário precisa digitar uma palavra de confirmação (default: EXCLUIR).
 *  3. Usuário precisa informar a senha da conta atualmente logada — validamos
 *     com `signInWithPassword` antes de chamar `onConfirm`.
 *
 * Uso:
 *   const confirmDelete = useConfirmDelete();
 *   const ok = await confirmDelete({
 *     title: "Excluir gateway?",
 *     description: "Esta ação é permanente.",
 *     resourceLabel: gateway.name,
 *   });
 *   if (ok) await doDelete();
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export interface ConfirmDeleteOptions {
  title?: string;
  description?: string;
  /** Texto curto identificando o item (ex: nome do produto). Mostrado em destaque. */
  resourceLabel?: string;
  /** Palavra que o usuário precisa digitar para liberar o botão. Default: "EXCLUIR". */
  confirmWord?: string;
  confirmButtonLabel?: string;
}

type Resolver = (ok: boolean) => void;

const ConfirmDeleteContext = createContext<((opts?: ConfirmDeleteOptions) => Promise<boolean>) | null>(null);

export function useConfirmDelete() {
  const ctx = useContext(ConfirmDeleteContext);
  if (!ctx) throw new Error("useConfirmDelete deve ser usado dentro de <ConfirmDeleteProvider>");
  return ctx;
}

export function ConfirmDeleteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmDeleteOptions>({});
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resolverRef = useRef<Resolver | null>(null);

  const reset = useCallback(() => {
    setTyped("");
    setPassword("");
    setError(null);
    setBusy(false);
  }, []);

  const request = useCallback((options: ConfirmDeleteOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpts(options);
      reset();
      setOpen(true);
    });
  }, [reset]);

  const finish = useCallback((ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setOpen(false);
    // Pequeno atraso para a animação de fechamento.
    setTimeout(reset, 150);
  }, [reset]);

  const confirmWord = (opts.confirmWord ?? "EXCLUIR").trim();
  const wordOk = typed.trim().toUpperCase() === confirmWord.toUpperCase();
  const canSubmit = wordOk && password.length > 0 && !busy;

  const handleConfirm = useCallback(async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user?.email) {
        setError("Sessão expirada. Faça login novamente.");
        setBusy(false);
        return;
      }
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password,
      });
      if (signInErr) {
        setError("Senha incorreta. Tente novamente.");
        setBusy(false);
        return;
      }
      finish(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao validar senha.");
      setBusy(false);
    }
  }, [canSubmit, password, finish]);

  return (
    <ConfirmDeleteContext.Provider value={request}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (busy) return;
          if (!v) finish(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-destructive/10 p-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <DialogTitle>{opts.title ?? "Confirmar exclusão"}</DialogTitle>
            </div>
            <DialogDescription>
              {opts.description ?? "Esta ação é permanente e não pode ser desfeita."}
            </DialogDescription>
          </DialogHeader>

          {opts.resourceLabel && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Item:</span>{" "}
              <strong className="break-all">{opts.resourceLabel}</strong>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="confirm-word">
                Digite <strong className="font-mono">{confirmWord}</strong> para liberar
              </Label>
              <Input
                id="confirm-word"
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={confirmWord}
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Sua senha de acesso</Label>
              <Input
                id="confirm-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) handleConfirm(); }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Confirmamos sua identidade antes de excluir.
              </p>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">{error}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => finish(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={!canSubmit}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {opts.confirmButtonLabel ?? "Excluir definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmDeleteContext.Provider>
  );
}