/**
 * Registry de editores visuais por tipo de seção.
 * Cada editor recebe `data` (Record) e `onChange`.
 */
import type { ReactNode } from "react";
import { HeroEditor } from "./HeroEditor";
import { ExperienceEditor } from "./ExperienceEditor";
import { ExperienceDetailEditor } from "./ExperienceDetailEditor";
import { HospedagemEditor } from "./HospedagemEditor";
import { CampingEditor } from "./CampingEditor";
import { LocationEditor } from "./LocationEditor";
import { FeedbackEditor } from "./FeedbackEditor";
import { CTAEditor } from "./CTAEditor";
import { StoriesEditor } from "./StoriesEditor";

export type SectionEditorProps = {
  data: Record<string, unknown>;
  defaults: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

type EditorFn = (props: SectionEditorProps) => ReactNode;

export const SECTION_EDITORS: Record<string, EditorFn> = {
  hero: HeroEditor,
  experience: ExperienceEditor,
  experience_detail: ExperienceDetailEditor,
  hospedagem: HospedagemEditor,
  camping: CampingEditor,
  stories: StoriesEditor,
  location: LocationEditor,
  feedback: FeedbackEditor,
  cta: CTAEditor,
};