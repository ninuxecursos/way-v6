import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentGatewayConfig,
  PaymentProvider,
} from "../types";

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => String(vars[k] ?? ""));
}
function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[k];
    return undefined;
  }, obj);
}

/**
 * Generic REST — adapter genérico para qualquer gateway custom.
 * Permite cadastrar um endpoint, payload template (com {{vars}}) e paths
 * de leitura no admin sem mudar código.
 */
export const genericRestProvider: PaymentProvider = {
  id: "generic_rest",
  supports: ["pix", "credit_card", "boleto"],
  async createPayment(
    input: CreatePaymentInput,
    gateway: PaymentGatewayConfig,
  ): Promise<CreatePaymentResult> {
    const cfg = gateway.config as Record<string, unknown>;
    const endpoint = cfg.create_endpoint as string | undefined;
    if (!endpoint) throw new Error("Generic REST: create_endpoint ausente.");

    const vars = {
      order_id: input.orderId,
      amount_cents: input.amountCents,
      amount: (input.amountCents / 100).toFixed(2),
      currency: input.currency,
      description: input.description,
      email: input.customerEmail,
      name: input.customerName,
      phone: input.customerPhone ?? "",
      document: input.customerDocument ?? "",
      payment_method: input.paymentMethod,
      installments: input.installments,
      success_url: input.successUrl,
      failure_url: input.failureUrl,
      notification_url: input.notificationUrl,
    };
    const payloadStr = interpolate(JSON.stringify(cfg.payload_template ?? {}), vars);
    const payload = JSON.parse(payloadStr);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cfg.auth_header_name && cfg.auth_token) {
      headers[cfg.auth_header_name as string] = cfg.auth_token as string;
    }

    const res = await fetch(endpoint, {
      method: (cfg.create_method as string) ?? "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Generic REST [${res.status}]: ${JSON.stringify(json)}`);

    const checkoutUrl = getByPath(json, (cfg.checkout_url_path as string) ?? "checkout_url");
    const externalId = getByPath(json, (cfg.external_id_path as string) ?? "id");
    if (typeof checkoutUrl !== "string") {
      throw new Error("Generic REST: checkout_url ausente na resposta.");
    }
    return {
      checkoutUrl,
      externalId: typeof externalId === "string" ? externalId : null,
      rawResponse: json,
    };
  },
};