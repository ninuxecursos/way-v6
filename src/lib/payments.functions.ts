import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withErrorLogging } from "./server-fn-error";
import { AppError } from "./errors";
import { getRequestHeader, getRequest } from "@tanstack/react-start/server";
import { computeBreakdown, readFeesFromGateway } from "./payment-fees";
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
  gatewayId: z.string().uuid().optional(),
  groupCouponCode: z.string().trim().toUpperCase().max(64).optional(),
  isGroupHolder: z.boolean().optional(),
  groupCapacity: z.number().int().min(2).max(20).optional(),
  promoCouponCode: z.string().trim().toUpperCase().max(64).optional(),
});

/**
 * Cria o pedido ANTES do pagamento on-site.
 * Retorna o orderId para que o front possa chamar processOnSitePayment.
 */
export const prepareOrderForCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CheckoutSchema.parse(d))
  .handler(withErrorLogging("checkout.prepare", async ({ data }) => {
    let userId: string | null = null;
    try {
      const auth = getRequestHeader("authorization");
      if (auth?.startsWith("Bearer ")) {
        const token = auth.slice(7);
        const { data: u } = await supabaseAdmin.auth.getUser(token);
        userId = u.user?.id ?? null;
      }
    } catch { /* sem sessão ok */ }

    // 1. Buscar Produto
    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("slug", data.productSlug)
      .eq("active", true)
      .maybeSingle();
    if (pErr || !product) throw new AppError("NOT_FOUND", "Produto não encontrado.");

    const baseCents = Number(product.price_cents) * data.quantity;

    // 2. Buscar Gateway
    let gwQuery = supabaseAdmin.from("payment_gateways").select("*").eq("active", true);
    if (data.gatewayId) gwQuery = gwQuery.eq("id", data.gatewayId);
    const { data: gateways, error: gErr } = await gwQuery.order("priority", { ascending: true }).limit(1);
    if (gErr || !gateways || gateways.length === 0) throw new AppError("NOT_FOUND", "Nenhum gateway ativo.");
    const gateway = gateways[0];

    // 3. Calcular valores
    const fees = readFeesFromGateway(gateway.config);
    const breakdown = computeBreakdown(baseCents, fees);
    
    // NOTA: Para Bricks, o total base é o cardCents (ou pixCents se for PIX).
    // Aqui criamos o pedido com o valor base e aplicamos descontos.
    let finalCents = baseCents; // Valor oficial (cartão 1x)
    
    let promoDiscountCents = 0;
    let promoCode: string | null = null;
    if (data.promoCouponCode) {
      const { data: validation } = await supabaseAdmin.rpc("validate_promo_coupon" as never, {
        _code: data.promoCouponCode,
        _product_slug: product.slug,
        _amount_cents: finalCents,
      } as never);
      const row = Array.isArray(validation) ? validation[0] : validation;
      if (row && (row as any).valid) {
        promoDiscountCents = Number((row as any).discount_cents ?? 0);
        promoCode = String((row as any).code ?? data.promoCouponCode);
        finalCents = Math.max(0, finalCents - promoDiscountCents);
      }
    }

    // 4. Criar Pedido
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: (userId ?? undefined) as unknown as string,
        customer_email: data.customerEmail,
        currency: product.currency ?? "BRL",
        total_cents: finalCents,
        base_price_cents: baseCents,
        final_price_cents: finalCents,
        discount_cents: promoDiscountCents,
        payment_method: "pix", // Default temporário, muda no processOnSitePayment
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

    if (oErr || !order) throw new AppError("DATABASE", "Falha ao criar pedido.");

    await supabaseAdmin.from("order_items").insert({
      order_id: order.id,
      product_id: product.id,
      product_type: product.type,
      product_ref: product.slug,
      description: (product.translations as any)?.pt?.name ?? product.slug,
      quantity: data.quantity,
      unit_price_cents: product.price_cents,
      total_cents: product.price_cents * data.quantity,
    });

    // Pedido grátis (cupom 100%): marca como pago direto.
    let freeOrder = false;
    if (finalCents <= 0) {
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "paid", status: "paid", paid_at: new Date().toISOString() })
        .eq("id", order.id);
      try {
        const req = getRequest();
        const origin = req?.url ? new URL(req.url).origin : (process.env.SITE_URL ?? "");
        await applyPaidSideEffects(order.id, origin);
      } catch (sideErr) {
        console.error("[checkout.prepare] side effects (free order):", sideErr);
      }
      freeOrder = true;
    }

    return { orderId: order.id, freeOrder };
  }));

/**
 * Retorna dados públicos do gateway ativo para inicializar o SDK do Mercado Pago no browser.
 */
export const getActiveGatewayPublicConfig = createServerFn({ method: "GET" })
  .handler(withErrorLogging("gateway.publicConfig", async () => {
    const { data, error } = await supabaseAdmin
      .from("payment_gateways")
      .select("id, provider_type, config, is_test")
      .eq("active", true)
      .order("priority", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return { gatewayId: null, publicKey: null, providerType: null, isTest: false };
    }

    const cfg = (data.config ?? {}) as Record<string, any>;
    return {
      gatewayId: data.id,
      publicKey: cfg.public_key || null,
      providerType: data.provider_type,
      isTest: !!data.is_test,
      checkoutMode: cfg.checkout_mode || "bricks",
    };
  }));

const PaymentSchema = z.object({
  orderId: z.string().uuid(),
  paymentMethod: z.enum(["pix", "credit_card", "boleto"]),
  token: z.string().optional(),
  installments: z.number().int().min(1).max(24).optional(),
  paymentMethodId: z.string().optional(),
  issuerId: z.string().optional(),
});

