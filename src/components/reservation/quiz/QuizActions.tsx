import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onBack?: () => void;
  backLabel?: string;
  onNext: () => void;
  nextLabel?: string;
  nextIcon?: "arrow" | "check";
  loading?: boolean;
  disabled?: boolean;
}

export function QuizActions({
  onBack,
  backLabel = "Voltar",
  onNext,
  nextLabel = "Continuar",
  nextIcon = "arrow",
  loading = false,
  disabled = false,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} disabled={loading}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {backLabel}
        </Button>
      ) : (
        <span />
      )}
      <Button
        type="button"
        onClick={onNext}
        disabled={disabled || loading}
        size="lg"
        className="min-w-[170px] bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : nextIcon === "check" ? (
          <Check className="mr-2 h-4 w-4" />
        ) : null}
        {nextLabel}
        {!loading && nextIcon === "arrow" ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
      </Button>
    </div>
  );
}