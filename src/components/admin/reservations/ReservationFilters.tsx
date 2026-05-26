import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ReservationFiltersValue = {
  search: string;
  reservationType: string;
  paymentMethod: string;
  status: string;
};

export function ReservationFilters({
  value,
  onChange,
}: {
  value: ReservationFiltersValue;
  onChange: (patch: Partial<ReservationFiltersValue>) => void;
}) {
  return (
    <div className="admin-card p-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail, telefone ou cidade…"
            value={value.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="pl-9"
          />
        </div>
        <div className="md:col-span-3">
          <Select
            value={value.reservationType}
            onValueChange={(v) => onChange({ reservationType: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Modalidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas modalidades</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="shared">Compartilhado</SelectItem>
              <SelectItem value="galera">Galera</SelectItem>
              <SelectItem value="couple">Casal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Select
            value={value.paymentMethod}
            onValueChange={(v) => onChange({ paymentMethod: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos pagamentos</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="credit_card">Cartão</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Select value={value.status} onValueChange={(v) => onChange({ status: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}