import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentGatewayConfig,
  PaymentProvider,
} from "../types";

/**
 * Asaas — cobranças individuais via API REST.
 * Requer `api_key` em config. Usa o link de fatura como checkoutUrl.
 */
export const asaasProvider: PaymentProvider = {
  id: "asaas",
  supports: ["pix", "credit_card", "boleto"],
  async createPayment(
    input: CreatePaymentInput,
    gateway: PaymentGatewayConfig,
  ): Promise<CreatePaymentResult> {
    const cfg = gateway.config as { api_key?: string; base_url?: string };
    if (!cfg.api_key) throw new Error("Asaas: api_key ausente em config.");
    const baseUrl =
      cfg.base_url ??
      (gateway.is_test ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/api/v3");

    const billingTypeMap: Record<string, string> = {
      pix: "PIX",
      credit_card: "CREDIT_CARD",
      boleto: "BOLETO",
    };

    // 1) garantir cliente
    const customerRes = await fetch(`${baseUrl}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: cfg.api_key },
      body: JSON.stringify({
        name: input.customerName,
        email: input.customerEmail,
        cpfCnpj: input.customerDocument ?? undefined,
        mobilePhone: input.customerPhone ?? undefined,
        externalReference: input.orderId,
      }),
    });
    const customer = (await customerRes.json()) as { id?: string; errors?: unknown };
    if (!customerRes.ok || !customer.id) {
      throw new Error(`Asaas (customer) [${customerRes.status}]: ${JSON.stringify(customer)}`);
    }

    // 2) criar cobrança
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const payRes = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: cfg.api_key },
      body: JSON.stringify({
        customer: customer.id,
        billingType: billingTypeMap[input.paymentMethod],
        value: Number((input.amountCents / 100).toFixed(2)),
        dueDate,
        description: input.description,
        externalReference: input.orderId,
        installmentCount:
          input.paymentMethod === "credit_card" && input.installments > 1
            ? input.installments
            : undefined,
        installmentValue:
          input.paymentMethod === "credit_card" && input.installments > 1
            ? Number((input.amountCents / input.installments / 100).toFixed(2))
            : undefined,
        callback: { successUrl: input.successUrl, autoRedirect: true },
      }),
    });
    const payment = (await payRes.json()) as {
      id?: string;
      invoiceUrl?: string;
      errors?: unknown;
    };
    if (!payRes.ok || !payment.invoiceUrl || !payment.id) {
      throw new Error(`Asaas (payment) [${payRes.status}]: ${JSON.stringify(payment)}`);
    }

    return {
      checkoutUrl: payment.invoiceUrl,
      externalId: payment.id,
      rawResponse: payment,
    };
  },
};