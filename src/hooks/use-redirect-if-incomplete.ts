import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useReservation } from "@/hooks/use-reservation";
import { useAuth } from "@/hooks/use-auth";

type Step = "register" | "verify-email" | "terms" | "checkout";

/**
 * Redirects the user back to earlier steps when prerequisites are missing.
 *  - "register": needs modality
 *  - "terms":    needs modality + participant (público, sem login)
 *  - "verify-email": needs modality + participant + termos aceitos
 *                    (visitante após signUp aguardando confirmação)
 *  - "checkout": needs modality + participant + termos + login confirmado
 */
export function useRedirectIfIncomplete(step: Step) {
  const navigate = useNavigate();
  const { state, hydrated } = useReservation();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!hydrated || authLoading) return;
    if (!state.modality) {
      navigate({ to: "/reservation", replace: true });
      return;
    }
    if (step === "register") return;
    if (!state.participant) {
      navigate({ to: "/reservation/register", replace: true });
      return;
    }
    if (step === "terms") return;
    if (!state.terms?.acceptedTerms) {
      navigate({ to: "/reservation/terms", replace: true });
      return;
    }
    if (step === "verify-email") return;
    // Checkout exige usuário logado e e-mail confirmado.
    if (!user || !user.email_confirmed_at) {
      navigate({ to: "/reservation/verify-email", replace: true });
    }
  }, [hydrated, authLoading, user, state, step, navigate]);
}