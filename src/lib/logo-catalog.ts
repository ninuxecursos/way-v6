/**
 * Catálogo central de logotipos oficiais Way Home.
 * Define variantes (arquivos SVG) e slots (onde cada variante pode ser usada).
 */

export type LogoVariantId =
  | "symbol-white"
  | "symbol-black"
  | "slogan-white"
  | "slogan-black"
  | "type-white"
  | "type-black";

export type LogoSlotId =
  | "headerLight"
  | "headerDark"
  | "mobileHeader"
  | "footer"
  | "hero"
  | "loading"
  | "loadingLight"
  | "auth"
  | "admin"
  | "receipt"
  | "email"
  | "favicon"
  | "ogImage";

export interface LogoVariant {
  id: LogoVariantId;
  label: string;
  /** URL pública (servida via /logos/...). Funciona para SSR, e-mail e recibo. */
  publicUrl: string;
  /** Sugestão de fundo onde fica melhor. */
  recommendedOn: "light" | "dark" | "any";
}

export const LOGO_VARIANTS: LogoVariant[] = [
  { id: "symbol-white", label: "Símbolo + nome (branco)", publicUrl: "/logos/wayhome-symbol-white.svg", recommendedOn: "dark" },
  { id: "symbol-black", label: "Símbolo + nome (preto)", publicUrl: "/logos/wayhome-symbol-black.svg", recommendedOn: "light" },
  { id: "slogan-white", label: "Símbolo + nome + slogan (branco)", publicUrl: "/logos/wayhome-slogan-white.svg", recommendedOn: "dark" },
  { id: "slogan-black", label: "Símbolo + nome + slogan (preto)", publicUrl: "/logos/wayhome-slogan-black.svg", recommendedOn: "light" },
  { id: "type-white", label: "Apenas nome (branco)", publicUrl: "/logos/wayhome-type-white.svg", recommendedOn: "dark" },
  { id: "type-black", label: "Apenas nome (preto)", publicUrl: "/logos/wayhome-type-black.svg", recommendedOn: "light" },
];

export interface LogoSlot {
  id: LogoSlotId;
  label: string;
  description: string;
  defaultVariant: LogoVariantId;
  /** Fundo típico — usado para validação e preview. */
  background: "light" | "dark" | "either";
}

export const LOGO_SLOTS: LogoSlot[] = [
  { id: "headerDark", label: "Header (após scroll / fundo escuro)", description: "Aparece no topo do site quando o fundo está escuro.", defaultVariant: "type-white", background: "dark" },
  { id: "headerLight", label: "Header (topo da home / fundo claro)", description: "Aparece no topo do site sobre o hero claro.", defaultVariant: "type-black", background: "light" },
  { id: "mobileHeader", label: "Header mobile (área de conta)", description: "Topo da área logada no mobile.", defaultVariant: "symbol-white", background: "dark" },
  { id: "footer", label: "Rodapé", description: "Logo do rodapé do site público.", defaultVariant: "slogan-white", background: "dark" },
  { id: "hero", label: "Hero / banner principal", description: "Marca exibida acima do título no hero da home.", defaultVariant: "symbol-black", background: "light" },
  { id: "loading", label: "Tela de carregamento (tema escuro)", description: "Logo do overlay de transição quando o site está em tema escuro.", defaultVariant: "symbol-white", background: "dark" },
  { id: "loadingLight", label: "Tela de carregamento (tema claro)", description: "Logo do overlay de transição quando o site está em tema claro.", defaultVariant: "symbol-black", background: "light" },
  { id: "auth", label: "Telas de login / cadastro / recuperação", description: "Lado esquerdo (escuro) das telas de autenticação.", defaultVariant: "slogan-white", background: "dark" },
  { id: "admin", label: "Painel admin (sidebar)", description: "Topo do menu lateral do admin.", defaultVariant: "type-white", background: "dark" },
  { id: "receipt", label: "Recibo (PDF)", description: "Cabeçalho do recibo gerado.", defaultVariant: "slogan-black", background: "light" },
  { id: "email", label: "E-mails transacionais", description: "Cabeçalho dos e-mails enviados.", defaultVariant: "slogan-black", background: "light" },
  { id: "favicon", label: "Favicon", description: "Ícone na aba do navegador.", defaultVariant: "symbol-black", background: "light" },
  { id: "ogImage", label: "Imagem de compartilhamento (OG)", description: "Preview ao compartilhar links.", defaultVariant: "slogan-black", background: "light" },
];

export const VARIANT_BY_ID: Record<LogoVariantId, LogoVariant> = LOGO_VARIANTS.reduce(
  (acc, v) => ({ ...acc, [v.id]: v }),
  {} as Record<LogoVariantId, LogoVariant>,
);

/** Resolve a URL final do logo de um slot, dado o estado de branding. */
export function resolveLogoUrl(
  slot: LogoSlotId,
  logos?: Partial<Record<LogoSlotId, LogoVariantId | "custom">>,
  customUrls?: Partial<Record<LogoSlotId, string>>,
): string {
  const slotDef = LOGO_SLOTS.find((s) => s.id === slot)!;
  const choice = logos?.[slot];
  if (choice === "custom") {
    const custom = customUrls?.[slot];
    if (custom && custom.trim().length > 0) return custom;
  } else if (choice && VARIANT_BY_ID[choice as LogoVariantId]) {
    return VARIANT_BY_ID[choice as LogoVariantId].publicUrl;
  }
  return VARIANT_BY_ID[slotDef.defaultVariant].publicUrl;
}