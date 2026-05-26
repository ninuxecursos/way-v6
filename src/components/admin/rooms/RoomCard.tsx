import { Badge } from "@/components/ui/badge";
import type { RoomRow } from "@/lib/rooms.functions";
import { Users, Lock, Wrench, Power, Trash2, Check } from "lucide-react";

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  available: { label: "Disponível", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  partial: { label: "Parcial", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  full: { label: "Lotado", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  blocked: { label: "Bloqueado", cls: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
  maintenance: { label: "Manutenção", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
};

type Props = {
  room: RoomRow;
  onClick: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onDelete?: () => void;
};

export function RoomCard({ room, onClick, selectionMode = false, selected = false, onToggleSelect, onDelete }: Props) {
  const s = STATUS_STYLES[room.status] ?? STATUS_STYLES.available;
  const pct = room.capacity > 0 ? Math.min(100, Math.round((room.occupied / room.capacity) * 100)) : 0;

  return (
    <button
      type="button"
      onClick={() => (selectionMode ? onToggleSelect?.() : onClick())}
      className={`group relative flex flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40 ${
        selected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"
      }`}
    >
      {/* Checkbox visual no modo seleção */}
      {selectionMode && (
        <span
          aria-hidden
          className={`absolute left-2 top-2 z-10 grid h-5 w-5 place-items-center rounded border ${
            selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      )}
      {/* Botão excluir individual */}
      {!selectionMode && onDelete && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Excluir quarto ${room.room_number}`}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onDelete(); } }}
          className="absolute right-2 top-2 z-10 grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-border bg-card text-muted-foreground opacity-0 transition-opacity hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-600 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className={selectionMode ? "pl-7" : ""}>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Quarto</div>
          <div className="text-xl font-semibold">#{String(room.room_number).padStart(2, "0")}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge
            variant="outline"
            className={
              room.kind === "galera"
                ? "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                : room.kind === "individual"
                  ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  : "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300"
            }
          >
            {room.kind === "galera" ? "Galera" : room.kind === "individual" ? "Individual" : "Neutro"}
          </Badge>
          {!room.active && (
            <Badge variant="outline" className="border-slate-500/30 text-slate-600">
              <Power className="mr-1 h-3 w-3" /> Inativo
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            {room.occupied}/{room.capacity}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>
            {room.status === "blocked" && <Lock className="mr-1 inline h-3 w-3" />}
            {room.status === "maintenance" && <Wrench className="mr-1 inline h-3 w-3" />}
            {s.label}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>M: <strong className="text-foreground">{room.male}</strong></span>
        <span>F: <strong className="text-foreground">{room.female}</strong></span>
        <span>I: <strong className="text-foreground">{room.other}</strong></span>
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5">
          {room.gender_policy === "male" ? "♂" : room.gender_policy === "female" ? "♀" : "M+F"}
        </span>
      </div>
    </button>
  );
}