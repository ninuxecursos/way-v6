import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { ReservationShell } from "@/components/reservation/ReservationShell";
import { OrderSummary } from "@/components/reservation/OrderSummary";
import { StepActions } from "@/components/reservation/StepActions";
import { Card } from "@/components/ui/card";
import { TermsBlock } from "@/components/reservation/TermsBlock";
import { useReservation } from "@/hooks/use-reservation";
import { useRedirectIfIncomplete } from "@/hooks/use-redirect-if-incomplete";
import { createTermsAcceptance } from "@/repositories/terms.repo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { getPendingPassword, clearPendingPassword } from "@/lib/pending-password";
import { seedDraftByEmail } from "@/lib/reservation-draft.functions";

export const Route = createFileRoute("/reservation/terms")({
  head: () => ({
    meta: [
      { title: "Termos e condições — Way Home" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TermsStep,
});

const TERMS_VERSION = "v1.0";

function TermsStep() {
  const navigate = useNavigate();
  const { state, setTerms } = useReservation();
  const { user } = useAuth();
  const seedDraftFn = useServerFn(seedDraftByEmail);

  useRedirectIfIncomplete("terms");

  const [acceptedTerms, setAcceptedTerms] = useState(state.terms?.acceptedTerms ?? false);
  const [acceptedImage, setAcceptedImage] = useState(
    state.terms?.acceptedImageRights ?? false,
  );
  const [scrollReached, setScrollReached] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!state.participant?.participantId) {
        throw new Error(
          "Cadastro do participante não localizado. Refaça a etapa anterior.",
        );
      }
      await createTermsAcceptance({
        participantId: state.participant.participantId,
        acceptedTerms,
        acceptedPrivacy: acceptedTerms,
        acceptedImageRights: acceptedImage,
        termsVersion: TERMS_VERSION,
      });

      const termsObj = {
        acceptedTerms,
        acceptedPrivacy: acceptedTerms,
        acceptedImageRights: acceptedImage,
        acceptedAt: new Date().toISOString(),
        termsVersion: TERMS_VERSION,
      };

      // Caminho 1 — visitante: cria a conta agora e envia e-mail de confirmação.
      if (!user) {
        const email = state.participant.email.trim().toLowerCase();
        const password = getPendingPassword(email);
        if (!password) {
          throw new Error(
            "Sessão expirou. Volte ao cadastro para definir a senha novamente.",
          );
        }
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl("/reservation/checkout?resume=1"),
            data: {
              display_name: state.participant.name,
              full_name: state.participant.name,
            },
          },
        });
        if (signUpErr) {
          if (/registered|exists/i.test(signUpErr.message)) {
            throw new Error(
              "Este e-mail já tem conta Way Home. Faça login para finalizar a reserva.",
            );
          }
          throw new Error(signUpErr.message);
        }

        // Seed do rascunho para que, ao confirmar o e-mail em outra aba/device,
        // o checkout já encontre os dados hidratados.
        try {
          const remoteState = {
            modality: state.modality,
            participant: state.participant,
            terms: termsObj,
            gatewayId: state.gatewayId,
            updatedAt: Date.now(),
          };
          await seedDraftFn({
            data: { email, state: remoteState as Record<string, unknown> },
          });
        } catch {
          /* seed falhou — sessionStorage local ainda funciona */
        }
        clearPendingPassword(email);
        return { destination: "verify-email" as const, signUpData };
      }

      // Caminho 2 — já logado: vai direto pro checkout.
      return { destination: "checkout" as const };
    },
    onSuccess: (res) => {
      setTerms({
        acceptedTerms,
        acceptedPrivacy: acceptedTerms,
        acceptedImageRights: acceptedImage,
        acceptedAt: new Date().toISOString(),
        termsVersion: TERMS_VERSION,
      });
      if (res?.destination === "verify-email") {
        toast.success("Conta criada — confirme seu e-mail", {
          description: "Enviamos um link de confirmação para finalizar o pagamento.",
        });
        navigate({ to: "/reservation/verify-email" });
      } else {
        toast.success("Termos aceitos", {
          description: "Vamos para a etapa de pagamento.",
        });
        navigate({ to: "/reservation/checkout" });
      }
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível registrar seu aceite. Tente novamente.";
      toast.error("Erro ao registrar aceite", { description: msg });
    },
  });

  if (!state.modality || !state.participant) return null;

  const submitting = mutation.isPending;
  const canContinue = scrollReached && acceptedTerms && acceptedImage;

  return (
    <ReservationShell
      step="terms"
      title="Termos e consentimentos"
      subtitle="Leia até o final, aceite os termos e o uso de imagem para continuar."
      aside={<OrderSummary modality={state.modality} quantity={state.participant.quantity} />}
    >
      <Card className="overflow-hidden p-0">
        <TermsBlock
          title="Termos do evento Way Home"
          meta={`Versão ${TERMS_VERSION} · ${state.modality.name}`}
          acceptedTerms={acceptedTerms}
          acceptedImage={acceptedImage}
          onAcceptedTerms={setAcceptedTerms}
          onAcceptedImage={setAcceptedImage}
          onScrollReached={setScrollReached}
        />

        <div className="px-5 pb-5 pt-2 sm:px-6">
          <StepActions
            backHref="/reservation/register"
            primaryLabel={
              submitting
                ? user
                  ? "Registrando aceite…"
                  : "Criando conta…"
                : user
                  ? "Ir para pagamento"
                  : "Aceitar e confirmar e-mail"
            }
            onPrimary={() => mutation.mutate()}
            disabled={!canContinue}
            loading={submitting}
          />
        </div>
      </Card>
    </ReservationShell>
  );
}