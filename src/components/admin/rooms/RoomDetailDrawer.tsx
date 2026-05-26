import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  getRoomDetail,
  updateRoom,
  deleteRoom,
  moveOccupant,
  removeOccupant,
  listCompatibleRooms,
} from "@/lib/rooms.functions";
import { Trash2, ArrowRightLeft, Save, UserMinus } from "lucide-react";

export function RoomDetailDrawer({
  roomId,
  open,
  onOpenChange,
}: {
  roomId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const fetchDetail = useServerFn(getRoomDetail);
  const update = useServerFn(updateRoom);
  const del = useServerFn(deleteRoom);
  const remove = useServerFn(removeOccupant);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin", "room", roomId],
    queryFn: () => fetchDetail({ data: { roomId: roomId! } }),
    enabled: !!roomId && open,
  });

  const room = q.data?.room;
  const occupants = q.data?.occupants ?? [];

  const [capacity, setCapacity] = useState<number>(8);
  const [kind, setKind] = useState<"individual" | "galera" | "neutral">("neutral");
  const [genderPolicy, setGenderPolicy] = useState<"mixed" | "male" | "female">("mixed");
  const [active, setActive] = useState<boolean>(true);
  const [status, setStatus] = useState<string>("available");
  const [notes, setNotes] = useState<string>("");

  // Sincroniza form quando carrega
  if (room && room.id === roomId && capacity !== room.capacity) {
    setCapacity(room.capacity);
    setKind((room.kind as "individual" | "galera" | null) ?? "neutral");
    setGenderPolicy(room.gender_policy as "mixed" | "male" | "female");
    setActive(room.active);
    setStatus(room.status);
    setNotes(room.notes ?? "");
  }

  const save = useMutation({
    mutationFn: () =>
      update({
        data: {
          roomId: roomId!,
          patch: { capacity, kind: kind === "neutral" ? null : kind, gender_policy: genderPolicy, active, status: status as any, notes: notes || null },
        },
      }),
    onSuccess: () => {
      toast.success("Quarto atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "rooms"] });
      qc.invalidateQueries({ queryKey: ["admin", "room", roomId] });
      qc.invalidateQueries({ queryKey: ["admin", "rooms-stats"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  const removeDel = useMutation({
    mutationFn: () => del({ data: { roomId: roomId! } }),
    onSuccess: () => {
      toast.success("Quarto excluído");
      qc.invalidateQueries({ queryKey: ["admin", "rooms"] });
      qc.invalidateQueries({ queryKey: ["admin", "rooms-stats"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const removeOcc = useMutation({
    mutationFn: (orderId: string) => remove({ data: { orderId } }),
    onSuccess: () => {
      toast.success("Hóspede removido");
      qc.invalidateQueries({ queryKey: ["admin", "room", roomId] });
      qc.invalidateQueries({ queryKey: ["admin", "rooms"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const male = occupants.filter((o) => o.gender === "m").length;
  const female = occupants.filter((o) => o.gender === "f").length;
  const other = occupants.length - male - female;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {room ? `Quarto #${String(room.room_number).padStart(2, "0")}` : "Quarto"}
          </SheetTitle>
          <SheetDescription>Gerencie ocupação, tipo e configurações.</SheetDescription>
        </SheetHeader>

        {!room ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Contadores */}
            <div className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Ocupação</div>
                <div className="text-lg font-semibold">{occupants.length}/{room.capacity}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Masc.</div>
                <div className="text-lg font-semibold">{male}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fem.</div>
                <div className="text-lg font-semibold">{female}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Outros</div>
                <div className="text-lg font-semibold">{other}</div>
              </div>
            </div>

            {/* Configurações */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Configurações</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Capacidade</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={kind} onValueChange={(v) => setKind(v as any)} disabled={occupants.length > 0}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neutral">Neutro (auto)</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="galera">Galera</SelectItem>
                    </SelectContent>
                  </Select>
                  {occupants.length > 0 && (
                    <p className="mt-1 text-[10px] text-muted-foreground">Esvazie para trocar entre Individual e Galera.</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Política de gênero</Label>
                  <Select value={genderPolicy} onValueChange={(v) => setGenderPolicy(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mixed">Misto</SelectItem>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                      <SelectItem value="full">Lotado</SelectItem>
                      <SelectItem value="blocked">Bloqueado</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="room-active"
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="room-active" className="text-xs">Quarto ativo (entra na alocação automática)</Label>
              </div>
              <div>
                <Label className="text-xs">Notas internas</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => save.mutate()} disabled={save.isPending} size="sm">
                  <Save className="mr-2 h-4 w-4" /> Salvar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={occupants.length > 0}>
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir quarto?</AlertDialogTitle>
                      <AlertDialogDescription>Ação irreversível. Esta operação remove o quarto do inventário.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => removeDel.mutate()}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Ocupantes */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Hóspedes ({occupants.length})</h3>
              {occupants.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Quarto vazio.
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {occupants.map((o) => (
                    <li key={o.order_id} className="flex flex-wrap items-center gap-2 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{o.full_name ?? "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">{o.email ?? "—"}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {o.gender === "m" ? "Masc." : o.gender === "f" ? "Fem." : "Indef."}
                      </Badge>
                      {o.group_id && (
                        <Badge variant="outline" className="border-purple-500/30 text-[10px] text-purple-700 dark:text-purple-300">
                          Galera
                        </Badge>
                      )}
                      <MoveOccupantButton orderId={o.order_id} onMoved={() => qc.invalidateQueries({ queryKey: ["admin", "room", roomId] })} />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeOcc.mutate(o.order_id)}
                        title="Remover do quarto"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MoveOccupantButton({ orderId, onMoved }: { orderId: string; onMoved: () => void }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>("");
  const list = useServerFn(listCompatibleRooms);
  const move = useServerFn(moveOccupant);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin", "compat-rooms", orderId],
    queryFn: () => list({ data: { orderId } }),
    enabled: open,
  });

  const mv = useMutation({
    mutationFn: () => move({ data: { orderId, targetRoomId: target } }),
    onSuccess: () => {
      toast.success("Hóspede movido");
      setOpen(false);
      setTarget("");
      qc.invalidateQueries({ queryKey: ["admin", "rooms"] });
      onMoved();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Mover">
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mover para outro quarto</AlertDialogTitle>
          <AlertDialogDescription>Apenas quartos compatíveis e com vaga aparecem.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger><SelectValue placeholder="Escolha o quarto" /></SelectTrigger>
            <SelectContent>
              {(q.data?.rooms ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  Quarto #{String(r.room_number).padStart(2, "0")} — {r.occupied}/{r.capacity} ({r.kind ?? "neutro"})
                </SelectItem>
              ))}
              {(q.data?.rooms ?? []).length === 0 && (
                <div className="p-2 text-xs text-muted-foreground">Nenhum quarto compatível.</div>
              )}
            </SelectContent>
          </Select>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => mv.mutate()} disabled={!target}>Mover</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}