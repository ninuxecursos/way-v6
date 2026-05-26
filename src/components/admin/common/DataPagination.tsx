/**
 * Paginação profissional reutilizável para todas as listas do admin.
 * Mostra: "Mostrando X–Y de N" · seletor de tamanho de página · controles
 * com primeira/anterior/números/próxima/última.
 */
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";

export interface DataPaginationProps {
  /** 0-based page index. */
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  fetching?: boolean;
  className?: string;
}

function buildPageList(current: number, totalPages: number): (number | "…")[] {
  // current e items são 1-based aqui.
  const out: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) out.push(i);
    return out;
  }
  const left = Math.max(2, current - 1);
  const right = Math.min(totalPages - 1, current + 1);
  out.push(1);
  if (left > 2) out.push("…");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < totalPages - 1) out.push("…");
  out.push(totalPages);
  return out;
}

export function DataPagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  fetching,
  className,
}: DataPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page + 1, totalPages);
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  const pages = buildPageList(current, totalPages);
  const go = (p: number) => {
    const clamped = Math.max(0, Math.min(totalPages - 1, p));
    if (clamped !== page) onPageChange(clamped);
  };

  return (
    <div
      className={
        "flex flex-col gap-3 border-t border-border bg-background/60 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" +
        (className ? " " + className : "")
      }
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>
          {total === 0
            ? "Nenhum resultado"
            : `Mostrando ${from.toLocaleString("pt-BR")}–${to.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")}`}
        </span>
        {fetching && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">·</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-[88px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt} / pág.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="Primeira página"
          disabled={page === 0}
          onClick={() => go(0)}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="Página anterior"
          disabled={page === 0}
          onClick={() => go(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p, idx) =>
          p === "…" ? (
            <span key={`gap-${idx}`} className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              size="sm"
              variant={p === current ? "default" : "ghost"}
              aria-current={p === current ? "page" : undefined}
              aria-label={`Página ${p}`}
              className="h-8 min-w-8 px-2"
              onClick={() => go(p - 1)}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="Próxima página"
          disabled={current >= totalPages}
          onClick={() => go(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="Última página"
          disabled={current >= totalPages}
          onClick={() => go(totalPages - 1)}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}