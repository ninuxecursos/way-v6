/**
 * Contexto do "modo edição" do CMS visual.
 * Quando ativo, componentes envolvidos por EditableText/EditableImage
 * ficam clicáveis e disparam onPatch(sectionId, path, value) em cada commit.
 * Em modo desligado o contexto é null e os helpers são transparentes.
 */
import { createContext, useContext, type ReactNode } from "react";

export interface EditContextValue {
  /** ID da seção que está sendo editada (passada para os helpers via prop). */
  sectionId: string;
  /** Idioma do conteúdo sendo editado (apenas informativo na v1). */
  locale: string;
  /** Commit de uma alteração de campo. `path` usa notação por pontos: "title", "images.background". */
  onPatch: (sectionId: string, path: string, value: unknown) => void;
  /** Marca seção como selecionada no rail do admin. */
  onSelect?: (sectionId: string) => void;
  selectedId?: string | null;
}

const EditCtx = createContext<EditContextValue | null>(null);

export function EditProvider({ value, children }: { value: EditContextValue | null; children: ReactNode }) {
  return <EditCtx.Provider value={value}>{children}</EditCtx.Provider>;
}

export function useEditContext(): EditContextValue | null {
  return useContext(EditCtx);
}

/** Atalho: aplica `path` a um objeto e devolve uma cópia com o novo valor. */
export function setByPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const parts = path.split(".");
  const next: Record<string, unknown> = { ...obj };
  let cursor: Record<string, unknown> = next;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const existing = cursor[k];
    cursor[k] = { ...((existing as Record<string, unknown> | undefined) ?? {}) };
    cursor = cursor[k] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
  return next as T;
}