import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReservationsPagination({
  page,
  totalPages,
  count,
  fetching,
  onPrev,
  onNext,
  itemSingular = "reserva",
  itemPlural = "reservas",
}: {
  page: number;
  totalPages: number;
  count: number;
  fetching: boolean;
  onPrev: () => void;
  onNext: () => void;
  itemSingular?: string;
  itemPlural?: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 border-t border-border text-sm">
      <div className="text-muted-foreground">
        {count} {count === 1 ? itemSingular : itemPlural} • Página {page + 1} de {totalPages}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={page === 0 || fetching}
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={page + 1 >= totalPages || fetching}
        >
          Próxima <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}