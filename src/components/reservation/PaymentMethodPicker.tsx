import type { ReactNode } from "react";
import { CheckCircle2, CreditCard, Zap } from "lucide-react";

import { formatBRL } from "@/lib/payment-fees";

export type PaymentMethod = "pix" | "credit_card";

export function PaymentMethodPicker({
  method,
  onChange,
  pixCents,
  cardCents,
  pixFeePct,
  installmentsMax,
  installmentsFreeUpTo,
}: {
  method: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  pixCents: number;
  cardCents: number;
  pixFeePct: number;
  installmentsMax: number;
  installmentsFreeUpTo: number;
}) {
  const freeLabel =
    installmentsFreeUpTo > 1 ? `${installmentsFreeUpTo}x sem juros` : "1x sem juros";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <MethodCard
        active={method === "pix"}
        onClick={() => onChange("pix")}
        icon={<Zap className="h-5 w-5 text-emerald-500" />}
        title="Pix"
        subtitle={
          pixFeePct > 0
            ? "Aprovação instantânea — taxa PIX aplicada"
            : "Aprovação instantânea"
        }
        badge={pixFeePct > 0 ? `+${pixFeePct.toFixed(pixFeePct % 1 ? 2 : 0)}% taxa PIX` : "Pix"}
        price={formatBRL(pixCents)}
      />
      <MethodCard
        active={method === "credit_card"}
        onClick={() => onChange("credit_card")}
        icon={<CreditCard className="h-5 w-5 text-brand" />}
        title="Cartão de crédito"
        subtitle={`Em até ${installmentsMax}x · ${freeLabel}`}
        badge="Preço oficial"
        price={formatBRL(cardCents)}
      />
    </div>
  );
}

function MethodCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
  badge,
  price,
  strikePrice,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
  badge: string;
  price: string;
  strikePrice?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition ${
        active
          ? "border-brand bg-brand/5 shadow-[0_0_0_3px_var(--brand)/15]"
          : "border-border/60 bg-background/40 hover:border-border"
      }`}
    >
      {active && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
          <CheckCircle2 className="h-3 w-3" /> Selecionado
        </span>
      )}
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-1 flex w-full items-baseline justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {badge}
        </span>
        <span className="flex items-baseline gap-1.5">
          {strikePrice ? (
            <span className="text-[11px] text-muted-foreground line-through">{strikePrice}</span>
          ) : null}
          <span className="text-sm font-bold">{price}</span>
        </span>
      </div>
    </button>
  );
}