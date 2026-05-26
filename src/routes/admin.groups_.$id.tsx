import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ChevronLeft, Lock, Unlock, Trash2, DoorOpen, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  getGroupAdmin, closeGroupManual, reopenGroup, removeGroupMember,
  addGroupRoom, setMemberRoom, deleteGroup,
} from "@/lib/groups.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fmtBRL } from "@/lib/format";
import { useConfirmDelete } from "@/components/common/ConfirmDeleteProvider";

export const Route = createFileRoute("/admin/groups_/$id")({ component: AdminGroupDetail });

function AdminGroupDetail() {
  const { id } = Route.useParams();
  const fetchGroup = useServerFn(getGroupAdmin);
  const closeFn = useServerFn(closeGroupManual);
  const reopenFn = useServerFn(reopenGroup);
  const removeFn = useServerFn(removeGroupMember);
  const addRoomFn = useServerFn(addGroupRoom);
  const setRoomFn = useServerFn(setMemberRoom);
  const delGroupFn = useServerFn(deleteGroup);
  const qc = useQueryClient();
  const confirmDelete = useConfirmDelete();
  const navigate = useNavigate();

  const q = useQuery({
    queryKey: ["admin", "groups", id],
    queryFn: () => fetchGroup({ data: { groupId: id } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "groups", id] });

  const handleClose = async () => {
    try { await closeFn({ data: { groupId: id } }); toast.success("Grupo fechado."); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Erro ao fechar grupo."); }
  };
  const handleReopen = async () => {
    try { await reopenFn({ data: { groupId: id } }); toast.success("Grupo reaberto."); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Erro ao reabrir grupo."); }
  };
  const handleRemove = async (memberId: string) => {
    const ok = await confirmDelete({
      title: "Remover membro do grupo?",
      description: "O membro perderá o vínculo com este grupo Galera.",
      confirmWord: "REMOVER",
      confirmButtonLabel: "Remover",
    });
    if (!ok) return;
    try { await removeFn({ data: { memberId } }); toast.success("Membro removido."); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Erro ao remover membro."); }
  };

  const delGroupMut = useMutation({
    mutationFn: () => delGroupFn({ data: { groupId: id } }),
    onSuccess: () => {
      toast.success("Grupo excluído.");
      qc.invalidateQueries({ queryKey: ["admin", "groups"] });
      navigate({ to: "/admin/groups" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir grupo."),
  });

  const handleDeleteGroup = async () => {
    const ok = await confirmDelete({
      title: "Excluir grupo definitivamente?",
      description: "Todos os membros e quartos serão apagados. Pedidos pagos serão desvinculados.",
      resourceLabel: `${(q.data as any)?.group?.coupon_code} — ${(q.data as any)?.group?.holder_name}`,
    });
    if (ok) delGroupMut.mutate();
  };

  const handleAddRoom = async () => {
    try { await addRoomFn({ data: { groupId: id } }); toast.success("Quarto criado."); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Erro ao criar quarto."); }
  };
  const handleSetRoom = async (memberId: string, roomId: string | null) => {
    try { await setRoomFn({ data: { memberId, roomId } }); toast.success("Hóspede movido."); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Erro ao mover."); }
  };

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!q.data) return <p className="text-sm text-destructive">Grupo não encontrado.</p>;

  const { group, members, orders, rooms } = q.data as any;
  const isOpen = group.status === "open";
  const roomList: any[] = rooms ?? [];
  const memberList: any[] = members ?? [];
  const membersByRoom = new Map<string | null, any[]>();
  for (const m of memberList) {
    const key = m.room_id ?? null;
    const arr = membersByRoom.get(key) ?? [];
    arr.push(m);
    membersByRoom.set(key, arr);
  }
  const unassigned = membersByRoom.get(null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/groups"><ChevronLeft className="h-4 w-4 mr-1" /> Voltar</Link>
        </Button>
      </div>

      <Card className="p-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold">
              <code className="font-mono">{group.coupon_code}</code>
            </h1>
            <p className="text-sm text-muted-foreground">
              Titular: {group.holder_name} · Produto: {group.product_slug} · Capacidade: {group.capacity}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOpen ? "default" : "secondary"}>{group.status}</Badge>
            {isOpen ? (
              <Button variant="outline" size="sm" onClick={handleClose}>
                <Lock className="h-4 w-4 mr-1" /> Fechar manualmente
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleReopen}>
                <Unlock className="h-4 w-4 mr-1" /> Reabrir
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteGroup}
              disabled={delGroupMut.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Excluir grupo
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            Quartos do grupo ({memberList.length}/{group.capacity} hóspedes · {roomList.length} quarto{roomList.length === 1 ? "" : "s"})
          </h2>
          <Button variant="outline" size="sm" onClick={handleAddRoom}>
            <Plus className="h-4 w-4 mr-1" /> Novo quarto
          </Button>
        </div>
        {roomList.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Quartos serão gerados automaticamente quando todas as vagas estiverem pagas.
          </p>
        )}
        {roomList.map((room: any) => {
          const inRoom = membersByRoom.get(room.id) ?? [];
          return (
            <div key={room.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <DoorOpen className="h-4 w-4" /> Quarto {room.room_number}
                  <Badge variant="secondary">{inRoom.length}/{room.capacity}</Badge>
                </p>
              </div>
              <ul className="divide-y">
                {inRoom.length === 0 && (
                  <li className="py-2 text-xs text-muted-foreground">Vazio</li>
                )}
                {inRoom.map((m: any) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    rooms={roomList}
                    onMove={handleSetRoom}
                    onRemove={handleRemove}
                  />
                ))}
              </ul>
            </div>
          );
        })}
        {unassigned.length > 0 && (
          <div className="rounded-lg border border-dashed p-3 space-y-2">
            <p className="text-sm font-semibold">Sem quarto atribuído ({unassigned.length})</p>
            <ul className="divide-y">
              {unassigned.map((m: any) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  rooms={roomList}
                  onMove={handleSetRoom}
                  onRemove={handleRemove}
                />
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Pedidos vinculados ({orders.length})</h2>
        <ul className="divide-y">
          {orders.map((o: any) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs">{o.id}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {o.customer_email} · {o.payment_method ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums">{fmtBRL(o.total_cents)}</span>
                <Badge variant={o.status === "paid" ? "default" : "secondary"}>{o.status}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function MemberRow({
  member: m, rooms, onMove, onRemove,
}: {
  member: any;
  rooms: any[];
  onMove: (memberId: string, roomId: string | null) => void;
  onRemove: (memberId: string) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {m.full_name} {m.role === "holder" && <Badge variant="outline" className="ml-1">Titular</Badge>}
        </p>
        <p className="truncate text-xs text-muted-foreground">{m.email} · {m.phone ?? "—"}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={m.payment_status === "paid" ? "default" : "secondary"}>
          {m.payment_status}
        </Badge>
        {rooms.length > 0 && (
          <Select
            value={m.room_id ?? "none"}
            onValueChange={(v) => onMove(m.id, v === "none" ? null : v)}
          >
            <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem quarto</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>Quarto {r.room_number}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {m.role !== "holder" && (
          <Button variant="ghost" size="sm" onClick={() => onRemove(m.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  );
}