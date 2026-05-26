import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CreditCard, ShieldCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GatewaysListPanel } from "@/components/admin/gateways/GatewaysListPanel";
import { GatewaysQAPanel } from "@/components/admin/gateways/GatewaysQAPanel";

type TabValue = "cadastrados" | "testes";

export const Route = createFileRoute("/admin/gateways")({
  validateSearch: (s: Record<string, unknown>): { tab: TabValue } => ({
    tab: s?.tab === "testes" ? "testes" : "cadastrados",
  }),
  component: GatewaysShell,
});

function GatewaysShell() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/gateways" });

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <CreditCard className="h-7 w-7" />Gateways de Pagamento
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Cadastre provedores e teste o fluxo de checkout (PIX, cartão à vista e parcelado) sem sair desta tela.
      </p>

      <Tabs
        value={tab}
        onValueChange={(v) => navigate({ search: { tab: v as TabValue } })}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="cadastrados" className="gap-2">
            <CreditCard className="h-4 w-4" />Cadastrados
          </TabsTrigger>
          <TabsTrigger value="testes" className="gap-2">
            <ShieldCheck className="h-4 w-4" />Testes (QA)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cadastrados" className="mt-0">
          <GatewaysListPanel />
        </TabsContent>
        <TabsContent value="testes" className="mt-0">
          <GatewaysQAPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}