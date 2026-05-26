import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { listPromoCoupons, upsertPromoCoupon, deletePromoCoupon, type PromoCoupon } from "@/lib/promo-coupons.functions";
import { listGroupsAdmin } from "@/lib/groups.functions";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";

export const Route = createFileRoute("/admin/coupons")({ component: AdminCouponsPage });

function AdminCouponsPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Cupons" description="Promocionais (criar/gerenciar) e Galera (somente leitura)." />
      <Tabs defaultValue="promo">
        <TabsList>
          <TabsTrigger value="promo">Promocionais</TabsTrigger>
          <TabsTrigger value="galera">Galera (titulares)</TabsTrigger>
        </TabsList>
        <TabsContent value="promo" className="pt-4"><PromoTab /></TabsContent>
        <TabsContent value="galera" className="pt-4"><GaleraTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function PromoTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPromoCoupons);
  const upsertFn = useServerFn(upsertPromoCoupon);
  const delFn = useServerFn(deletePromoCoupon);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [editing, setEditing] = useState<Partial<PromoCoupon> | null>(null);

  const q = useQuery({
    queryKey: ["admin", "promo-coupons", search, status],
    queryFn: () => listFn({ data: { search, status } }),
    placeholderData: keepPreviousData,
  });

  const save = useMutation({
    mutationFn: async (payload: any) => upsertFn({ data: payload }),
    onSuccess: () => { notifySuccess("Cupom salvo!"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin", "promo-coupons"] }); },
    onError: (e) => notifyError(e),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => delFn({ data: { id } }),
    onSuccess: () => { notifySuccess("Cupom removido."); qc.invalidateQueries({ queryKey: ["admin", "promo-coupons"] }); },
    onError: (e) => notifyError(e),
  });

  const rows = q.data?.rows ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs">Buscar</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Código ou descrição" />
        </div>
        <div className="w-40">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setEditing({ active: true, discount_type: "percent", discount_value: 10, min_order_cents: 0 })}>
          <Plus className="h-4 w-4 mr-2" /> Novo cupom
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                {q.isLoading ? "Carregando…" : "Nenhum cupom encontrado."}
              </TableCell></TableRow>
            )}
            {rows.map((c) => {
              const isExpired = c.ends_at && new Date(c.ends_at).getTime() < Date.now();
              const isExhausted = c.max_uses != null && c.used_count >= c.max_uses;
              return (
                <TableRow key={c.id}>
                  <TableCell><span className="font-mono font-semibold">{c.code}</span>{c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}</TableCell>
                  <TableCell>{c.discount_type === "percent" ? `${c.discount_value}%` : `R$ ${(c.discount_value / 100).toFixed(2)}`}</TableCell>
                  <TableCell>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : " / ∞"}</TableCell>
                  <TableCell className="text-xs">
                    {c.starts_at && <div>De: {new Date(c.starts_at).toLocaleDateString("pt-BR")}</div>}
                    {c.ends_at && <div>Até: {new Date(c.ends_at).toLocaleDateString("pt-BR")}</div>}
                    {!c.starts_at && !c.ends_at && <span className="text-muted-foreground">Sem prazo</span>}
                  </TableCell>
                  <TableCell>
                    {!c.active ? <Badge variant="secondary">Inativo</Badge>
                      : isExpired ? <Badge variant="destructive">Expirado</Badge>
                      : isExhausted ? <Badge variant="destructive">Esgotado</Badge>
                      : <Badge>Ativo</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Remover cupom ${c.code}?`)) remove.mutate(c.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {editing && <PromoDialog initial={editing} onClose={() => setEditing(null)} onSave={(d) => save.mutate(d)} saving={save.isPending} />}
    </div>
  );
}

function PromoDialog({ initial, onClose, onSave, saving }: {
  initial: Partial<PromoCoupon>;
  onClose: () => void;
  onSave: (d: any) => void;
  saving: boolean;
}) {
  const [c, setC] = useState<Partial<PromoCoupon>>(initial);
  const update = (k: keyof PromoCoupon, v: any) => setC({ ...c, [k]: v });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{c.id ? "Editar cupom" : "Novo cupom promocional"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Código</Label><Input value={c.code ?? ""} onChange={(e) => update("code", e.target.value.toUpperCase())} placeholder="WAYHOME10" /></div>
            <div className="flex items-end gap-2"><Switch checked={c.active ?? true} onCheckedChange={(v) => update("active", v)} /> <span className="text-sm">Ativo</span></div>
          </div>
          <div><Label>Descrição interna (opcional)</Label><Input value={c.description ?? ""} onChange={(e) => update("description", e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Tipo</Label>
              <Select value={c.discount_type ?? "percent"} onValueChange={(v) => update("discount_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Fixo (centavos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Valor</Label><Input type="number" value={c.discount_value ?? ""} onChange={(e) => update("discount_value", Number(e.target.value))} /></div>
            <div><Label>Máx. usos</Label><Input type="number" value={c.max_uses ?? ""} onChange={(e) => update("max_uses", e.target.value ? Number(e.target.value) : null)} placeholder="Ilimitado" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Início (opcional)</Label><Input type="datetime-local" value={c.starts_at ? String(c.starts_at).slice(0, 16) : ""} onChange={(e) => update("starts_at", e.target.value || null)} /></div>
            <div><Label>Término (opcional)</Label><Input type="datetime-local" value={c.ends_at ? String(c.ends_at).slice(0, 16) : ""} onChange={(e) => update("ends_at", e.target.value || null)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Pedido mínimo (centavos)</Label><Input type="number" value={c.min_order_cents ?? 0} onChange={(e) => update("min_order_cents", Number(e.target.value))} /></div>
            <div><Label>Produtos (slugs, vírgula — vazio = todos)</Label>
              <Input
                value={(c.product_slugs ?? []).join(", ")}
                onChange={(e) => update("product_slugs", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="suite-premium, camping"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving || !c.code || !c.discount_value} onClick={() => onSave(c)}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GaleraTab() {
  const listFn = useServerFn(listGroupsAdmin);
  const q = useQuery({
    queryKey: ["admin", "groups", "coupons-tab"],
    queryFn: () => listFn({ data: { search: "", status: "all", page: 0, pageSize: 50 } }),
  });
  const rows = q.data?.rows ?? [];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Cupons gerados automaticamente pelos titulares de quartos Galera. Edição completa em <Link to="/admin/groups" className="underline">Grupos Galera</Link>.</p>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cupom</TableHead>
              <TableHead>Titular</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Capacidade</TableHead>
              <TableHead>Usados</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">{q.isLoading ? "Carregando…" : "Nenhum grupo encontrado."}</TableCell></TableRow>}
            {rows.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-mono">{g.couponCode}</TableCell>
                <TableCell>{g.holderName}</TableCell>
                <TableCell className="text-xs">{g.productSlug}</TableCell>
                <TableCell>{g.capacity}</TableCell>
                <TableCell>{g.counts.paid} pagos / {g.counts.total} total</TableCell>
                <TableCell><Badge variant={g.status === "open" ? "default" : "secondary"}>{g.status}</Badge></TableCell>
                <TableCell className="text-right"><Link to="/admin/groups_/$id" params={{ id: g.id }} className="text-xs underline">Abrir</Link></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
