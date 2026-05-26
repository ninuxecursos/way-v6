import type { SVGProps } from "react";

/**
 * Ilustração SVG leve para estado "sem resultados".
 */
export function EmptySearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 160 120"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Nenhum resultado encontrado"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="70" cy="55" r="28" />
      <path d="M92 78 L115 100" />
      <path d="M58 55 L82 55 M70 43 L70 67" opacity="0.4" />
    </svg>
  );
}