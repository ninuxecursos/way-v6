/**
 * Server functions para diagnóstico de gateways de pagamento.
 * Todas exigem usuário staff (super_admin/admin/financeiro).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase as publicSupabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { withErrorLogging } from "./server-fn-error";
import { AppError } from "./errors";

async function assertStaff(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Sessão expirada.");
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (data ?? []).map((r: any) => r.role);
  if (!roles.some((r: string) => ["super_admin", "admin", "financeiro"].includes(r))) {
    throw new AppError("FORBIDDEN", "Acesso restrito.");
  }
  return user.id;
}

async function loadGateway(supabase: any, id: string) {
  const { data, error } = await supabase
    .from("payment_gateways")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Falha ao carregar gateway.", { cause: error });
  if (!data) throw new AppError("NOT_FOUND", "Gateway não encontrado.");
  return data as any;
}

/** Teste 1 — credenciais do gateway. */
export const testGatewayConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { gatewayId: string }) => z.object({ gatewayId: z.string().uuid() }).parse(i))
  .handler(withErrorLogging("gateway.testConnection", async ({ data, context }) => {
    await assertStaff(context.supabase);
    const gateway = await loadGateway(context.supabase, data.gatewayId);
    const started = Date.now();

    if (gateway.provider_type === "mercadopago") {
      const token = gateway.config?.access_token;
      if (!token) {
        return { ok: false, latencyMs: 0, error: "Access token ausente no gateway." };
      }
      try {
        const res = await fetch("https://api.mercadopago.com/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json: any = await res.json().catch(() => ({}));
        const latencyMs = Date.now() - started;
        if (!res.ok) {
          return {
            ok: false,
            latencyMs,
            status: res.status,
            error: json?.message ?? `HTTP ${res.status}`,
            details: json,
          };
        }
        const tokenLooksLive = String(token).startsWith("APP_USR-");
        const tokenLooksTest = String(token).startsWith("TEST-");
        return {
          ok: true,
          latencyMs,
          status: res.status,
          accountId: json?.id ?? null,
          email: json?.email ?? null,
          nickname: json?.nickname ?? null,
          siteId: json?.site_id ?? null,
          countryId: json?.country_id ?? null,
          tokenKind: tokenLooksTest ? "test" : tokenLooksLive ? "live" : "unknown",
          gatewayMode: gateway.is_test ? "test" : "live",
          mismatch:
            (gateway.is_test && tokenLooksLive) || (!gateway.is_test && tokenLooksTest),
        };
      } catch (e: any) {
        return { ok: false, latencyMs: Date.now() - started, error: String(e?.message ?? e) };
      }
    }

    if (gateway.provider_type === "generic_rest") {
      const endpoint = gateway.config?.create_endpoint;
      if (!endpoint) return { ok: false, latencyMs: 0, error: "create_endpoint ausente." };
      try {
        const res = await fetch(endpoint, { method: "OPTIONS" });
        return { ok: res.ok || res.status === 405, latencyMs: Date.now() - started, status: res.status };
      } catch (e: any) {
        return { ok: false, latencyMs: Date.now() - started, error: String(e?.message ?? e) };
      }
    }

    return { ok: false, error: `Teste não implementado para ${gateway.provider_type}.` };
  }));

/** Teste 2 — endpoint público de webhook. */
export const testWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { gatewayId: string; origin: string }) =>
    z.object({ gatewayId: z.string().uuid(), origin: z.string().url() }).parse(i))
  .handler(withErrorLogging("gateway.testWebhook", async ({ data, context }) => {
    await assertStaff(context.supabase);
    const gateway = await loadGateway(context.supabase, data.gatewayId);
    // Prioriza a URL pública configurada no admin do gateway.
    // Sem isso, valida o webhook usando a origem atual (preview/local),
    // mas é a URL pública que precisa ser colada no Mercado Pago.
    const publicSite = String((gateway.config as any)?.public_site_url ?? "").trim().replace(/\/$/, "");
    const baseUrl = publicSite || data.origin.replace(/\/$/, "");
    const url = `${baseUrl}/api/public/webhooks/${gateway.provider_type}?gateway=${gateway.id}`;
    const usingPublicUrl = !!publicSite;
    const started = Date.now();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ping: true, ts: Date.now() }),
        redirect: "manual",
      });
      const text = await res.text().catch(() => "");
      const latencyMs = Date.now() - started;
      // 401 (sem assinatura) é o resultado ESPERADO e prova que o endpoint
      // está rodando e validando assinatura. 200 também aceito.
      const ok = res.status === 401 || res.status === 200;
      let hint: string;
      if (ok) {
        hint = usingPublicUrl
          ? "Endpoint ativo no seu domínio público. Cole esta URL no painel do Mercado Pago."
          : "Endpoint ativo nesta origem (preview/local). Defina a URL pública no admin para validar o domínio que será usado no Mercado Pago.";
      } else if (res.status === 302 || res.status === 301 || res.status === 307 || res.status === 308) {
        hint = "Redirecionamento detectado — esta URL não responde diretamente o webhook. Verifique se o domínio público está apontado para a aplicação publicada, sem redirect intermediário.";
      } else if (res.status === 404) {
        hint = "Rota não encontrada — o domínio público não está servindo a aplicação publicada. Confirme o deploy e o DNS.";
      } else if (res.status === 500) {
        hint = "Erro 500 no servidor — variáveis de ambiente (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/SITE_URL) provavelmente ausentes no host de produção.";
      } else if (res.status === 405) {
        hint = "Método não permitido — verifique se a rota /api/public/webhooks/mercadopago está publicada.";
      } else {
        hint = `Endpoint retornou ${res.status}. Verifique se a aplicação está publicada e se a URL pública aponta para o deploy correto.`;
      }
      return {
        ok,
        latencyMs,
        status: res.status,
        url,
        usingPublicUrl,
        body: text.slice(0, 500),
        hint,
      };
    } catch (e: any) {
      return { ok: false, latencyMs: Date.now() - started, error: String(e?.message ?? e), url, usingPublicUrl };
    }
  }));

