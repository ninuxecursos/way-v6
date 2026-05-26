import type { SVGProps } from "react";

export function MercadoPago(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mercado Pago" {...props}>
      <title>Mercado Pago</title>
      <rect width="48" height="32" rx="4" fill="#00B1EA" />
      <path
        d="M10 18c4-6 10-6 14-3 4-3 10-3 14 3-2 4-7 6-14 6s-12-2-14-6Z"
        fill="#FFFFFF"
      />
      <circle cx="20" cy="17" r="1.4" fill="#15171B" />
      <circle cx="28" cy="17" r="1.4" fill="#15171B" />
      <path d="M22 20.5c.7.5 2.3.5 4 0" stroke="#FFD24D" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  );
}