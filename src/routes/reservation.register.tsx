import { createFileRoute } from "@tanstack/react-router";

import { ReservationShell } from "@/components/reservation/ReservationShell";
import { OrderSummary } from "@/components/reservation/OrderSummary";
import { QuizFlow } from "@/components/reservation/quiz/QuizFlow";
import { useReservation } from "@/hooks/use-reservation";
import { useRedirectIfIncomplete } from "@/hooks/use-redirect-if-incomplete";

export const Route = createFileRoute("/reservation/register")({
  head: () => ({
    meta: [
      { title: "Cadastro do participante — Way Home" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RegisterStep,
});

function RegisterStep() {
  const { state } = useReservation();
  useRedirectIfIncomplete("register");

  if (!state.modality) return null;

  const isGroupMode = state.modality.kind === "shared";
  const quantity = state.participant?.quantity ?? state.modality.minQuantity ?? 1;

  return (
    <ReservationShell
      step="register"
      title={isGroupMode ? "Cadastro Galera" : "Seu cadastro"}
      subtitle="Uma pergunta por vez. Em menos de 1 minuto você está nos termos."
      aside={<OrderSummary modality={state.modality} quantity={isGroupMode ? 1 : quantity} />}
    >
      <QuizFlow />
    </ReservationShell>
  );
}