export const processOnSitePayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PaymentSchema.parse(d))
  .handler(withErrorLogging("payment.processOnSite", async ({ data }) => {
    // 1. Carregar pedido
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("*, gateway:payment_gateways(*)")
      .eq("id", data.orderId)
      .single();

    if (oErr || !order) throw new AppError("NOT_FOUND", "Pedido não encontrado.");
    
    // Recalcular valor final baseado no método (taxa PIX se for PIX)
    const gateway = order.gateway as any;
    const fees = readFeesFromGateway(gateway.config);
    const breakdown = computeBreakdown(Number(order.base_price_cents), fees);
    
    let totalCents = Number(order.base_price_cents);
    if (data.paymentMethod === "pix") totalCents = breakdown.pixCents;

    
    // Aplicar desconto do cupom que já estava no pedido
    const finalTotalCents = Math.max(0, totalCents - (order.discount_cents || 0));

    // Atualizar pedido com método e valor final real
    await supabaseAdmin.from("orders").update({
      payment_method: data.paymentMethod,
      installment_quantity: data.installments || 1,
      total_cents: finalTotalCents,
      final_price_cents: finalTotalCents,
    }).eq("id", order.id);

    const cfg = (gateway.config ?? {}) as Record<string, any>;
    const token = cfg.access_token;
    if (!token) throw new AppError("CONFIG", "Configuração do gateway incompleta.");

    // 2. Preparar payload para o Mercado Pago
    const payload: any = {
      transaction_amount: finalTotalCents / 100,
      description: `Pedido ${order.id.slice(0, 8)} - Way Home`,
      payment_method_id: data.paymentMethodId || (data.paymentMethod === "credit_card" ? undefined : data.paymentMethod),
      payer: {
        email: order.customer_email,
        first_name: (order.metadata as any)?.customer_name?.split(" ")[0] || "Cliente",
        last_name: (order.metadata as any)?.customer_name?.split(" ").slice(1).join(" ") || "Way Home",
      },
      external_reference: order.id,
      notification_url: `${(cfg.public_site_url || process.env.SITE_URL || "").replace(/\/$/, "")}/api/public/webhooks/mercadopago?gateway=${gateway.id}`,
    };

    if (data.paymentMethod === "credit_card") {
      if (!data.token) throw new AppError("BAD_REQUEST", "Token do cartão ausente.");
      payload.token = data.token;
      payload.installments = data.installments || 1;
      payload.issuer_id = data.issuerId;
    }

    // 3. Chamar API do Mercado Pago
    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": order.id,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("Mercado Pago API Error:", result);
      throw new AppError("EXTERNAL", result.message || "Erro no Mercado Pago.");
    }

    // 4. Registrar tentativa
    await supabaseAdmin.from("payment_intents").insert({
      order_id: order.id,
      gateway_id: gateway.id,
      external_id: String(result.id),
      status: result.status,
      amount_cents: finalTotalCents,
      currency: order.currency,
      raw_response: result as any,
    });

    if (result.status === "approved") {
      await supabaseAdmin.from("orders").update({
        payment_status: "paid",
        status: "confirmed",
        paid_at: new Date().toISOString(),
      }).eq("id", order.id);

      // fix: aplicar TODOS os efeitos colaterais (galera, alocação, cupom, recibo, e-mail)
      // também no fluxo síncrono. Antes, só o webhook fazia isso — então cartão
      // aprovado on-site (galera ou individual) ficava sem quarto/cupom até o webhook chegar.
      try {
        let origin = "";
        try {
          const req = getRequest();
          origin = new URL(req.url).origin;
        } catch { /* fallback abaixo */ }
        if (!origin) {
          origin = (cfg.public_site_url as string | undefined)?.replace(/\/$/, "")
            || process.env.SITE_URL?.replace(/\/$/, "")
            || "";
        }
        await applyPaidSideEffects(order.id, origin);
      } catch (sideErr) {
        console.error("[processOnSitePayment] side effects falharam:", sideErr);
      }
    } else if (["rejected", "cancelled"].includes(result.status)) {
      await supabaseAdmin.from("orders").update({
        payment_status: "failed",
      }).eq("id", order.id);
    } else {
      await supabaseAdmin.from("orders").update({
        payment_status: "processing",
      }).eq("id", order.id);
    }

    return {
      status: result.status,
      statusDetail: result.status_detail,
      paymentId: result.id,
      qrCode: result.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      ticketUrl: result.transaction_details?.external_resource_url,
    };
  }));

export const getPaymentStatus = createServerFn({ method: "GET" })
  .inputValidator((d: { paymentId: string }) => z.object({ paymentId: z.string() }).parse(d))
  .handler(withErrorLogging("payment.getStatus", async ({ data }) => {
    const { data: intent, error } = await supabaseAdmin
      .from("payment_intents")
      .select("*, gateway:payment_gateways(config)")
      .eq("external_id", data.paymentId)
      .maybeSingle();

    if (error || !intent) throw new AppError("NOT_FOUND", "Pagamento não encontrado.");

    const token = (intent.gateway as any)?.config?.access_token;
    if (!token) throw new AppError("CONFIG", "Token do gateway indisponível.");

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${data.paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await res.json();
    if (!res.ok) throw new Error("Falha ao consultar status.");

    return {
      status: result.status,
      statusDetail: result.status_detail,
      orderId: result.external_reference,
    };
  }));
