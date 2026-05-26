import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useT } from "@/components/i18n/LocaleProvider";

interface Props {
  backHref?: string;
  backLabel?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryType?: "button" | "submit";
  loading?: boolean;
  disabled?: boolean;
}

/** Barra de ações fixa em mobile, inline em desktop. */
export function StepActions({
  backHref,
  backLabel,
  primaryLabel,
  onPrimary,
  primaryType = "button",
  loading = false,
  disabled = false,
}: Props) {
  const t = useT();
  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 -mx-4 mt-8 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:relative sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
      <div className="flex items-center justify-between gap-3">
        {backHref ? (
          <Button asChild variant="ghost">
            <a href={backHref}>{backLabel ?? t("common.back")}</a>
          </Button>
        ) : (
          <span />
        )}
        {primaryLabel && (
          <Button
            type={primaryType}
            onClick={onPrimary}
            disabled={disabled || loading}
            className="min-w-[160px]"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {primaryLabel}
          </Button>
        )}

      </div>
    </div>
  );
}