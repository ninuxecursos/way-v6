/**
 * Wrapper de animação leve.
 *
 * - Por padrão (`onScroll` falso) anima ao montar — útil no Hero/topo.
 * - Com `onScroll` (ou usado via <RevealOnScroll>), dispara quando entra
 *   na viewport (uma vez só), ideal para seções abaixo da dobra.
 *
 * Animação: opacity 0→1 + translateY pequeno→0. Apenas transform/opacity
 * (GPU-friendly). Respeita `prefers-reduced-motion` automaticamente.
 */
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type Tag = "div" | "section" | "article" | "h1" | "h2" | "h3" | "p";

type Props = {
  children: ReactNode;
  /** Atraso em segundos (compat com call sites antigos). */
  delay?: number;
  /** Deslocamento vertical inicial em px. Default: 8 (mount), 16 (scroll). */
  y?: number;
  className?: string;
  as?: Tag;
  /** Anima apenas quando entra na viewport. */
  onScroll?: boolean;
  /** Duração em segundos. Default: 0.5. */
  duration?: number;
};

const EASE = [0.22, 0.61, 0.36, 1] as const;

export function Reveal({
  children,
  className,
  as = "div",
  delay = 0,
  y,
  onScroll = false,
  duration = 0.5,
}: Props) {
  const reduce = useReducedMotion();
  const offset = y ?? (onScroll ? 16 : 8);

  const initial = reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: offset };
  const target = { opacity: 1, y: 0 };

  const common: HTMLMotionProps<"div"> = {
    className,
    initial,
    transition: { duration, delay, ease: EASE },
  };

  const props: HTMLMotionProps<"div"> = onScroll
    ? {
        ...common,
        whileInView: target,
        // amount baixo + sem margin negativa: garante disparo mesmo em
        // seções curtas (ex.: marquee de Localização) que não atingem
        // 15% de altura visível antes do usuário rolar para a próxima.
        viewport: { once: true, amount: 0.01 },
      }
    : { ...common, animate: target };

  const Tag = motion[as] as typeof motion.div;
  return <Tag {...props}>{children}</Tag>;
}

/** Atalho para reveal por scroll. */
export function RevealOnScroll(props: Omit<Props, "onScroll">) {
  return <Reveal {...props} onScroll />;
}
