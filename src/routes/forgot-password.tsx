import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthShell } from "@/components/auth/AuthShell";
import { Loader2 } from "lucide-react";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";

const schema = z.object({ email: z.string().trim().email("E-mail inválido").max(255) });

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Way Home" },
      { name: "description", content: "Recupere o acesso à sua conta Way Home." },
      { name: "theme-color", content: "#0f0f0f" },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null); setError(null);
    const parsed = schema.safeParse({ email });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "E-mail inválido"); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: getAuthRedirectUrl("/reset-password"),
    });
    setLoading(false);
    if (err) setError(err.message);
    else setMsg("Enviamos um link de recuperação para seu e-mail. Confira a caixa de entrada e o spam.");
  };

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Vamos te enviar um link para redefinir sua senha em segundos."
      footer={<><Link to="/login" className="text-brand font-medium hover:underline">Voltar ao login</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {msg && <Alert><AlertDescription>{msg}</AlertDescription></Alert>}
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="voce@email.com" />
        </div>
        <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90 h-11 text-base font-semibold" disabled={loading}>
          {loading ? (<><Loader2 className="animate-spin" /> Enviando…</>) : "Enviar link de recuperação"}
        </Button>
      </form>
    </AuthShell>
  );
}
