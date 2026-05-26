/**
 * Tipos do fluxo de reserva multi-etapas.
 */

export type ReservationStep =
  | "modality"
  | "register"
  | "terms"
  | "checkout"
  | "success";

export interface ModalityChoice {
  productSlug: string;
  productId: string;
  name: string;
  priceCents: number;
  currency: string;
  coverImageUrl: string | null;
  maxPerOrder: number | null;
  /** Logotipo/símbolo exibido no hero da página individual da modalidade. */
  heroLogoUrl?: string | null;
  /** Tamanho do logo do hero em px (largura/altura). Default 40. */
  heroLogoSize?: number | null;
  /** Tipo da modalidade — controla layout e fluxo. */
  kind: "individual" | "shared" | "couple" | "other";
  /** Modo de checkout: gateway automático ou redireciona para WhatsApp. */
  checkoutMode: "auto" | "whatsapp";
  /** Card destacado como "recomendado". */
  recommended: boolean;
  /** Descrição curta exibida no card. */
  description: string;
  /** Lista de destaques/comparativos exibidos no card. */
  highlights: string[];
  /** Etiqueta de economia (ex: "Economize R$ 200"). */
  economyLabel: string | null;
  /** Quantidade mínima sugerida no formulário (ex: galera = 2). */
  minQuantity: number;
  /** Opções de gênero quando aplicável (modalidade individual). */
  genderOptions: ("m" | "f")[];
  /** Mensagem padrão para WhatsApp (modalidade casal). */
  whatsappMessage: string | null;
  /** Texto auxiliar exibido abaixo do preço (ex: "Máximo de 8 pessoas por quarto"). */
  altPrice?: string | null;
}

export interface CompanionData {
  name: string;
  cpf: string;
  whatsapp: string;
  email: string;
  gender: "m" | "f" | "other";
  birthdate?: string;
}

export interface ParticipantData {
  name: string;
  email: string;
  whatsapp: string; // E.164 (ex: +5511999999999)
  cpf: string; // 11 dígitos
  city: string;
  gender: "m" | "f" | "other";
  reservationType: string; // slug da modalidade
  quantity: number;
  /** Id do registro persistido em `participants` (após salvar). */
  participantId?: string;
  /** Acompanhantes adicionais (quando quantity > 1). */
  companions?: CompanionData[];
  /**
   * Cupom de grupo Galera. Quando preenchido pelo membro, o checkout
   * o vincula ao mesmo quarto/grupo do titular.
   */
  groupCouponCode?: string;
  /** Quando true, este pedido é o titular do grupo Galera (gera o cupom). */
  isGroupHolder?: boolean;
  /** Capacidade do quarto Galera (apenas titular). 2..20. */
  groupCapacity?: number;
}

export interface TermsAcceptance {
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedImageRights: boolean;
  acceptedAt: string; // ISO
  termsVersion: string;
}

export interface ReservationState {
  modality?: ModalityChoice;
  participant?: ParticipantData;
  terms?: TermsAcceptance;
  gatewayId?: string;
  updatedAt: number;
}

export const RESERVATION_STEPS: { id: ReservationStep; label: string; href: string }[] = [
  { id: "modality", label: "Modalidade", href: "/reservation" },
  { id: "register", label: "Cadastro", href: "/reservation/register" },
  { id: "terms", label: "Termos", href: "/reservation/terms" },
  { id: "checkout", label: "Pagamento", href: "/reservation/checkout" },
  { id: "success", label: "Pronto", href: "/reservation/success" },
];