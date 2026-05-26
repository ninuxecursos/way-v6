import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listCustomers, deleteCustomer } from "@/lib/customers.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { CustomerDetailModal } from "@/components/admin/customers/CustomerDetailModal";
import { useConfirmDelete } from "@/components/common/ConfirmDeleteProvider";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/customers")({ component: CustomersList });

type Row = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  phone: string | null;
  locale: string | null;
  tags: string[] | null;
  created_at: string;
  email: string | null;
  roles: string[];
};

function CustomersList() {
  const list = useServerFn(listCustomers);
  const delFn = useServerFn(deleteCustomer);
  const confirmDelete = useConfirmDelete();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => { setPage(1); }, [search, pageSize, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      list({ data: {
        search,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
      } as any })
        .then((r: any) => {
          setRows(Array.isArray(r?.rows) ? r.rows : []);
          setTotal(typeof r?.total === "number" ? r.total : 0);
        })
        .catch((err) => {
          console.error("[admin.customers] listCustomers failed", err);
          setRows([]); setTotal(0);
          setLoadError((err as Error)?.message || "Falha ao carregar clientes.");
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search, page, pageSize, dateFrom, dateTo]);

  const fromIdx = useMemo(() => (total === 0 ? 0 : (page - 1) * pageSize + 1), [page, pageSize, total]);
  const toIdx = useMemo(() => Math.min(page * pageSize, total), [page, pageSize, total]);

  const reload = () => {
    setRows((prev) => prev);
    list({ data: {
      search,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
    } as any }).then((r: any) => {
      setRows(Array.isArray(r?.rows) ? r.rows : []);
      setTotal(typeof r?.total === "number" ? r.total : 0);
    }).catch(() => {});
  };

  const handleDelete = async (r: Row, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirmDelete({
      title: "Excluir cliente?",
      description: "A conta do usuário será removida do sistema de autenticação. Pedidos pagos permanecem no histórico, mas serão desassociados.",
      resourceLabel: r.email || r.display_name || r.full_name || r.id,
    });
    if (!ok) return;
    try {
      await delFn({ data: { userId: r.id } });
      toast.success("Cliente excluído.");
      reload();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao excluir cliente.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Users className="h-7 w-7" />Clientes</h1>
        <Link to="/admin/segments" className="text-sm text-primary hover:underline">Segmentos →</Link>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] items-end mb-4">
        <div>
          <label className="text-xs text-muted-foreground">Buscar</label>
          <Input placeholder="Nome ou telefone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">De</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Até</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Por página</label>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-2">
        {loading ? "Carregando…" : `${total} clientes • mostrando ${fromIdx}–${toIdx}`}
      </div>
      {loadError && (
        <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {loadError}
        </div>
      )}

      {/* Desktop: tabela */}
      <div className="hidden md:block bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-3">Nome</th><th className="text-left p-3">E-mail</th><th className="text-left p-3">Papel</th><th className="text-left p-3">Telefone</th><th className="text-left p-3">Criado em</th><th className="text-right p-3">Ações</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t hover:bg-muted/30 cursor-pointer"
                onClick={() => setOpenId(r.id)}
              >
                <td className="p-3 text-primary">{r.display_name || r.full_name || r.id.slice(0, 8)}</td>
                <td className="p-3 text-xs">{r.email ?? "—"}</td>
                <td className="p-3 text-xs">
                  {(r.roles ?? []).length === 0
                    ? <span className="text-muted-foreground">customer</span>
                    : r.roles.map((role) => (
                        <span key={role} className={`mr-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide ${role === "super_admin" ? "bg-amber-500/20 text-amber-600" : role === "admin" ? "bg-primary/15 text-primary" : "bg-muted"}`}>{role}</span>
                      ))}
                </td>
                <td className="p-3">{r.phone ?? "—"}</td>
                <td className="p-3 text-xs">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => handleDelete(r, e)}
                    title="Excluir cliente"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setOpenId(r.id)}
            className="w-full text-left bg-card border rounded-lg p-4 hover:bg-muted/30 active:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="font-medium text-primary truncate">
                {r.display_name || r.full_name || r.id.slice(0, 8)}
              </div>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                {r.locale ?? "pt"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">{r.phone ?? "Sem telefone"}</div>
            {r.email && <div className="text-xs text-muted-foreground truncate">{r.email}</div>}
            {r.roles && r.roles.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {r.roles.map((role) => (
                  <span key={role} className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wide ${role === "super_admin" ? "bg-amber-500/20 text-amber-600" : role === "admin" ? "bg-primary/15 text-primary" : "bg-muted"}`}>{role}</span>
                ))}
              </div>
            )}
            {r.tags && r.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {r.tags.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-muted">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 text-[11px] text-muted-foreground">
              Cliente desde {new Date(r.created_at).toLocaleDateString("pt-BR")}
            </div>
          </button>
        ))}
        {rows.length === 0 && !loading && (
          <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground text-sm">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="text-xs text-muted-foreground">Página {page} de {totalPages}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-4 w-4" />Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Próxima<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CustomerDetailModal
        userId={openId}
        open={!!openId}
        onOpenChange={(v: boolean) => !v && setOpenId(null)}
      />
    </div>
  );
}