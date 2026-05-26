/**
 * <EditableText path="title" /> — em modo de edição, vira um campo
 * contentEditable com outline ao hover; em produção é transparente.
 * `path` usa notação por pontos relativa ao `data` da seção.
 */
import { useEffect, useRef, type CSSProperties } from "react";
import { useEditContext } from "./EditContext";

interface Props {
  path: string;
  value: string;
  as?: keyof HTMLElementTagNameMap;
  className?: string;
  style?: CSSProperties;
  /** Quando true, edição vira plain-text (não permite Enter quebrar HTML). */
  singleLine?: boolean;
}

export function EditableText({ path, value, as = "span", className, style, singleLine = true }: Props) {
  const ctx = useEditContext();
  const ref = useRef<HTMLElement | null>(null);

  // Mantém o conteúdo sincronizado com `value` quando NÃO está editando.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.textContent !== value) el.textContent = value ?? "";
  }, [value]);

  const Tag = as as unknown as "span";

  if (!ctx) {
    return <Tag className={className} style={style}>{value}</Tag>;
  }

  return (
    <Tag
      ref={ref as React.RefObject<HTMLSpanElement>}
      className={(className ?? "") + " wh-editable wh-editable-text"}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onClick={(e) => { e.stopPropagation(); ctx.onSelect?.(ctx.sectionId); }}
      onKeyDown={(e) => {
        if (singleLine && e.key === "Enter") { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); }
        if (e.key === "Escape") { (e.currentTarget as HTMLElement).blur(); }
      }}
      onBlur={(e) => {
        const next = (e.currentTarget.textContent ?? "").trim();
        if (next !== value) ctx.onPatch(ctx.sectionId, path, next);
      }}
    />
  );
}