import type { ReactNode } from "react";

/**
 * Cabeçalho padronizado das páginas do admin.
 * Use sempre no topo de uma rota: título + descrição + ações alinhadas à direita.
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 mb-5 sm:pb-5 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && (
        <div className="-mx-1 flex flex-wrap items-center gap-2 overflow-x-auto sm:mx-0 sm:overflow-visible">
          {actions}
        </div>
      )}
    </div>
  );
}