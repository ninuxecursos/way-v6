/**
 * Wrapper que pinta o contorno de cada seção em modo edição
 * e permite clicar para selecioná-la no rail do admin.
 */
import type { MouseEvent, ReactNode } from "react";
import { EditProvider, useEditContext } from "./EditContext";

export function SectionFrame({
  sectionId,
  label,
  children,
}: {
  sectionId: string;
  label: string;
  children: ReactNode;
}) {
  const ctx = useEditContext();
  if (!ctx) return <>{children}</>;
  const selected = ctx.selectedId === sectionId;
  // Em modo edição: impede que cliques em <a>/<button type="submit"> dentro
  // das seções disparem navegação real (que tirava o usuário do CMS).
  const handleClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a");
    if (link) { e.preventDefault(); e.stopPropagation(); }
    const submit = target.closest("button[type='submit'], input[type='submit']");
    if (submit) { e.preventDefault(); }
  };
  return (
    <div
      className="wh-section-frame"
      data-selected={selected}
      onClick={() => ctx.onSelect?.(sectionId)}
      onClickCapture={handleClickCapture}
    >
      <span className="wh-section-frame__badge">{label}</span>
      <EditProvider value={{ ...ctx, sectionId }}>{children}</EditProvider>
    </div>
  );
}