import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentGatewayConfig,
  PaymentProvider,
} from "../types";

/**
 * Mercado Pago — Checkout Pro (preference).
 * Suporta PIX, cartão e boleto via página hospedada.
 */
export const mercadoPagoProvider: PaymentProvider = {
  id: "mercadopago",
  supports: ["pix", "credit_card", "boleto"],
  async createPayment(
    input: CreatePaymentInput,
    gateway: PaymentGatewayConfig,
  ): Promise<CreatePaymentResult> {
    const cfg = (gateway.config ?? {}) as Record<string, unknown>;
    const token = (cfg as { access_token?: string }).access_token;
    if (!token) throw new Error("Mercado Pago: access_token ausente em config.");

    const enabledMethods = Array.isArray((cfg as any).enabled_methods) && (cfg as any).enabled_methods.length > 0
      ? ((cfg as any).enabled_methods as string[])
      : ["pix", "credit_card"];
    if (!enabledMethods.includes(input.paymentMethod)) {
      throw new Error(`Método "${input.paymentMethod}" não está habilitado neste gateway.`);
    }

    // MP types: pix -> bank_transfer, boleto -> ticket, credit_card -> credit_card
    const allowedTypes = new Set(
      enabledMethods.flatMap((m) =>
        m === "pix" ? ["bank_transfer"] :
        m === "boleto" ? ["ticket"] :
        m === "credit_card" ? ["credit_card", "debit_card"] : []
      )
    );
    const excluded: { id: string }[] = ["bank_transfer", "ticket", "credit_card", "debit_card"]
      .filter((t) => !allowedTypes.has(t))
      .map((id) => ({ id }));

    // Sempre usar o máximo permitido pelo gateway — o Checkout Pro decide o que mostrar
    // por método. Travar em 1 quando o usuário escolheu PIX no nosso picker faz com que
    // a página do MP minimize a opção de cartão.
    const installmentsEnabled = (cfg as any).credit_card_installments_enabled !== false;
    const maxInstallments = installmentsEnabled
      ? Math.max(1, Number((cfg as any).installments_max ?? 12))
      : 1;

    // Quebrar nome em first_name / last_name (MP exige para mostrar cartão em BRL).
    const fullName = (input.customerName ?? "").trim();
    const nameParts = fullName ? fullName.split(/\s+/) : [];
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    // CPF / telefone — quando disponíveis, mandar no payer (destrava cartão).
    const rawDoc = (input.customerDocument ?? "").replace(/\D/g, "");
    const rawPhone = (input.customerPhone ?? "").replace(/\D/g, "");
    const identification = rawDoc.length >= 11
      ? { type: "CPF", number: rawDoc.slice(0, 11) }
      : undefined;
    const phone = rawPhone.length >= 10
      ? { area_code: rawPhone.slice(0, 2), number: rawPhone.slice(2) }
      : undefined;

    const payer: Record<string, unknown> = {
      email: input.customerEmail,
      name: firstName || fullName || undefined,
    };
    if (firstName) payer.first_name = firstName;
    if (lastName) payer.last_name = lastName;
    if (identification) payer.identification = identification;
    if (phone) payer.phone = phone;

    const body: Record<string, unknown> = {
      items: [
        {
          id: input.orderId,
          title: input.description,
          quantity: 1,
          currency_id: input.currency,
          unit_price: input.amountCents / 100,
        },
      ],
      payer,
      external_reference: input.orderId,
      back_urls: {
        success: input.successUrl,
        failure: input.failureUrl,
        pending: input.pendingUrl,
      },
      auto_return: "approved",
      binary_mode: false,
      notification_url: input.notificationUrl,
      payment_methods: {
        excluded_payment_types: excluded,
        excluded_payment_methods: [],
        installments: maxInstallments,
        default_installments: 1,
      },
      statement_descriptor: (cfg as any).statement_descriptor || "WAYHOME",
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Mercado Pago [${res.status}]: ${JSON.stringify(json)}`);

    // Log de diagnóstico — confirma quais métodos o MP aceitou na preference.
    console.log("[mercadopago] preference criada", {
      id: json.id,
      excluded_payment_types: json?.payment_methods?.excluded_payment_types,
      installments: json?.payment_methods?.installments,
      payer_has_cpf: Boolean(identification),
    });

    const checkoutUrl = gateway.is_test ? json.sandbox_init_point : json.init_point;
    return { checkoutUrl, externalId: json.id ?? null, rawResponse: json };
  },
};