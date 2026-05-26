import { formatBRL } from "@/lib/payment-fees";
import type { PaymentMethod } from "@/components/reservation/PaymentMethodPicker";
import type { InstallmentOption } from "@/components/reservation/InstallmentSelect";

export function PaymentBreakdown({
  method,
  baseCents,
  cardCents,
  pixCents,
  pixFeeCents,
  pixFeePct,
  total,
  installments,
  installmentOptions,
  installmentsFreeUpTo,
  installmentsInterestPct,
  discountCents = 0,
  finalTotal,
  couponCode,
}: {
  method: PaymentMethod;
  baseCents: number;
  cardCents: number;
  pixCents: number;
  pixFeeCents: number;
  pixFeePct: number;
  total: number;
  installments: number;
  installmentOptions: InstallmentOption[];
  installmentsFreeUpTo: number;
  installmentsInterestPct: number;
  discountCents?: number;
  finalTotal?: number;
  couponCode?: string | null;
}) {
  const installmentAmount =
    installmentOptions.find((i) => i.n === installments)?.amountCents ?? 0;
  const displayTotal = typeof finalTotal === "number" ? finalTotal : total;

  return (
    <dl className="space-y-2 text-sm">
      <Row label="Preço oficial" value={formatBRL(cardCents)} />
      {method === "pix" && pixFeeCents > 0 && (
        <Row
          label={`Taxa PIX (${pixFeePct.toFixed(pixFeePct % 1 ? 2 : 0)}%)`}
          value={`+ ${formatBRL(pixFeeCents)}`}
          muted
        />
      )}
      {method === "credit_card" && installments > installmentsFreeUpTo && (
        <Row
          label={`Juros parcelamento (${installments}x · ${installmentsInterestPct}% a.m.)`}
          value={formatBRL(total - cardCents)}
          muted
        />
      )}
      {discountCents > 0 && (
        <Row
          label={`Desconto${couponCode ? ` (${couponCode})` : ""}`}
          value={`− ${formatBRL(discountCents)}`}
          accent
        />
      )}
      <div className="my-2 h-px bg-border/60" />
      <div className="flex items-center justify-between text-base font-bold">
        <span>Total</span>
        <span className="text-brand">{formatBRL(displayTotal)}</span>
      </div>
      {method === "credit_card" && (
        <p className="text-right text-[11px] text-muted-foreground">
          {installments}x de {formatBRL(installmentAmount)}
          {installments > installmentsFreeUpTo
            ? ` · juros de ${installmentsInterestPct}% ao mês`
            : " sem juros"}
        </p>
      )}
      {method === "pix" && pixFeeCents > 0 && (
        <p className="text-right text-[11px] text-muted-foreground">
          Inclui taxa PIX de {formatBRL(pixFeeCents)}.
        </p>
      )}
    </dl>
  );
}

function Row({
  label,
  value,
  muted = false,
  accent = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        accent ? "text-emerald-600 font-medium" : muted ? "text-muted-foreground" : "text-foreground"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}