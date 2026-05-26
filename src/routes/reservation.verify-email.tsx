import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

import { ReservationShell } from "@/components/reservation/ReservationShell";
import { OrderSummary } from "@/components/reservation/OrderSummary";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReservation } from "@/hooks/use-reservation";
import { useRedirectIfIncomplete } from "@/hooks/use-redirect-if-incomplete";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reservation/verify-email")({
  head: () => ({
    meta: [
      { title: "Confirme seu e-mail — Way Home" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VerifyEmailStep,
});

function VerifyEmailStep() {
  const navigate = useNavigate();
  const { state } = useReservation();
  const { user } = useAuth();
  useRedirectIfIncomplete("verify-email");

  const [resendBusy, setResendBusy] = useState(false);

  // Já confirmado → direto pro pagamento.
  useEffect(() => {
    if (user?.email_confirmed_at) {
      navigate({ to: "/reservation/checkout", search: { resume: "1" } as never, replace: true });
    }
  }, [user, navigate]);

  // Listener: assim que o e-mail é confirmado (mesma aba ou outra), segue.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user.email_confirmed_at) {
          navigate({
            to: "/reservation/checkout",
            search: { resume: "1" } as never,
            replace: true,
          });
        }
      },
    );
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!state.modality || !state.participant) return null;

  const email = state.participant.email;

  const resend = async () => {
    setResendBusy(true);
    try {
      const { error: err } = await supabase.auth.resend({ type: "signup", email });
      if (err) throw err;
      toast.success("E-mail reenviado", { description: `Verifique a caixa de ${email}.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível reenviar.";
      toast.error("Não foi possível reenviar", { description: msg });
    } finally {
      setResendBusy(false);
    }
  };

  const checkConfirmed = async () => {
    const { data, error: err } = await supabase.auth.getUser();
    if (err || !data.user?.email_confirmed_at) {
      toast.info("Ainda não confirmamos seu e-mail", {
        description: "Abra o link que enviamos para o seu e-mail.",
      });
      return;
    }
    navigate({
      to: "/reservation/checkout",
      search: { resume: "1" } as never,
      replace: true,
    });
  };

  return (
    <ReservationShell
      step="register"
      title="Confirme seu e-mail para finalizar"
      subtitle={`Enviamos um link de confirmação para ${email}. Sua reserva está pendente, só falta confirmar.`}
      aside={<OrderSummary modality={state.modality} quantity={state.participant.quantity} />}
    >
      <Card className="p-5 sm:p-6">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Mail className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold">Verifique sua caixa de entrada</p>
            <p className="text-sm text-muted-foreground">
              Abra o e-mail que enviamos para <strong>{email}</strong> e clique
              no link de confirmação. Você será levado direto para a tela de
              pagamento, com todos os dados já preenchidos.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Não esqueça de olhar a pasta de spam.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={checkConfirmed} className="h-11">
              <LogIn className="mr-2 h-4 w-4" />
              Já confirmei — continuar
            </Button>
            <Button
              variant="outline"
              disabled={resendBusy}
              onClick={resend}
              className="h-11"
            >
              {resendBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reenviar e-mail
            </Button>
          </div>
        </div>
      </Card>
    </ReservationShell>
  );
}