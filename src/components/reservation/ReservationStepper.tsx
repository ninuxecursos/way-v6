import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { RESERVATION_STEPS, type ReservationStep } from "@/types/reservation";
import { cn } from "@/lib/utils";

interface Props {
  current: ReservationStep;
  /** Steps já concluídos — habilita o link clicável para voltar. */
  completed: ReservationStep[];
}

export function ReservationStepper({ current, completed }: Props) {
  const currentIndex = RESERVATION_STEPS.findIndex((s) => s.id === current);

  return (
    <nav aria-label="Progresso da reserva" className="w-full">
      <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {RESERVATION_STEPS.map((step, idx) => {
          const isDone = completed.includes(step.id) || idx < currentIndex;
          const isCurrent = step.id === current;
          const Body = (
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                isCurrent && "bg-brand text-white border-brand shadow-sm",
                !isCurrent && isDone && "bg-card text-foreground border-border",
                !isCurrent && !isDone && "bg-card/60 text-muted-foreground border-border/60",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  isCurrent && "bg-white/20 text-white",
                  !isCurrent && isDone && "bg-brand/15 text-brand",
                  !isCurrent && !isDone && "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : idx + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          );
          return (
            <li key={step.id} className="flex items-center gap-1 sm:gap-2">
              {isDone && !isCurrent ? (
                <Link to={step.href}>{Body}</Link>
              ) : (
                Body
              )}
              {idx < RESERVATION_STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "h-px w-4 sm:w-8 transition-colors",
                    idx < currentIndex ? "bg-brand" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}