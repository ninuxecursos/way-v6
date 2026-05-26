import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";

interface Props {
  stepKey: string;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * Cartão visual do quiz: anima cada passo (slide + fade), foca leitura,
 * mantém o footer fora da animação para evitar saltos do CTA.
 */
export function QuizCard({ stepKey, eyebrow, title, description, children, footer }: Props) {
  return (
    <Card className="overflow-hidden p-0 shadow-lg shadow-brand/5 ring-1 ring-border/60">
      <div className="relative min-h-[320px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepKey}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-5 p-5 sm:p-7"
          >
            {eyebrow ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
                {eyebrow}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <h2 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">
                {title}
              </h2>
              {description ? (
                <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
              ) : null}
            </div>
            <div className="space-y-4">{children}</div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="border-t border-border/60 bg-muted/20 px-5 py-3 sm:px-7">{footer}</div>
    </Card>
  );
}