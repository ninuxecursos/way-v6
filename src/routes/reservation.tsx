import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ReservationProvider } from "@/hooks/use-reservation";
import { PublicErrorBoundary } from "@/components/errors/PublicErrorBoundary";

export const Route = createFileRoute("/reservation")({
  head: () => ({
    meta: [
      { title: "Fazer reserva — Way Home" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReservationLayout,
  errorComponent: ({ error, reset }) => (
    <PublicErrorBoundary error={error} reset={reset} title="Erro na reserva" />
  ),
});

function ReservationLayout() {
  // Reserva acessível a visitantes — a conta é criada no passo de pagamento.
  return (
    <ReservationProvider>
      <Outlet />
    </ReservationProvider>
  );
}