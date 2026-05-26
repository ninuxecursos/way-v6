import { useEffect } from "react";
import { CheckCircle2, ChevronDown, ScrollText } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { useScrollBottom } from "@/hooks/use-scroll-bottom";
import { TermsContent } from "@/components/reservation/TermsContent";

export function TermsBlock({
  title,
  meta,
  acceptedTerms,
  acceptedImage,
  onAcceptedTerms,
  onAcceptedImage,
  onScrollReached,
}: {
  title: string;
  meta: string;
  acceptedTerms: boolean;
  acceptedImage: boolean;
  onAcceptedTerms: (v: boolean) => void;
  onAcceptedImage: (v: boolean) => void;
  onScrollReached?: (reached: boolean) => void;
}) {
  const { ref: scrollRef, reached: scrollReached } = useScrollBottom<HTMLDivElement>(24);

  useEffect(() => {
    onScrollReached?.(scrollReached);
  }, [scrollReached, onScrollReached]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/60 bg-muted/30 px-5 py-4 sm:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <ScrollText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none">{title}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            {meta}
          </p>
        </div>
      </div>

      {/* Conteúdo dos termos com scroll obrigatório */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="h-[360px] overflow-y-auto px-5 py-5 text-sm leading-relaxed text-muted-foreground sm:px-6"
        >
          <TermsContent />
        </div>

        {!scrollReached && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-2">
            <div className="h-16 w-full bg-gradient-to-t from-background to-transparent" />
            <span className="-mt-8 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/95 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
              <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
              Role até o final para continuar
            </span>
          </div>
        )}
        {scrollReached && (
          <div className="pointer-events-none absolute right-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Lido
            </span>
          </div>
        )}
      </div>

      {/* Checkboxes */}
      <div className="space-y-3 border-t border-border/60 bg-muted/20 px-5 py-5 sm:px-6">
        <label
          className={`flex items-start gap-3 rounded-lg border p-3 transition cursor-pointer ${
            acceptedTerms ? "border-brand/60 bg-brand/5" : "border-border/60 bg-background/40"
          } ${!scrollReached ? "opacity-60" : ""}`}
        >
          <Checkbox
            checked={acceptedTerms}
            disabled={!scrollReached}
            onCheckedChange={(v) => onAcceptedTerms(v === true)}
            className="mt-0.5"
          />
          <span className="text-sm">
            <strong className="font-semibold text-foreground">Li e aceito os termos</strong>
            <span className="block text-xs text-muted-foreground">
              Concordo com os Termos de Uso, Política de Privacidade e regras do evento
              descritas acima.
            </span>
          </span>
        </label>

        <label
          className={`flex items-start gap-3 rounded-lg border p-3 transition cursor-pointer ${
            acceptedImage ? "border-brand/60 bg-brand/5" : "border-border/60 bg-background/40"
          } ${!scrollReached ? "opacity-60" : ""}`}
        >
          <Checkbox
            checked={acceptedImage}
            disabled={!scrollReached}
            onCheckedChange={(v) => onAcceptedImage(v === true)}
            className="mt-0.5"
          />
          <span className="text-sm">
            <strong className="font-semibold text-foreground">Autorizo uso de imagem</strong>
            <span className="block text-xs text-muted-foreground">
              Permito que a Way Home utilize minha imagem em materiais de divulgação do evento,
              conforme item 4.
            </span>
          </span>
        </label>

        {!scrollReached && (
          <p className="text-center text-[11px] text-muted-foreground">
            As opções serão liberadas após a leitura completa dos termos.
          </p>
        )}
      </div>
    </>
  );
}