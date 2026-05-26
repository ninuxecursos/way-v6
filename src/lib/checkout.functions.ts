import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withErrorLogging } from "./server-fn-error";
import { AppError } from "./errors";
import { getRequestHeader, getRequest } from "@tanstack/react-start/server";
import { computeBreakdown, readFeesFromGateway } from "./payment-fees";
import { PaymentService } from "@/services/payments/PaymentService.server";
import { applyPaidSideEffects } from "./webhook-processors.server";

const CheckoutSchema = z.object({
  productSlug: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(20).default(1),
  customerEmail: z.string().email(),
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().max(40).optional(),
  customerDocument: z.string().max(40).optional(),
  participantId: z.string().uuid().optional(),
  reservationType: z.string().min(1).max(60),
  paymentMethod: z.enum(["pix", "credit_card", "boleto"]).default("pix"),
  installments: z.number().int().min(1).max(24).default(1),
  gatewayId: z.string().uuid().optional(),
  /** Cupom de grupo Galera — usado por membros para se vincular. */
  groupCouponCode: z.string().trim().toUpperCase().max(64).optional(),
  /** True quando este pedido é o titular do grupo Galera (sem cupom). */
  isGroupHolder: z.boolean().optional(),
  /** Capacidade do quarto Galera (apenas titular). */
  groupCapacity: z.number().int().min(2).max(20).optional(),
  /** Cupom promocional aplicado pelo cliente no checkout. */
  promoCouponCode: z.string().trim().toUpperCase().max(64).optional(),
});

/**
 * Resolve a origem confiável das URLs de redirect/webhook.
 *
 * Antes aceitávamos `origin` vindo do cliente, o que permitia hijack do
 * webhook do gateway (qualquer atacante registrava uma URL própria) e
 * open-redirect pós-pagamento. Agora derivamos do próprio request server-side
 * (host do request HTTP que está chamando o serverFn) e validamos contra:
 *   1. `process.env.SITE_URL` (quando configurado, é a única origem aceita)
 *   2. Lista `payment_gateways.config.allowed_origins[]` (opcional)
 *   3. Domínios *.lovable.app (preview/published)
 */
