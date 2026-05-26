/**
 * Tipos compartilhados do CMS para páginas e seções.
 * Cada `type` de seção mapeia para um componente em src/components/wh/sections/.
 */
export type SectionType =
  | "hero"
  | "experience"
  | "experience_detail"
  | "hospedagem"
  | "camping"
  | "stories"
  | "location"
  | "feedback"
  | "cta";

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Hero (banner principal)",
  experience: "Experiência",
  experience_detail: "Página de experiência (detalhe)",
  hospedagem: "Hospedagem (Suítes)",
  camping: "Camping",
  stories: "Stories (vídeos verticais)",
  location: "Localização",
  feedback: "Depoimentos",
  cta: "Call-to-Action final",
};

export interface PageRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  updated_at: string;
}

export interface SectionRow {
  id: string;
  page_id: string;
  type: string;
  position: number;
  visible: boolean;
  visible_mobile: boolean;
  visible_desktop: boolean;
  data: Record<string, unknown>;
}