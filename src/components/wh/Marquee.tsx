/**
 * Componente de letreiro (Marquee) para textos corridos.
 * Cria um loop infinito de conteúdo horizontal.
 */
import type { ReactNode } from "react";

export function Marquee({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 -mt-[12%] overflow-hidden border-y border-line bg-background/30 py-6 backdrop-blur-sm">
      <div className="marquee-track marquee-track--fast gap-12 px-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex shrink-0 items-center gap-12">
            {children}
          </div>
        ))}
      </div>
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background/60 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background/60 to-transparent" />
    </div>
  );
}
