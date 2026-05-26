import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  listCleanupItems,
  runDataCleanup,
  CLEANUP_ENTITIES,
  ENTITY_LABELS,
  type CleanupEntity,
} from "@/lib/data-cleanup.functions";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldAlert, Trash2, Loader2 } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { getUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/admin/data-cleanup")({ component: DataCleanupPage });

function DataCleanupPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCleanupItems);
  const runFn = useServerFn(runDataCleanup);

  const [entity, setEntity] = useState<CleanupEntity>("orders");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ mode: "individual" | "all" } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const q = useQuery({
    queryKey: ["admin", "data-cleanup", entity, search],
    queryFn: () => listFn({ data: { entity, search: search || undefined, limit: 100 } }),
    placeholderData: keepPreviousData,
  });

  const labelField = q.data?.labelField ?? "id";
  const rows = q.data?.rows ?? [];
  const total = q.data?.total ?? 0;

  const m = useMutation({
    mutationFn: (data: {
      mode: "individual" | "all";
      password: string;
      ids?: string[];
      confirmText?: string;
    }) => runFn({ data: { entity, ...data } }),
    onSuccess: (res) => {
      notifySuccess(`Foram excluídos ${res.removed} registro(s).`);
      setConfirm(null);
      setPassword("");
      setConfirmText("");
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin", "data-cleanup"] });
    },
    onError: (e) => notifyError(getUserMessage(e)),
  });

  const allOnPage = useMemo(() => rows.map((r: any) => r.id as string), [rows]);
  const allSelected = allOnPage.length > 0 && allOnPage.every((id) => selected.has(id));

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) return new Set();
      const n = new Set(prev);
      allOnPage.forEach((id) => n.add(id));
      return n;
    });
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Limpeza de dados"
        description="Exclusão permanente, individual ou em massa, de qualquer dado do projeto. Requer reautenticação por senha."
      />

      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <ShieldAlert className="h-5 w-5 mt-0.5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive">Operação irreversível.</p>
            <p className="text-muted-foreground">
              Restrita a <strong>super administradores</strong>. Cada execução é registrada na auditoria.
              Recomendamos exportar/backup antes. Excluir <strong>Clientes</strong> remove perfil, papéis e a conta no Auth.
              Excluir <strong>Pedidos</strong> remove também itens, NF-e e redenções de cupom relacionados.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Selecionar categoria</CardTitle>
            <p className="text-xs text-muted-foreground">{ENTITY_LABELS[entity]}</p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={entity} onValueChange={(v) => { setEntity(v as CleanupEntity); setSelected(new Set()); }}>
                <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLEANUP_ENTITIES.map((e) => (
                    <SelectItem key={e} value={e}>{ENTITY_LABELS[e]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Buscar</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar..." className="w-[220px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Total na tabela: <Badge variant="outline">{total}</Badge> · Mostrando {rows.length} ·
              Selecionados: <Badge>{selected.size}</Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={selected.size === 0}
                onClick={() => setConfirm({ mode: "individual" })}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Excluir selecionados ({selected.size})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirm({ mode: "all" })}
              >
                <AlertTriangle className="h-4 w-4 mr-1" /> Excluir TODOS desta categoria
              </Button>
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-2 w-10">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Selecionar todos da página" />
                    </th>
                    <th className="p-2">ID</th>
                    <th className="p-2">{labelField}</th>
                    <th className="p-2">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {q.isLoading ? (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground"><Loader2 className="h-4 w-4 inline animate-spin mr-2" />Carregando…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum registro encontrado.</td></tr>
                  ) : rows.map((r: any) => {
                    const { id, [labelField]: label, ...rest } = r;
                    return (
                      <tr key={id} className="border-t hover:bg-muted/30">
                        <td className="p-2"><Checkbox checked={selected.has(id)} onCheckedChange={() => toggleOne(id)} /></td>
                        <td className="p-2 font-mono text-xs text-muted-foreground">{String(id).slice(0, 8)}…</td>
                        <td className="p-2 max-w-[260px] truncate">{label != null ? String(label) : "—"}</td>
                        <td className="p-2 text-xs text-muted-foreground max-w-[420px] truncate">
                          {Object.entries(rest)
                            .filter(([k]) => k !== "id")
                            .map(([k, v]) => `${k}: ${v ?? "—"}`)
                            .join(" · ")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o) { setConfirm(null); setPassword(""); setConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Confirmar exclusão {confirm?.mode === "all" ? "em massa" : "individual"}
            </DialogTitle>
            <DialogDescription>
              {confirm?.mode === "all"
                ? <>Você está prestes a excluir <strong>TODOS</strong> os registros de <strong>{ENTITY_LABELS[entity]}</strong>. Esta ação é permanente.</>
                : <>Você está prestes a excluir <strong>{selected.size}</strong> registro(s) de <strong>{ENTITY_LABELS[entity]}</strong>. Esta ação é permanente.</>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label>Sua senha de admin</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Reautenticação obrigatória"
              />
            </div>
            {confirm?.mode === "all" && (
              <div>
                <Label>Digite <code className="bg-muted px-1 rounded">EXCLUIR TUDO</code> para confirmar</Label>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="EXCLUIR TUDO" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={m.isPending}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={m.isPending || !password || (confirm?.mode === "all" && confirmText !== "EXCLUIR TUDO")}
              onClick={() => {
                if (!confirm) return;
                m.mutate({
                  mode: confirm.mode,
                  password,
                  ids: confirm.mode === "individual" ? Array.from(selected) : undefined,
                  confirmText: confirm.mode === "all" ? confirmText : undefined,
                });
              }}
            >
              {m.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
