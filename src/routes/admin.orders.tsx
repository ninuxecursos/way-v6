import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2, MoreVertical, Loader2, CheckSquare, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  adminUpdateOrderStatus,
  adminBulkUpdateOrderStatus,
  adminDeleteOrder,
  adminBulkDeleteOrders,
} from "@/lib/orders.functions";

export const Route = createFileRoute("/admin/orders")({ component: OrdersList });

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  in_process: "bg-yellow-100 text-yellow-700",
};

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Aprovado / Pago" },
  { value: "in_process", label: "Em processamento" },
  { value: "cancelled", label: "Cancelado" },
  { value: "refunded", label: "Reembolsado" },
  { value: "failed", label: "Falhou" },
];

type OrderStatus =
  | "pending"
  | "paid"
  | "cancelled"
  | "refunded"
  | "failed"
  | "in_process";

type OrderRow = {
  id: string;
  created_at: string;
  customer_email: string | null;
  customer_name: string | null;
  total_cents: number;
  currency: string;
  status: string;
  payment_provider: string | null;
  metadata: Record<string, unknown> | null;
};

const ORDER_COLUMNS =
  "id,created_at,customer_email,total_cents,currency,status,payment_provider,metadata";

function OrdersList() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<
    | { kind: "single"; id: string; label: string }
    | { kind: "bulk"; ids: string[] }
    | null
  >(null);

  const updateOne = useServerFn(adminUpdateOrderStatus);
  const updateBulk = useServerFn(adminBulkUpdateOrderStatus);
  const deleteOne = useServerFn(adminDeleteOrder);
  const deleteBulk = useServerFn(adminBulkDeleteOrders);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let q = supabase
          .from("orders")
          .select(ORDER_COLUMNS)
          .order("created_at", { ascending: false })
          .limit(200);
        if (filter) q = q.eq("status", filter);
        const { data, error } = await q;
        if (cancelled) return;
        if (error) throw error;
        const rows = (data ?? []).map((o: any) => ({
          ...o,
          customer_name:
            (o.metadata as any)?.customer_name ??
            (o.metadata as any)?.customer?.name ??
            null,
        })) as OrderRow[];
        setOrders(rows);
      } catch (e) {
        if (cancelled) return;
        console.error("[admin/orders]", e);
        setOrders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const allOnPageSelected =
    orders.length > 0 && orders.every((o) => selected.has(o.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        orders.forEach((o) => next.delete(o.id));
      } else {
        orders.forEach((o) => next.add(o.id));
      }
      return next;
    });
  };
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clearSelection = () => setSelected(new Set());

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    setBusy(true);
    try {
      await updateOne({ data: { orderId: id, status } });
      toast.success("Status atualizado");
      reload();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao atualizar status");
    } finally {
      setBusy(false);
    }
  };

  const handleBulkStatus = async (status: OrderStatus) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBusy(true);
    try {
      await updateBulk({ data: { orderIds: ids, status } });
      toast.success(`${ids.length} pedido(s) atualizados`);
      clearSelection();
      reload();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao atualizar pedidos");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      if (confirmDelete.kind === "single") {
        await deleteOne({ data: { orderId: confirmDelete.id } });
        toast.success("Pedido excluído");
      } else {
        await deleteBulk({ data: { orderIds: confirmDelete.ids } });
        toast.success(`${confirmDelete.ids.length} pedido(s) excluídos`);
        clearSelection();
      }
      setConfirmDelete(null);
      reload();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao excluir");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Pedidos</h1>
        <select
          className="border rounded px-3 h-10 w-full md:w-auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="pending">Pendentes</option>
          <option value="paid">Pagos</option>
          <option value="cancelled">Cancelados</option>
          <option value="refunded">Reembolsados</option>
          <option value="in_process">Em processamento</option>
          <option value="failed">Falhou</option>
        </select>
      </div>

      {/* Barra de ações em massa */}
      {someSelected && (
        <div className="sticky top-2 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-card/95 backdrop-blur p-3 shadow-md">
          <span className="text-sm font-medium">
            {selected.size} selecionado{selected.size > 1 ? "s" : ""}
          </span>
          <Button size="sm" variant="ghost" onClick={clearSelection} className="gap-1">
            <X className="h-4 w-4" /> Limpar
          </Button>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary" disabled={busy} className="gap-1">
                <CheckSquare className="h-4 w-4" /> Alterar status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Novo status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUS_OPTIONS.map((s) => (
                <DropdownMenuItem key={s.value} onClick={() => handleBulkStatus(s.value)}>
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() =>
              setConfirmDelete({ kind: "bulk", ids: Array.from(selected) })
            }
            className="gap-1"
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      )}

      {/* Desktop: tabela */}
      <div className="hidden md:block bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 w-10">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </th>
              <th className="text-left p-3">Data</th>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Total</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Provider</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className={`border-t hover:bg-accent/30 ${
                  selected.has(o.id) ? "bg-accent/40" : ""
                }`}
              >
                <td className="p-3">
                  <Checkbox
                    checked={selected.has(o.id)}
                    onCheckedChange={() => toggleOne(o.id)}
                    aria-label="Selecionar pedido"
                  />
                </td>
                <td className="p-3 text-xs">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-3">{o.customer_email}</td>
                <td className="p-3 font-mono">
                  {o.currency} {(o.total_cents / 100).toFixed(2)}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[o.status] ?? "bg-muted"}`}>
                    {o.status}
                  </span>
                </td>
                <td className="p-3 text-xs">{o.payment_provider ?? "—"}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to="/admin/orders/$id"
                      params={{ id: o.id }}
                      className="text-primary hover:underline text-xs"
                    >
                      Ver →
                    </Link>
                    <RowActions
                      busy={busy}
                      onSetStatus={(s) => handleUpdateStatus(o.id, s)}
                      onDelete={() =>
                        setConfirmDelete({
                          kind: "single",
                          id: o.id,
                          label: o.customer_email || o.id,
                        })
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nenhum pedido.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {orders.map((o) => (
          <div
            key={o.id}
            className={`bg-card border rounded-lg p-4 transition-colors ${
              selected.has(o.id) ? "border-primary bg-accent/30" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={selected.has(o.id)}
                onCheckedChange={() => toggleOne(o.id)}
                aria-label="Selecionar pedido"
                className="mt-1"
              />
              <Link
                to="/admin/orders/$id"
                params={{ id: o.id }}
                className="flex-1 min-w-0 block active:opacity-70"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {o.customer_name || o.customer_email || "—"}
                    </div>
                    {o.customer_name && o.customer_email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {o.customer_email}
                      </div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 px-2 py-1 rounded text-xs ${
                      STATUS_COLORS[o.status] ?? "bg-muted"
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(o.created_at).toLocaleString("pt-BR")}</span>
                  <span className="font-mono text-foreground">
                    {o.currency} {(o.total_cents / 100).toFixed(2)}
                  </span>
                </div>
                {o.payment_provider && (
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {o.payment_provider}
                  </div>
                )}
              </Link>
              <RowActions
                busy={busy}
                onSetStatus={(s) => handleUpdateStatus(o.id, s)}
                onDelete={() =>
                  setConfirmDelete({
                    kind: "single",
                    id: o.id,
                    label: o.customer_email || o.id,
                  })
                }
              />
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground text-sm">
            Nenhum pedido.
          </div>
        )}
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.kind === "bulk"
                ? `Excluir ${confirmDelete.ids.length} pedido(s)?`
                : "Excluir pedido?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os registros serão removidos
              permanentemente do banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RowActions({
  busy,
  onSetStatus,
  onDelete,
}: {
  busy: boolean;
  onSetStatus: (s: OrderStatus) => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          disabled={busy}
          className="h-8 w-8"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>Ações do pedido</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Alterar status</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {STATUS_OPTIONS.map((s) => (
              <DropdownMenuItem key={s.value} onClick={() => onSetStatus(s.value)}>
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}