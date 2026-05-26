import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { computeBreakdown, formatBRL, readFeesFromGateway, type FeeConfig, DEFAULT_FEES } from "@/lib/payment-fees";
import type { ModalityChoice } from "@/types/reservation";
import { CreditCard, Zap } from "lucide-react";
import { ExperienceRules } from "./ExperienceRules";

interface Props {
  modality: ModalityChoice;
  quantity: number;
  /** Quando informado, lê as taxas direto desse gateway. Caso contrário usa o de maior prioridade ativo. */
  gatewayId?: string;
}

export function OrderSummary({ modality, quantity, gatewayId }: Props) {
  const subtotal = modality.priceCents * quantity;
  const [fees, setFees] = useState<FeeConfig>(DEFAULT_FEES);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = supabase.from("payment_gateways").select("config").eq("active", true).order("priority", { ascending: true }).limit(1);
      const { data } = gatewayId
        ? await supabase.from("payment_gateways").select("config").eq("id", gatewayId).maybeSingle()
        : await q.maybeSingle();
      if (cancelled || !data) return;
      setFees(readFeesFromGateway((data as { config?: unknown }).config));
    })();
    return () => { cancelled = true; };
  }, [gatewayId]);

  const breakdown = computeBreakdown(subtotal, fees);
  const recommendedInstallment = breakdown.installments[Math.min(fees.installmentsFreeUpTo, fees.installmentsMax) - 1];

  return (
    <Card className="space-y-4 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Resumo da reserva
      </h2>
      <div className="flex items-start gap-3">
        {modality.coverImageUrl ? (
          <img src={modality.coverImageUrl} alt="" className="h-16 w-16 rounded-md object-cover" loading="lazy" />
        ) : (
          <div className="h-16 w-16 rounded-md bg-muted" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{modality.name}</p>
          <p className="text-xs text-muted-foreground">
            {quantity} × {formatBRL(modality.priceCents, modality.currency)}
          </p>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border/60 pt-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Preço oficial</span>
          <span>{formatBRL(breakdown.cardCents, modality.currency)}</span>
        </div>
        {breakdown.pixFeeCents > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Taxa PIX</span>
            <span>+ {formatBRL(breakdown.pixFeeCents, modality.currency)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold">
          <span>A partir de</span>
          <span>{formatBRL(breakdown.cardCents, modality.currency)}</span>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Zap className="h-3.5 w-3.5 text-emerald-500" />
            Pix{breakdown.pixFeeCents > 0 ? " (com taxa)" : ""}
          </span>
          <span className="font-bold">{formatBRL(breakdown.pixCents, modality.currency)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <CreditCard className="h-3.5 w-3.5 text-brand" />
            Cartão à vista
          </span>
          <span className="font-bold">{formatBRL(breakdown.cardCents, modality.currency)}</span>
        </div>
        {recommendedInstallment ? (
          <div className="flex items-center justify-between text-muted-foreground">
            <span>
              em até {fees.installmentsMax}x no cartão
              {fees.installmentsFreeUpTo > 1 ? ` · ${fees.installmentsFreeUpTo}x sem juros` : ""}
            </span>
            <span>{formatBRL(recommendedInstallment.amountCents, modality.currency)}</span>
          </div>
        ) : null}
        <p className="pt-1 text-[10px] leading-snug text-muted-foreground">
          Parcelamento disponível com juros de {fees.installmentsInterestPct}% ao mês.
        </p>
      </div>

      <ExperienceRules variant="compact" />
    </Card>
  );
}
