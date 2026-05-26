import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tag, X, Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";

import { ReservationShell } from "@/components/reservation/ReservationShell";
import { OrderSummary } from "@/components/reservation/OrderSummary";
import { StepActions } from "@/components/reservation/StepActions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PaymentMethodPicker,
  type PaymentMethod,
} from "@/components/reservation/PaymentMethodPicker";
import { PaymentBreakdown } from "@/components/reservation/PaymentBreakdown";
import { ExperienceRules } from "@/components/reservation/ExperienceRules";
import { BricksCheckout } from "@/components/reservation/BricksCheckout";
import { useReservation } from "@/hooks/use-reservation";
import { useRedirectIfIncomplete } from "@/hooks/use-redirect-if-incomplete";
import { validatePromoCoupon } from "@/lib/promo-coupons.functions";
import { prepareOrderForCheckout } from "@/lib/payments.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  computeBreakdown,
  DEFAULT_FEES,
  readFeesFromGateway,
} from "@/lib/payment-fees";
import { createCheckout } from "@/lib/checkout.functions";
import { toAppError } from "@/lib/errors";
import { useT } from "@/components/i18n/LocaleProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";


const checkoutSearchSchema = z.object({
  resume: z.string().optional(),
});

export const Route = createFileRoute("/reservation/checkout")({
  validateSearch: (s) => checkoutSearchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Pagamento — Way Home" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CheckoutStep />
    </RequireAuth>
  ),
});

