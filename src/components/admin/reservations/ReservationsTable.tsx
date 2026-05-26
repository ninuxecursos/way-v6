import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { DataTableEmpty } from "@/components/ui/data-table-empty";
import { fmtBRL } from "@/lib/format";
import {
  PAYMENT_LABEL,
  RESERVATION_LABEL,
  STATUS_LABEL,
  statusVariant,
  type ReservationRow,
} from "@/lib/reservations";

const COLS = 8;

export function ReservationsTable({
  rows,
  loading,
  selected,
  onToggle,
  onToggleAll,
}: {
  rows: ReservationRow[];
  loading: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
}) {
  const ids = rows.map((r) => r.id);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = ids.some((id) => selected.has(id));
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(c) => onToggleAll(ids, c === true)}
                aria-label="Selecionar todas"
              />
            </TableHead>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden md:table-cell">Telefone</TableHead>
            <TableHead className="hidden lg:table-cell">Cidade</TableHead>
            <TableHead>Modalidade</TableHead>
            <TableHead className="hidden md:table-cell">Pagamento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeleton columns={COLS} />
          ) : rows.length === 0 ? (
            <DataTableEmpty
              colSpan={COLS}
              icon={<ClipboardList className="h-8 w-8 opacity-50" />}
              title="Nenhuma reserva encontrada"
              description="Ajuste os filtros ou aguarde novas reservas."
            />
          ) : (
            rows.map((r) => (
              <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => onToggle(r.id)}
                    aria-label={`Selecionar ${r.participant?.full_name ?? r.id}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{r.participant?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.participant?.email ?? "—"}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell tabular-nums">
                  {r.participant?.phone ?? "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {r.participant?.city ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {RESERVATION_LABEL[r.reservation_type ?? ""] ?? r.reservation_type}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {PAYMENT_LABEL[r.payment_method ?? ""] ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(r.status)}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {fmtBRL(r.final_price_cents ?? r.total_cents)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}