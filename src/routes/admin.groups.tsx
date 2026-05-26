import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { listGroupsAdmin, deleteGroup } from "@/lib/groups.functions";
import { PageHeader } from "@/components/admin/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDelete } from "@/components/common/ConfirmDeleteProvider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useDebounced } from "@/hooks/use-debounced";

export const Route = createFileRoute("/admin/groups")({ component: AdminGroupsPage });

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  completed: "Completo",
  closed_manual: "Fechado",
  cancelled: "Cancelado",
};

function AdminGroupsPage() {
  const list = useServerFn(listGroupsAdmin);
  const delFn = useServerFn(deleteGroup);
  const qc = useQueryClient();
  const confirmDelete = useConfirmDelete();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "completed" | "closed_manual" | "cancelled">("all");
  const [page, setPage] = useState(0);
  const debounced = useDebounced(search, 300);

  const q = useQuery({
    queryKey: ["admin", "groups", { debounced, status, page }],
    queryFn: () => list({ data: { search: debounced, status, page, pageSize: 20 } }),
    placeholderData: keepPreviousData,
  });

  const rows = q.data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((q.data?.count ?? 0) / 20));

  const delMut = useMutation({
    mutationFn: (groupId: string) => delFn({ data: { groupId } }),
    onSuccess: () => {
      toast.success("Grupo excluído.");
      qc.invalidateQueries({ queryKey: ["admin", "groups"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir grupo."),
  });

  const handleDelete = async (g: { id: string; couponCode: string; holderName: string }) => {
    const ok = await confirmDelete({
      title: "Excluir grupo?",
      description: "Membros e quartos do grupo serão removidos. Pedidos pagos serão desvinculados, não excluídos.",
      resourceLabel: `${g.couponCode} — ${g.holderName}`,
    });
    if (ok) delMut.mutate(g.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação"
        title="Grupos Galera"
        description="Quartos compartilhados, cupons de vínculo e status de pagamento dos membros."
      />

      <div className="admin-card flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 min-w-[220px] space-y-1">
          <label className="text-xs text-muted-foreground">Buscar</label>
          <Input
            placeholder="Cupom, titular ou produto"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select value={status} onValueChange={(v) => { setStatus(v as any); setPage(0); }}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="completed">Completo</SelectItem>
              <SelectItem value="closed_manual">Fechado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="admin-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cupom</TableHead>
              <TableHead>Titular</TableHead>
              <TableHead className="hidden md:table-cell">Produto</TableHead>
              <TableHead>Vagas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            )}
            {!q.isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum grupo encontrado.</TableCell></TableRow>
            )}
            {rows.map((g) => (
              <TableRow key={g.id}>
                <TableCell><code className="font-mono text-xs font-bold">{g.couponCode}</code></TableCell>
                <TableCell>{g.holderName}</TableCell>
                <TableCell className="hidden md:table-cell">{g.productSlug}</TableCell>
                <TableCell className="tabular-nums">
                  {g.counts.paid}/{g.capacity}
                  {g.counts.pending > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">({g.counts.pending} pend.)</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={g.status === "open" ? "default" : "secondary"}>
                    {STATUS_LABEL[g.status] ?? g.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/admin/groups/$id" params={{ id: g.id }}>Detalhes</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(g)}
                      disabled={delMut.isPending}
                      title="Excluir grupo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs">
          <span className="text-muted-foreground">{q.data?.count ?? 0} grupos</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
            <span className="self-center">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      </div>
    </div>
  );
}