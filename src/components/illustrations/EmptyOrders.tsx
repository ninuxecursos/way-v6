import type { SVGProps } from "react";

/**
 * Ilustração SVG leve para estado "sem pedidos".
 * Usa currentColor — herda cor via Tailwind (text-muted-foreground etc).
 */
export function EmptyOrders(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 160 120"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Nenhum pedido"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M30 35 H50 L60 80 H120 L130 45 H55" opacity="0.85" />
      <circle cx="65" cy="95" r="6" />
      <circle cx="115" cy="95" r="6" />
      <path d="M75 55 L95 55 M70 65 L100 65" opacity="0.5" />
    </svg>
  );
}