import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/payment-fees";

export type InstallmentOption = {
  n: number;
  amountCents: number;
  interest: boolean;
};

export function InstallmentSelect({
  installments,
  onChange,
  options,
  installmentsFreeUpTo,
  installmentsInterestPct,
}: {
  installments: number;
  onChange: (n: number) => void;
  options: InstallmentOption[];
  installmentsFreeUpTo: number;
  installmentsInterestPct: number;
}) {
  return (
    <div className="mt-5 space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Parcelas
      </label>
      <Select value={String(installments)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((i) => (
            <SelectItem key={i.n} value={String(i.n)}>
              {i.n}x de {formatBRL(i.amountCents)}
              {i.interest ? " (com juros)" : i.n > 1 ? " sem juros" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        Parcelamento disponível com juros de {installmentsInterestPct}% ao mês
        {installmentsFreeUpTo > 1 ? ` (acima de ${installmentsFreeUpTo}x)` : ""}.
      </p>
    </div>
  );
}