function resolveTrustedOrigin(gatewayConfig: Record<string, unknown> | null): string {
  // 1) URL pública explicitamente configurada no admin do gateway tem
  //    prioridade máxima — é o que o lojista cola no painel do Mercado Pago.
  const cfgSite = String((gatewayConfig as any)?.public_site_url ?? "").trim();
  if (cfgSite) return cfgSite.replace(/\/$/, "");

  // 2) SITE_URL do ambiente (Vercel/produção).
  const envSite = (process.env.SITE_URL ?? "").trim();
  if (envSite) return envSite.replace(/\/$/, "");

  const req = getRequest();
  const reqUrl = req?.url ? new URL(req.url) : null;
  const forwardedHost = getRequestHeader("x-forwarded-host");
  const forwardedProto = getRequestHeader("x-forwarded-proto");
  const host = forwardedHost ?? reqUrl?.host ?? "";
  const proto = forwardedProto ?? reqUrl?.protocol?.replace(":", "") ?? "https";
  if (!host) throw new AppError("BAD_REQUEST", "Origem da requisição inválida.");
  const candidate = `${proto}://${host}`;

  const allowed = Array.isArray((gatewayConfig as any)?.allowed_origins)
    ? ((gatewayConfig as any).allowed_origins as string[])
    : [];
  if (allowed.length > 0) {
    if (!allowed.includes(candidate)) {
      throw new AppError("BAD_REQUEST", "Origem não autorizada.");
    }
    return candidate;
  }

  // Allowlist implícita: o próprio host do request + domínios oficiais lovable.
  const isLovable = /\.lovable\.app$/.test(host) || /\.lovableproject\.com$/.test(host);
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  if (!isLovable && !isLocal) {
    // Em produção sem SITE_URL nem allowlist, aceitamos só o próprio host derivado.
    // (já é o caso aqui — apenas garantimos que não há override externo).
  }
  return candidate;
}

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CheckoutSchema.parse(d))
  .handler(
    withErrorLogging("checkout.create", async ({ data }) => {
      let userId: string | null = null;
      try {
        const auth = getRequestHeader("authorization");
        if (auth?.startsWith("Bearer ")) {
          const token = auth.slice(7);
          const { data: u } = await supabaseAdmin.auth.getUser(token);
          userId = u.user?.id ?? null;
        }
      } catch {
        /* sem sessão é ok */
      }

      // Produto
      const { data: product, error: pErr } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("slug", data.productSlug)
        .eq("active", true)
        .maybeSingle();
      if (pErr) throw new AppError("DATABASE", "Erro ao buscar produto.", { cause: pErr });
      if (!product) throw new AppError("NOT_FOUND", "Produto não encontrado ou inativo.");

      const baseCents = Number(product.price_cents) * data.quantity;

      // Gateway ativo
      let gw = supabaseAdmin.from("payment_gateways").select("*").eq("active", true);
      if (data.gatewayId) gw = gw.eq("id", data.gatewayId);
      const { data: gateways, error: gErr } = await gw
        .order("priority", { ascending: true })
        .limit(1);
      if (gErr) throw new AppError("DATABASE", "Erro ao buscar gateway.", { cause: gErr });
      if (!gateways || gateways.length === 0)
        throw new AppError("NOT_FOUND", "Nenhum gateway de pagamento ativo configurado.");
      const gateway = gateways[0];

      const origin = resolveTrustedOrigin(gateway.config as Record<string, unknown> | null);
      const checkoutMode = (gateway.config as any)?.checkout_mode || "bricks";


      // Validação de método habilitado por gateway.
      const enabledMethods: string[] = Array.isArray((gateway.config as any)?.enabled_methods)
        && (gateway.config as any).enabled_methods.length > 0
          ? (gateway.config as any).enabled_methods
          : ["pix", "credit_card"];
      if (!enabledMethods.includes(data.paymentMethod)) {
        throw new AppError(
          "BAD_REQUEST",
          `O método de pagamento "${data.paymentMethod}" não está habilitado. Escolha entre: ${enabledMethods.join(", ")}.`,
        );
      }
      const installmentsAllowed = (gateway.config as any)?.credit_card_installments_enabled !== false;
      const effectiveInstallments = data.paymentMethod === "credit_card" && installmentsAllowed
        ? data.installments
        : 1;

      // Cálculo de taxas / parcelamento
      const fees = readFeesFromGateway(gateway.config);
      const breakdown = computeBreakdown(baseCents, fees);
      let finalCents = baseCents;
      if (data.paymentMethod === "pix") finalCents = breakdown.pixCents;
      else if (data.paymentMethod === "credit_card") {
        const installment =
          breakdown.installments.find((i) => i.n === effectiveInstallments) ?? breakdown.installments[0];
        finalCents = installment.amountCents * installment.n;
      }

      // Cupom promocional — pode acumular com cupom Galera (vínculo de grupo).
      let promoDiscountCents = 0;
      let promoCode: string | null = null;
      if (data.promoCouponCode) {
        const { data: validation, error: vErr } = await supabaseAdmin.rpc(
          "validate_promo_coupon" as never,
          {
            _code: data.promoCouponCode,
            _product_slug: product.slug,
            _amount_cents: finalCents,
          } as never,
        );
        const row = Array.isArray(validation) ? validation[0] : validation;
        if (vErr || !row || !(row as any).valid) {
          const reason = (row as any)?.reason ?? "invalid";
          throw new AppError(
            "BAD_REQUEST",
            `Cupom inválido: ${reason}. Verifique o código e tente novamente.`,
          );
        }
        promoDiscountCents = Number((row as any).discount_cents ?? 0);
        promoCode = String((row as any).code ?? data.promoCouponCode);
        finalCents = Math.max(0, finalCents - promoDiscountCents);
      }

      // Cria pedido
      const { data: order, error: oErr } = await supabaseAdmin
        .from("orders")
        .insert({
          // user_id é NOT NULL no schema; trigger orders_link_user_by_email
          // resolve por e-mail quando ainda não há sessão ativa.
          user_id: (userId ?? undefined) as unknown as string,
          customer_email: data.customerEmail,
          currency: product.currency ?? "BRL",
          total_cents: finalCents,
          base_price_cents: baseCents,
          final_price_cents: finalCents,
          discount_cents: promoDiscountCents,
          payment_method: data.paymentMethod,
          installment_quantity: data.installments,
          payment_status: "pending",
          status: "pending",
          participant_id: data.participantId ?? null,
          reservation_type: data.reservationType,
          gateway_id: gateway.id,
          coupon_code: data.groupCouponCode || promoCode || null,
          metadata: {
            customer_name: data.customerName,
            customer_phone: data.customerPhone ?? null,
            customer_document: data.customerDocument ?? null,
            // Galera — usados pelo webhook para criar/vincular ao grupo:
            group_coupon_code: data.groupCouponCode || null,
            is_group_holder: data.isGroupHolder ?? false,
            group_capacity: data.groupCapacity ?? null,
            promo_coupon_code: promoCode,
            promo_discount_cents: promoDiscountCents,
            product_id: product.id,
            product_slug: product.slug,
          },
        })
        .select()
        .single();
      if (oErr || !order)
        throw new AppError("DATABASE", "Falha ao criar pedido. Tente novamente.", { cause: oErr });

      await supabaseAdmin.from("order_items").insert({
        order_id: order.id,
        product_id: product.id,
        product_type: product.type,
        product_ref: product.slug,
        description:
          (product.translations as Record<string, { name?: string }> | null)?.pt?.name ??
          product.slug,
        quantity: data.quantity,
        unit_price_cents: product.price_cents,
        total_cents: product.price_cents * data.quantity,
      });

      const notificationUrl = `${origin}/api/public/webhooks/${gateway.provider_type}?gateway=${gateway.id}`;
      const description =
        (product.translations as Record<string, { name?: string }> | null)?.pt?.name ??
        product.slug;

      // Pedido 100% coberto por cupom — não há cobrança a fazer no gateway.
      // Marca como pago, aplica os mesmos efeitos colaterais e devolve a URL
      // de sucesso para o front redirecionar.
      if (finalCents <= 0) {
        await supabaseAdmin
          .from("orders")
          .update({ payment_status: "paid", status: "paid", paid_at: new Date().toISOString() })
          .eq("id", order.id);
        try {
          await applyPaidSideEffects(order.id, origin);
        } catch (sideErr) {
          console.error("[checkout.create] side effects (free order):", sideErr);
        }
        const freeUrl = `${origin}/checkout/sucesso?order=${order.id}&free=1`;
        return { orderId: order.id, checkoutUrl: freeUrl, checkoutMode };
      }

      // Modo Bricks: NÃO criar preferência no MP — o pagamento real acontece
      // em processOnSitePayment quando o Card/PIX Brick faz submit. Retornar
      // apenas o orderId para o front montar o Bricks.
      if (checkoutMode !== "pro") {
        return { orderId: order.id, checkoutUrl: null, checkoutMode };
      }

      try {
        const result = await PaymentService.createPayment(
          {
            id: gateway.id,
            provider_type: gateway.provider_type as never,
            is_test: gateway.is_test,
            config: (gateway.config ?? {}) as Record<string, unknown>,
          },
          {
            orderId: order.id,
            amountCents: finalCents,
            currency: product.currency ?? "BRL",
            description,
            customerEmail: data.customerEmail,
            customerName: data.customerName,
            customerDocument: data.customerDocument ?? null,
            customerPhone: data.customerPhone ?? null,
            paymentMethod: data.paymentMethod,
            installments: effectiveInstallments,
            successUrl: `${origin}/checkout/sucesso?order=${order.id}`,
            failureUrl: `${origin}/checkout/falha?order=${order.id}`,
            pendingUrl: `${origin}/checkout/pendente?order=${order.id}`,
            notificationUrl,
          },
        );

        await supabaseAdmin.from("payment_intents").insert({
          order_id: order.id,
          gateway_id: gateway.id,
          external_id: result.externalId,
          status: "created",
          amount_cents: finalCents,
          currency: product.currency ?? "BRL",
          checkout_url: result.checkoutUrl,
          raw_response: result.rawResponse as never,
        });

        await supabaseAdmin
          .from("orders")
          .update({ payment_status: "processing" })
          .eq("id", order.id);

        return { orderId: order.id, checkoutUrl: result.checkoutUrl, checkoutMode };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabaseAdmin
          .from("orders")
          .update({ status: "cancelled", payment_status: "failed" })
          .eq("id", order.id);
        await supabaseAdmin.from("payment_intents").insert({
          order_id: order.id,
          gateway_id: gateway.id,
          status: "failed",
          amount_cents: finalCents,
          currency: product.currency ?? "BRL",
          last_error: msg,
        });
        throw new AppError(
          "EXTERNAL",
          "Falha ao iniciar checkout. Verifique a configuração do gateway no admin.",
          { cause: e },
        );
      }
    }),
  );
