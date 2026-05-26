import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentGatewayConfig,
  PaymentProvider,
} from "../types";

/**
 * Stripe — Checkout Session (modo `payment`).
 * Requer `secret_key` em config. PIX e Boleto disponíveis para conta BRL.
 */
export const stripeProvider: PaymentProvider = {
  id: "stripe",
  supports: ["pix", "credit_card", "boleto"],
  async createPayment(
    input: CreatePaymentInput,
    gateway: PaymentGatewayConfig,
  ): Promise<CreatePaymentResult> {
    const cfg = gateway.config as { secret_key?: string };
    const secret = cfg.secret_key;
    if (!secret)
      throw new Error("Stripe: secret_key ausente em config (admin → Gateway → Stripe).");

    const methodMap: Record<string, string> = {
      pix: "pix",
      credit_card: "card",
      boleto: "boleto",
    };

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", input.successUrl);
    params.set("cancel_url", input.failureUrl);
    params.set("client_reference_id", input.orderId);
    params.set("customer_email", input.customerEmail);
    params.set("payment_method_types[0]", methodMap[input.paymentMethod]);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
    params.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
    params.set("line_items[0][price_data][product_data][name]", input.description);
    if (input.paymentMethod === "credit_card") {
      params.set("payment_method_options[card][installments][enabled]", "true");
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const json = (await res.json()) as { url?: string; id?: string; error?: { message: string } };
    if (!res.ok || !json.url) {
      throw new Error(`Stripe [${res.status}]: ${json.error?.message ?? JSON.stringify(json)}`);
    }
    return { checkoutUrl: json.url, externalId: json.id ?? null, rawResponse: json };
  },
};