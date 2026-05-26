/**
 * PaymentService — registro central de gateways.
 * Recebe um gateway (do banco) e delega para o provider concreto correspondente.
 * Server-only: arquivo .server protegido do bundle do cliente.
 */
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentGatewayConfig,
  PaymentProvider,
  PaymentProviderId,
} from "./types";
import { mercadoPagoProvider } from "./providers/mercadopago.server";
import { stripeProvider } from "./providers/stripe.server";
import { asaasProvider } from "./providers/asaas.server";
import { genericRestProvider } from "./providers/generic-rest.server";

const REGISTRY: Record<PaymentProviderId, PaymentProvider> = {
  mercadopago: mercadoPagoProvider,
  stripe: stripeProvider,
  asaas: asaasProvider,
  generic_rest: genericRestProvider,
};

export class PaymentService {
  static getProvider(providerType: string): PaymentProvider {
    const p = REGISTRY[providerType as PaymentProviderId];
    if (!p) throw new Error(`Provider de pagamento não suportado: ${providerType}`);
    return p;
  }

  static async createPayment(
    gateway: PaymentGatewayConfig,
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    const provider = this.getProvider(gateway.provider_type);
    if (!provider.supports.includes(input.paymentMethod)) {
      throw new Error(
        `Gateway ${gateway.provider_type} não suporta o método ${input.paymentMethod}.`,
      );
    }
    return provider.createPayment(input, gateway);
  }
}