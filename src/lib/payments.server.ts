// Server-only payment dispatcher. Resolves a gateway and creates a checkout
// session against Mercado Pago or any configured generic REST gateway.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CheckoutResult = {
  checkoutUrl: string;
  externalId: string | null;
  rawResponse: unknown;
};

export type CheckoutInput = {
  orderId: string;
  amountCents: number;
  currency: string;
  description: string;
  customerEmail: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl: string;
};

export async function pickActiveGateway(preferredId?: string) {
  let q = supabaseAdmin.from("payment_gateways").select("*").eq("active", true);
  if (preferredId) q = q.eq("id", preferredId);
  const { data, error } = await q.order("priority", { ascending: true }).limit(1);
  if (error) throw new Error(`Falha ao listar gateways: ${error.message}`);
  if (!data || data.length === 0) throw new Error("Nenhum gateway de pagamento ativo configurado.");
  return data[0];
}

export async function createCheckoutOnGateway(
  gateway: any,
  input: CheckoutInput,
): Promise<CheckoutResult> {
  if (gateway.provider_type === "mercadopago") {
    return createMercadoPagoCheckout(gateway, input);
  }
  if (gateway.provider_type === "generic_rest") {
    return createGenericRestCheckout(gateway, input);
  }
  throw new Error(`Provider não suportado: ${gateway.provider_type}`);
}

async function createMercadoPagoCheckout(gateway: any, input: CheckoutInput): Promise<CheckoutResult> {
  const token: string | undefined = gateway.config?.access_token;
  if (!token) throw new Error("Mercado Pago: access_token ausente em config.");

  const body = {
    items: [
      {
        id: input.orderId,
        title: input.description,
        quantity: 1,
        currency_id: input.currency,
        unit_price: input.amountCents / 100,
      },
    ],
    payer: { email: input.customerEmail },
    external_reference: input.orderId,
    back_urls: {
      success: input.successUrl,
      failure: input.failureUrl,
      pending: input.pendingUrl,
    },
    auto_return: "approved",
    notification_url: input.notificationUrl,
  };

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Mercado Pago erro [${res.status}]: ${JSON.stringify(json)}`);

  const checkoutUrl = gateway.is_test ? json.sandbox_init_point : json.init_point;
  return { checkoutUrl, externalId: json.id ?? null, rawResponse: json };
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => String(vars[k] ?? ""));
}
function getByPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

async function createGenericRestCheckout(gateway: any, input: CheckoutInput): Promise<CheckoutResult> {
  const cfg = gateway.config ?? {};
  if (!cfg.create_endpoint) throw new Error("Generic REST: create_endpoint ausente.");

  const vars = {
    order_id: input.orderId,
    amount_cents: input.amountCents,
    amount: (input.amountCents / 100).toFixed(2),
    currency: input.currency,
    description: input.description,
    email: input.customerEmail,
    success_url: input.successUrl,
    failure_url: input.failureUrl,
    notification_url: input.notificationUrl,
  };
  const payloadStr = interpolate(JSON.stringify(cfg.payload_template ?? {}), vars);
  const payload = JSON.parse(payloadStr);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.auth_header_name && cfg.auth_token) {
    headers[cfg.auth_header_name] = cfg.auth_token;
  }

  const res = await fetch(cfg.create_endpoint, {
    method: cfg.create_method ?? "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gateway erro [${res.status}]: ${JSON.stringify(json)}`);

  const checkoutUrl = getByPath(json, cfg.checkout_url_path ?? "checkout_url");
  const externalId = getByPath(json, cfg.external_id_path ?? "id");
  if (!checkoutUrl) throw new Error(`Resposta sem checkout_url no path ${cfg.checkout_url_path ?? "checkout_url"}`);

  return { checkoutUrl, externalId: externalId ?? null, rawResponse: json };
}