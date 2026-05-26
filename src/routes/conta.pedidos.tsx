import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/conta/pedidos")({
  component: () => <Outlet />,
});