/** Teste 3 — cria uma preferência mínima no Mercado Pago. */
export const testCheckoutPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { gatewayId: string; amountCents?: number; paymentMethod?: "pix" | "credit_card" }) =>
    z.object({
      gatewayId: z.string().uuid(),
      amountCents: z.number().int().min(100).max(1000000).default(100),
      paymentMethod: z.enum(["pix", "credit_card"]).default("pix"),
    }).parse(i))
  .handler(withErrorLogging("gateway.testCheckout", async ({ data, context }) => {
    await assertStaff(context.supabase);
    const gateway = await loadGateway(context.supabase, data.gatewayId);
    if (gateway.provider_type !== "mercadopago") {
      return { ok: false, error: "Apenas Mercado Pago suporta teste de preference no momento." };
    }
    const token = gateway.config?.access_token;
    if (!token) return { ok: false, error: "Access token ausente." };

    const started = Date.now();
    const body = {
      items: [{
        id: "test",
        title: `[TESTE] Diagnóstico ${new Date().toISOString()}`,
        quantity: 1,
        currency_id: "BRL",
        unit_price: data.amountCents / 100,
      }],
      payment_methods: data.paymentMethod === "pix"
        ? { excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }] }
        : { excluded_payment_types: [{ id: "bank_transfer" }, { id: "ticket" }] },
    };
    try {
      const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json: any = await res.json().catch(() => ({}));
      const latencyMs = Date.now() - started;
      if (!res.ok) {
        return { ok: false, latencyMs, status: res.status, error: json?.message ?? `HTTP ${res.status}`, details: json };
      }
      const checkoutUrl = gateway.is_test ? json.sandbox_init_point : json.init_point;
      return {
        ok: true,
        latencyMs,
        preferenceId: json.id,
        checkoutUrl,
        sandboxUrl: json.sandbox_init_point,
        productionUrl: json.init_point,
      };
    } catch (e: any) {
      return { ok: false, latencyMs: Date.now() - started, error: String(e?.message ?? e) };
    }
  }));

/** Lê os métodos de pagamento habilitados em todos os gateways ativos
 *  para uso pelo checkout público (sem auth). */
export const getActiveGatewayMethods = createServerFn({ method: "GET" })
  .handler(withErrorLogging("gateway.activeMethods", async () => {
    const { data, error } = await publicSupabase
      .from("payment_gateways")
      .select("id, provider_type, config, is_test")
      .eq("active", true)
      .order("priority", { ascending: true })
      .limit(1);
    if (error) return { gatewayId: null, methods: ["pix", "credit_card"], installments: { enabled: true, max: 10 } };
    const gw: any = data?.[0];
    if (!gw) return { gatewayId: null, methods: ["pix", "credit_card"], installments: { enabled: true, max: 10 } };
    const cfg: any = gw.config ?? {};
    const methods: ("pix" | "credit_card" | "boleto")[] =
      Array.isArray(cfg.enabled_methods) && cfg.enabled_methods.length > 0
        ? cfg.enabled_methods
        : ["pix", "credit_card"];
    return {
      gatewayId: gw.id,
      providerType: gw.provider_type,
      isTest: !!gw.is_test,
      methods,
      installments: {
        enabled: cfg.credit_card_installments_enabled !== false && methods.includes("credit_card"),
        max: Number(cfg.installments_max ?? 10),
        freeUpTo: Number(cfg.installments_free_up_to ?? 1),
        interestPct: Number(cfg.installments_interest_pct ?? 3),
      },
      pixFeePct: Number(cfg.pix_fee_pct ?? cfg.pix_discount_pct ?? 0),
    };
  }));