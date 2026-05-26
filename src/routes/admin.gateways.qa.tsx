import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/gateways/qa")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/gateways", search: { tab: "testes" } as any });
  },
  component: () => null,
});