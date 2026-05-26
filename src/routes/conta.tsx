import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/account/AccountLayout";
import { PublicErrorBoundary } from "@/components/errors/PublicErrorBoundary";

const AUTH_TIMEOUT_MS = 2500;

function withTimeout<T>(promise: PromiseLike<T>, ms = AUTH_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("auth-timeout")), ms)),
  ]);
}

export const Route = createFileRoute("/conta")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) return;

    try {
      const { data } = await withTimeout(supabase.auth.getUser());
      if (data.user) return;
    } catch {
      // Sem sessão local e sem validação remota: volta ao login.
    }

    throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Minha conta — Way Home" },
      { name: "theme-color", content: "#0f0f0f" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
  }),
  component: AccountLayout,
  errorComponent: ({ error, reset }) => (
    <PublicErrorBoundary
      error={error}
      reset={reset}
      title="Erro na sua conta"
      homeLabel="Voltar à conta"
      homeTo="/conta"
    />
  ),
});
