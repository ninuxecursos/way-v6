/**
 * Preço, desconto e parcelamento para o checkout Way Home.
 * Lê config diretamente do gateway (campo `config` jsonb em payment_gateways).
 *
 * Estratégia comercial:
 *  - O preço do produto (price_cents) é o PREÇO OFICIAL (cartão 1x).
 *  - PIX recebe uma TAXA (pix_fee_pct) somada ao preço oficial.
 *  - Parcelamento até `installments_max` com juros transparentes
 *    (`installments_interest_pct` ao mês) acima de `installments_free_up_to`.
 *  - Descontos são tratados exclusivamente via cupons promocionais.
 */

export interface FeeConfig {
  /** Taxa adicionada ao PIX (%). Ex.: 7 → R$2.000 viram R$2.140 no PIX. */
  pixFeePct: number;
  /** Parcelas máximas no cartão. */
  installmentsMax: number;
  /** Juros mensais (%) acima do limite sem juros. */
  installmentsInterestPct: number;
  /** Até quantas parcelas sem juros (1 = só à vista sem juros). */
  installmentsFreeUpTo: number;
}

export const DEFAULT_FEES: FeeConfig = {
  pixFeePct: 0,
  installmentsMax: 10,
  installmentsInterestPct: 3,
  installmentsFreeUpTo: 1,
};

export function readFeesFromGateway(config: unknown): FeeConfig {
  const c = (config ?? {}) as Record<string, unknown>;
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  // Compat: aceita `pix_fee_pct` (novo) e cai para `pix_discount_pct` (antigo)
  // para gateways já cadastrados — o valor passa a representar TAXA somada ao PIX.
  return {
    pixFeePct: num(c.pix_fee_pct, num(c.pix_discount_pct, DEFAULT_FEES.pixFeePct)),
    installmentsMax: num(c.installments_max, DEFAULT_FEES.installmentsMax),
    installmentsInterestPct: num(c.installments_interest_pct, DEFAULT_FEES.installmentsInterestPct),
    installmentsFreeUpTo: num(c.installments_free_up_to, DEFAULT_FEES.installmentsFreeUpTo),
  };
}

export interface PriceBreakdown {
  baseCents: number;
  /** Preço final no PIX (preço oficial + taxa PIX). */
  pixCents: number;
  /** Preço oficial (cartão 1x). */
  cardCents: number;
  /** Valor da taxa PIX em centavos (>= 0). */
  pixFeeCents: number;
  installments: { n: number; amountCents: number; interest: boolean }[];
}

export function computeBreakdown(baseCents: number, fees: FeeConfig): PriceBreakdown {
  // Preço oficial = preço cadastrado (cartão 1x). PIX recebe TAXA somada.
  const cardCents = baseCents;
  const pixCents = Math.round(baseCents * (1 + fees.pixFeePct / 100));
  const pixFeeCents = Math.max(0, pixCents - cardCents);
  const installments: PriceBreakdown["installments"] = [];
  for (let n = 1; n <= Math.max(1, fees.installmentsMax); n++) {
    const interest = n > fees.installmentsFreeUpTo;
    const total = interest
      ? cardCents * Math.pow(1 + fees.installmentsInterestPct / 100, n - fees.installmentsFreeUpTo)
      : cardCents;
    installments.push({ n, amountCents: Math.round(total / n), interest });
  }
  return { baseCents, pixCents, cardCents, pixFeeCents, installments };
}

export function formatBRL(cents: number, currency = "BRL"): string {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}
