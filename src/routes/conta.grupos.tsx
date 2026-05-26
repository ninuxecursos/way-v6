import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Copy, Users, Check } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMyGroups } from "@/lib/groups.functions";

export const Route = createFileRoute("/conta/grupos")({
  head: () => ({
    meta: [
      { title: "Meus grupos Galera — Way Home" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GruposPage,
});

function GruposPage() {
  const fetchGroups = useServerFn(getMyGroups);
  const { data, isLoading } = useQuery({
    queryKey: ["my-groups"],
    queryFn: () => fetchGroups(),
  });

  const groups = data?.groups ?? [];

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Cupom copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-extrabold">Meus grupos Galera</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe os quartos compartilhados que você organizou ou que entrou usando um cupom.
        </p>
      </header>

      {isLoading && (
        <Card className="p-6 text-sm text-muted-foreground">Carregando seus grupos…</Card>
      )}

      {!isLoading && groups.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">Você ainda não está em nenhum grupo Galera.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Compre um ingresso na modalidade Galera para receber seu cupom de grupo.
          </p>
        </Card>
      )}

      {groups.map((g) => {
        const used = g.paidCount + g.pendingCount;
        const statusLabel: Record<typeof g.status, string> = {
          open: "Aberto",
          completed: "Completo",
          closed_manual: "Fechado",
          cancelled: "Cancelado",
        };
        const whatsappMsg = encodeURIComponent(
          `Oi! Já comprei meu ingresso da Galera Way Home. Use meu cupom para entrar no mesmo quarto: ${g.couponCode}`,
        );
        return (
          <Card key={g.id} className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">
                    {g.isHolder ? "Você é o titular" : `Grupo de ${g.holderName}`}
                  </h2>
                  <Badge variant={g.status === "open" ? "default" : "secondary"}>
                    {statusLabel[g.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Produto: {g.productSlug} · {used}/{g.capacity} vagas preenchidas
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="rounded-md border bg-muted/40 px-3 py-1.5 font-mono text-sm font-bold">
                  {g.couponCode}
                </code>
                <Button variant="outline" size="sm" onClick={() => copy(g.couponCode)}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar
                </Button>
                {g.isHolder && (
                  <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-500/90 text-white">
                    <a
                      href={`https://wa.me/?text=${whatsappMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Compartilhar no WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Membros do quarto
              </p>
              <ul className="divide-y divide-border/60">
                {g.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {m.fullName} {m.isMe && <span className="text-xs text-muted-foreground">(você)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {m.role === "holder" && <Badge variant="outline">Titular</Badge>}
                      {m.paymentStatus === "paid" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <Check className="h-3.5 w-3.5" /> Pago
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{m.paymentStatus}</span>
                      )}
                    </div>
                  </li>
                ))}
                {Array.from({ length: Math.max(0, g.capacity - g.members.length) }).map((_, i) => (
                  <li key={`empty-${i}`} className="py-2 text-xs text-muted-foreground">
                    Vaga aberta — compartilhe seu cupom
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        );
      })}
    </div>
  );
}