/**
 * Tipos compartilhados do módulo de pagamentos.
 * Mantém o contrato estável independentemente do gateway concreto.
 */

export type PaymentMethod = "pix" | "credit_card" | "boleto";
export type PaymentProviderId = "mercadopago" | "stripe" | "asaas" | "generic_rest";

export interface CreatePaymentInput {
  orderId: string;
  amountCents: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerName: string;
  customerDocument?: string | null;
  customerPhone?: string | null;
  paymentMethod: PaymentMethod;
  installments: number;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl: string;
}

export interface CreatePaymentResult {
  checkoutUrl: string;
  externalId: string | null;
  rawResponse: unknown;
}

/**
 * Contrato que todo gateway concreto deve implementar.
 * Adicionar novo gateway = criar adapter implementando esta interface
 * e registrá-lo no PaymentService.
 */
export interface PaymentProvider {
  id: PaymentProviderId;
  /** Métodos de pagamento suportados pelo provider. */
  supports: PaymentMethod[];
  /** Cria a sessão de pagamento e retorna a URL para o cliente. */
  createPayment(input: CreatePaymentInput, gatewayConfig: PaymentGatewayConfig): Promise<CreatePaymentResult>;
}

export interface PaymentGatewayConfig {
  id: string;
  provider_type: PaymentProviderId;
  is_test: boolean;
  config: Record<string, unknown>;
}