function CheckoutStep() {
  const t = useT();
  const { state } = useReservation();
  const checkoutFn = useServerFn(createCheckout);
  const validatePromoFn = useServerFn(validatePromoCoupon);
  const prepareOrderFn = useServerFn(prepareOrderForCheckout);
  const search = Route.useSearch();
  const isResuming = search.resume === "1";

  useRedirectIfIncomplete("checkout");

  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discountCents: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Carrega taxas do gateway ativo
  const feesQuery = useQuery({
    queryKey: ["gateway-fees", state.gatewayId ?? "default"],
    queryFn: async () => {
      const base = supabase
        .from("payment_gateways")
        .select("config")
        .eq("active", true)
        .order("priority", { ascending: true })
        .limit(1);
      const { data } = state.gatewayId
        ? await supabase
            .from("payment_gateways")
            .select("config")
            .eq("id", state.gatewayId)
            .maybeSingle()
        : await base.maybeSingle();
      return readFeesFromGateway((data as { config?: unknown } | null)?.config);
    },
  });
  const fees = feesQuery.data ?? DEFAULT_FEES;

  const baseCents = (state.modality?.priceCents ?? 0) * (state.participant?.quantity ?? 1);
  const breakdown = useMemo(() => computeBreakdown(baseCents, fees), [baseCents, fees]);

  const total = method === "pix" ? breakdown.pixCents : breakdown.cardCents;
  const promoDiscount = promo?.discountCents ?? 0;
  const totalAfterPromo = Math.max(0, total - promoDiscount);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!state.modality || !state.participant) throw new Error("Dados incompletos.");
      const payload = {
        productSlug: state.modality.productSlug,
        quantity: state.participant.quantity,
        customerEmail: state.participant.email,
        customerName: state.participant.name,
        customerPhone: state.participant.whatsapp || undefined,
        customerDocument: state.participant.cpf || undefined,
        participantId: state.participant.participantId,
        reservationType: state.modality.kind,
        gatewayId: state.gatewayId,
        groupCouponCode: state.participant.groupCouponCode || undefined,
        isGroupHolder: state.participant.isGroupHolder ?? undefined,
        groupCapacity: state.participant.groupCapacity ?? undefined,
        promoCouponCode: promo?.code || undefined,
      };
      // Regra fixa, independente do modo configurado:
      //  - Cartão de crédito → SEMPRE Checkout Pro do Mercado Pago, aberto em
      //    NOVA ABA (página hospedada do MP).
      //  - PIX / Boleto → SEMPRE on-site (Bricks). O QR Code é renderizado
      //    aqui mesmo e o status é validado por polling no próprio site.
      if (method === "credit_card") {
        const res = await checkoutFn({
          data: {
            ...payload,
            paymentMethod: "credit_card",
            installments: 1,
          } as any,
        });
        return { ...(res as any), checkoutMode: "pro" as const };
      }
      // Bricks: só cria o pedido — cobrança real acontece no BricksCheckout.
      const res = await prepareOrderFn({ data: payload as any });
      const r = res as any;
      if (r.freeOrder) {
        return {
          orderId: r.orderId,
          checkoutUrl: `/checkout/sucesso?order=${r.orderId}&free=1`,
          checkoutMode: "pro" as const,
        };
      }
      return { orderId: r.orderId, checkoutUrl: null, checkoutMode: "bricks" as const };
    },
    onSuccess: (res) => {
      if (res.checkoutMode === "pro" && res.checkoutUrl) {
        // Cartão de crédito abre na PÁGINA HOSPEDADA do Mercado Pago em uma
        // nova aba. Mantemos o site original aberto para o usuário voltar
        // após concluir o pagamento.
        toast.success("Abrindo pagamento seguro em nova aba…");
        const win = window.open(res.checkoutUrl, "_blank", "noopener,noreferrer");
        if (!win) {
          // Pop-up bloqueado — fallback para redirect na mesma aba.
          window.location.assign(res.checkoutUrl);
        }
      } else {
        setOrderId(res.orderId);
      }
    },
    onError: (err: unknown) => {
      const app = toAppError(err);
      const msg = err instanceof Error ? err.message : app.userMessage;
      toast.error("Erro no checkout", { description: msg });
    },
  });


  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await validatePromoFn({
        data: {
          code: promoInput.trim(),
          productSlug: state.modality?.productSlug,
          amountCents: total,
        },
      });
      if (!res.valid) {
        const reason = res.reason || "invalid";
        const reasonMsg = t(`reservation.couponReason.${reason}`);
        // Quando a chave não existe o tradutor devolve a própria chave.
        const fallback = t("reservation.couponInvalid");
        setPromoError(
          reasonMsg && !reasonMsg.startsWith("reservation.couponReason.")
            ? reasonMsg
            : fallback,
        );
        setPromo(null);
      } else {
        setPromo({ code: res.code ?? promoInput.trim().toUpperCase(), discountCents: res.discountCents });
        setOrderId(null); // Força recriar pedido com desconto
      }
    } catch (e: any) {
      setPromoError(e.message);
    } finally {
      setPromoLoading(false);
    }
  };

  if (!state.modality || !state.participant) return null;

  return (
    <ReservationShell
      step="checkout"
      title="Confirme e pague"
      subtitle="Escolha o método e conclua o pagamento diretamente aqui."
      aside={<OrderSummary modality={state.modality} quantity={state.participant.quantity} />}
    >
      <div className="space-y-5">
        {isResuming && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                E-mail confirmado — só falta o pagamento
              </p>
              <p className="text-xs text-muted-foreground">
                Sua reserva está pendente com os dados que você preencheu.
                Conclua o pagamento abaixo para garantir sua vaga.
              </p>
            </div>
          </div>
        )}
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Participante
          </h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Nome</dt>
              <dd className="font-medium">{state.participant.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">E-mail</dt>
              <dd className="font-medium break-all">{state.participant.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Modalidade</dt>
              <dd className="font-medium">{state.modality.name}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Método de pagamento
          </h2>
          <PaymentMethodPicker
            method={method}
            onChange={setMethod}
            pixCents={breakdown.pixCents}
            cardCents={breakdown.cardCents}
            pixFeePct={fees.pixFeePct}
            installmentsMax={fees.installmentsMax}
            installmentsFreeUpTo={fees.installmentsFreeUpTo}
          />
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Revisão do valor
          </h2>
          <PaymentBreakdown
            method={method}
            baseCents={baseCents}
            cardCents={breakdown.cardCents}
            pixCents={breakdown.pixCents}
            pixFeeCents={breakdown.pixFeeCents}
            pixFeePct={fees.pixFeePct}
            total={total}
            installments={1}
            installmentOptions={breakdown.installments}
            installmentsFreeUpTo={fees.installmentsFreeUpTo}
            installmentsInterestPct={fees.installmentsInterestPct}
            discountCents={promoDiscount}
            finalTotal={totalAfterPromo}
            couponCode={promo?.code ?? null}
          />
          <div className="mt-4 border-t pt-4 space-y-2">
            {state.participant?.groupCouponCode && (
              <div className="rounded-md border border-brand/30 bg-brand/5 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-brand">Cupom Galera ativo</span> ·
                {" "}vínculo ao quarto via{" "}
                <span className="font-mono font-semibold">{state.participant.groupCouponCode}</span>.
                Você ainda pode usar um cupom promocional de desconto abaixo.
              </div>
            )}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <Tag className="h-3 w-3" /> {t("reservation.promoCoupon")}
              </p>
              {promo ? (
                <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
                  <span>{t("reservation.couponApplied", { code: promo.code })}</span>
                  <button type="button" onClick={() => { setPromo(null); setOrderId(null); }}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Código promocional"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    className="font-mono uppercase tracking-wider"
                  />
                  <Button variant="outline" onClick={applyPromo} disabled={promoLoading}>
                    {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.apply")}
                  </Button>
                </div>
              )}
              {promoError && <p className="text-xs text-destructive">{promoError}</p>}
          </div>
        </Card>

        {!orderId ? (
          <>
            <div className="py-4">
            <Button
              className="w-full h-12 text-lg font-bold"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              {mutation.isPending
                ? t("reservation.continueToPayment")
                : t("reservation.goToPayment")}
            </Button>
            </div>
          </>
        ) : (
          <BricksCheckout
            orderId={orderId}
            amountCents={totalAfterPromo}
            method={method}
            customerEmail={state.participant.email}
            customerName={state.participant.name}
            customerPhone={state.participant.whatsapp}
            customerDocument={state.participant.cpf}
          />
        )}


        <Card className="p-5 sm:p-6">
          <ExperienceRules />
        </Card>

        <StepActions backHref="/reservation/terms" onPrimary={() => {}} />
      </div>

    </ReservationShell>
  );
}
