import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useConfirmDelete } from "@/components/common/ConfirmDeleteProvider";

export function GatewaysListPanel() {
  const navigate = useNavigate();
  const confirmDelete = useConfirmDelete();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<"mercadopago" | "generic_rest">("mercadopago");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("payment_gateways").select("*").order("priority");
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      notifyError(null, "Informe um nome para o gateway.");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from("payment_gateways")
      .insert({ name: trimmed, provider_type: provider, is_test: true, active: false } as any)
      .select()
      .maybeSingle();
    setCreating(false);
    if (error) { notifyError(error); return; }
    notifySuccess("Gateway criado. Configure as credenciais abaixo.");
    setName("");
    if (data?.id) {
      navigate({ to: "/admin/gateways/$id", params: { id: data.id } });
    } else {
      load();
    }
  };

  const remove = async (id: string, label: string) => {
    const ok = await confirmDelete({
      title: "Excluir gateway de pagamento?",
      description: "O gateway e suas credenciais serão removidos. Pedidos já pagos não são afetados.",
      resourceLabel: label,
    });
    if (!ok) return;
    const { error } = await supabase.from("payment_gateways").delete().eq("id", id);
    if (error) { notifyError(error); return; }
    notifySuccess("Gateway excluído.");
    load();
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">
        Cadastre quantos provedores quiser. O gateway ativo de maior prioridade será usado no checkout.
      </p>
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] mb-6 p-4 bg-card border rounded-lg">
        <div>
          <label className="text-xs text-muted-foreground">Nome</label>
          <Input
            placeholder="ex: Mercado Pago Produção"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") create(); }}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Provedor</label>
          <Select value={provider} onValueChange={(v) => setProvider(v as typeof provider)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mercadopago">Mercado Pago (PIX + cartão)</SelectItem>
              <SelectItem value="generic_rest">Genérico (qualquer REST API)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={create} disabled={creating} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />{creating ? "Criando…" : "Criar"}
          </Button>
        </div>
      </div>
      {loading ? <p>Carregando...</p> : (
        <div className="space-y-2">
          {items.map((g) => (
            <Link
              key={g.id}
              to="/admin/gateways/$id"
              params={{ id: g.id }}
              className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-accent/40 transition-colors cursor-pointer"
            >
              <div>
                <div className="font-medium">{g.name}</div>
                <div className="text-xs text-muted-foreground">
                  {g.provider_type} · {g.is_test ? "TESTE" : "LIVE"} · prioridade {g.priority} · {g.active ? "✅ ativo" : "⏸ inativo"}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(g.id, g.name); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Link>
          ))}
          {items.length === 0 && <p className="text-muted-foreground">Nenhum gateway. Crie o primeiro acima.</p>}
        </div>
      )}
    </div>
  );
}