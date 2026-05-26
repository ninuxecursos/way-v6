import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  listRooms,
  getOccupancyStats,
  createRoomsBulk,
  createRoom,
  allocatePendingIndividuals,
  deleteRoom,
  deleteRoomsBulk,
} from "@/lib/rooms.functions";
import { PageHeader } from "@/components/admin/PageHeader";
import { RoomCard } from "@/components/admin/rooms/RoomCard";
import { RoomDetailDrawer } from "@/components/admin/rooms/RoomDetailDrawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, RefreshCw, Layers, BedDouble, Users2, ShieldOff, Trash2, CheckSquare, Square, X } from "lucide-react";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useDebounced } from "@/hooks/use-debounced";
import { useConfirmDelete } from "@/components/common/ConfirmDeleteProvider";

export const Route = createFileRoute("/admin/rooms")({ component: AdminRoomsPage });

function AdminRoomsPage() {
  const list = useServerFn(listRooms);
  const stats = useServerFn(getOccupancyStats);
  const bulk = useServerFn(createRoomsBulk);
  const single = useServerFn(createRoom);
  const allocPending = useServerFn(allocatePendingIndividuals);
  const delOne = useServerFn(deleteRoom);
  const delMany = useServerFn(deleteRoomsBulk);
  const qc = useQueryClient();
  const confirmDelete = useConfirmDelete();

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | "individual" | "galera" | "neutral">("all");
  const [status, setStatus] = useState<"all" | "available" | "partial" | "full" | "blocked" | "maintenance">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const debounced = useDebounced(search, 300);
  const [openBulk, setOpenBulk] = useState(false);
  const [openSingle, setOpenSingle] = useState(false);

  const rq = useQuery({
    queryKey: ["admin", "rooms", { debounced, kind, status }],
    queryFn: () => list({ data: { search: debounced, kind, status } }),
    placeholderData: keepPreviousData,
  });
  const sq = useQuery({
    queryKey: ["admin", "rooms-stats"],
    queryFn: () => stats(),
  });

  const rows = rq.data?.rows ?? [];
  const s = sq.data;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "rooms"] });
    qc.invalidateQueries({ queryKey: ["admin", "rooms-stats"] });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllVisible = () => setSelectedIds(new Set(rows.map((r) => r.id)));
  const clearSelection = () => setSelectedIds(new Set());
  const exitSelection = () => { setSelectionMode(false); clearSelection(); };

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  const realloc = useMutation({
    mutationFn: () => allocPending(),
    onSuccess: (r) => {
      toast.success(`${r.allocated} alocados / ${r.stillPending} pendentes`);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const delOneMut = useMutation({
    mutationFn: (roomId: string) => delOne({ data: { roomId } }),
    onSuccess: () => { toast.success("Quarto excluído"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível excluir"),
  });

  const delManyMut = useMutation({
    mutationFn: (ids: string[]) => delMany({ data: { roomIds: ids } }),
    onSuccess: (r) => {
      if (r.deleted > 0) toast.success(`${r.deleted} quarto(s) excluído(s)`);
      if (r.blocked > 0) toast.warning(`${r.blocked} ignorado(s) por terem hóspedes pagos`);
      invalidate();
      exitSelection();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir em massa"),
  });

  const askDeleteOne = async (id: string, number: number) => {
    const ok = await confirmDelete({
      title: `Excluir quarto #${String(number).padStart(2, "0")}?`,
      description: "Quartos com hóspedes pagos não podem ser excluídos. Esvazie o quarto primeiro.",
      resourceLabel: `Quarto ${number}`,
    });
    if (ok) delOneMut.mutate(id);
  };

  const askDeleteBulk = async () => {
    const ok = await confirmDelete({
      title: `Excluir ${selectedIds.size} quarto(s)?`,
      description: "Quartos com hóspedes pagos serão ignorados automaticamente.",
      resourceLabel: `${selectedIds.size} quartos selecionados`,
    });
    if (ok) delManyMut.mutate(Array.from(selectedIds));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação"
        title="Quartos"
        description="Inventário físico, ocupação em tempo real e gestão por sexo."
        actions={
          <>
            {/* Desktop: linha completa */}
            <div className="hidden gap-2 sm:flex">
              <Button
                variant={selectionMode ? "default" : "outline"}
                size="sm"
                onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
              >
                {selectionMode ? (<><X className="mr-2 h-4 w-4" /> Sair da seleção</>) : (<><CheckSquare className="mr-2 h-4 w-4" /> Selecionar</>)}
              </Button>
              <Button variant="outline" size="sm" onClick={() => realloc.mutate()} disabled={realloc.isPending}>
                <RefreshCw className="mr-2 h-4 w-4" /> Realocar pendentes
              </Button>
              <Button variant="outline" size="sm" onClick={() => setOpenBulk(true)}>
                <Plus className="mr-2 h-4 w-4" />Em lote
              </Button>
              <Button size="sm" onClick={() => setOpenSingle(true)}>
                <Plus className="mr-2 h-4 w-4" />Novo
              </Button>
            </div>

            {/* Mobile: primário + dropdown */}
            <div className="flex w-full items-center gap-2 sm:hidden">
              <Button size="sm" className="flex-1" onClick={() => setOpenSingle(true)}>
                <Plus className="mr-2 h-4 w-4" /> Novo quarto
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-9 shrink-0 p-0" aria-label="Mais ações">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}>
                    {selectionMode ? <X className="mr-2 h-4 w-4" /> : <CheckSquare className="mr-2 h-4 w-4" />}
                    {selectionMode ? "Sair da seleção" : "Selecionar"}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={realloc.isPending} onClick={() => realloc.mutate()}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Realocar pendentes
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setOpenBulk(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Criar em lote
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <BulkCreateDialog
              open={openBulk}
              onOpenChange={setOpenBulk}
              onCreate={(payload) => bulk({ data: payload }).then(() => { toast.success("Quartos criados"); invalidate(); })}
            />
            <SingleCreateDialog
              open={openSingle}
              onOpenChange={setOpenSingle}
              onCreate={(payload) => single({ data: payload }).then(() => { toast.success("Quarto criado"); invalidate(); })}
            />
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatBox icon={<Layers className="h-4 w-4" />} label="Total" value={s?.total ?? "—"} />
        <StatBox icon={<BedDouble className="h-4 w-4" />} label="Individuais" value={s?.individuals ?? "—"} />
        <StatBox icon={<Users2 className="h-4 w-4" />} label="Galera" value={s?.galera ?? "—"} />
        <StatBox icon={<ShieldOff className="h-4 w-4" />} label="Bloqueados / Manut." value={s?.blocked ?? "—"} />
        <StatBox
          icon={<Layers className="h-4 w-4" />}
          label="Ocupação"
          value={s ? `${s.occupied}/${s.totalCapacity}` : "—"}
          hint={s?.pendingManual ? `${s.pendingManual} pendente(s) manual` : undefined}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por hóspede, e-mail ou nº..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={kind} onValueChange={(v) => setKind(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="neutral">Neutro (sem tipo)</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="galera">Galera</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="available">Disponível</SelectItem>
            <SelectItem value="partial">Parcial</SelectItem>
            <SelectItem value="full">Lotado</SelectItem>
            <SelectItem value="blocked">Bloqueado</SelectItem>
            <SelectItem value="maintenance">Manutenção</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Barra de ações em massa */}
      {selectionMode && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">{selectedIds.size}</span>
            <span className="text-muted-foreground">selecionado(s)</span>
            <Button variant="ghost" size="sm" onClick={allVisibleSelected ? clearSelection : selectAllVisible}>
              {allVisibleSelected ? <Square className="mr-2 h-4 w-4" /> : <CheckSquare className="mr-2 h-4 w-4" />}
              {allVisibleSelected ? "Limpar" : `Selecionar todos (${rows.length})`}
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={selectedIds.size === 0 || delManyMut.isPending}
            onClick={askDeleteBulk}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Excluir selecionados
          </Button>
        </div>
      )}

      {/* Grid */}
      {rq.isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Carregando quartos…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhum quarto encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {rows.map((r) => (
            <RoomCard
              key={r.id}
              room={r}
              onClick={() => setSelected(r.id)}
              selectionMode={selectionMode}
              selected={selectedIds.has(r.id)}
              onToggleSelect={() => toggleSelect(r.id)}
              onDelete={() => askDeleteOne(r.id, r.room_number)}
            />
          ))}
        </div>
      )}

      <RoomDetailDrawer
        roomId={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
}

function StatBox({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {hint && <div className="text-[10px] text-amber-600 dark:text-amber-300">{hint}</div>}
    </div>
  );
}

function BulkCreateDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (p: { count: number; capacity: number }) => Promise<unknown> }) {
  const [count, setCount] = useState(10);
  const [capacity, setCapacity] = useState(8);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Criar quartos em lote</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Quantidade</Label><Input type="number" min={1} max={200} value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
          <div><Label>Capacidade por quarto</Label><Input type="number" min={1} max={50} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></div>
          <p className="text-xs text-muted-foreground">
            O tipo (individual ou galera) será definido automaticamente quando o primeiro hóspede pago for alocado.
          </p>
        </div>
        <DialogFooter>
          <Button disabled={busy} onClick={async () => { setBusy(true); try { await onCreate({ count, capacity }); onOpenChange(false); } finally { setBusy(false); } }}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SingleCreateDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (p: { room_number: number; capacity: number }) => Promise<unknown> }) {
  const [num, setNum] = useState(1);
  const [capacity, setCapacity] = useState(8);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar quarto</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Número do quarto</Label><Input type="number" min={1} value={num} onChange={(e) => setNum(Number(e.target.value))} /></div>
          <div><Label>Capacidade</Label><Input type="number" min={1} max={50} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></div>
          <p className="text-xs text-muted-foreground">
            O tipo (individual ou galera) será carimbado automaticamente quando o quarto receber o primeiro hóspede pago.
          </p>
        </div>
        <DialogFooter>
          <Button disabled={busy} onClick={async () => { setBusy(true); try { await onCreate({ room_number: num, capacity }); onOpenChange(false); } finally { setBusy(false); } }}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}