import type { SVGProps } from "react";

export function Boleto(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Boleto" {...props}>
      <title>Boleto</title>
      <rect width="48" height="32" rx="4" fill="#FFFFFF" stroke="#15171B" strokeWidth="1" />
      <g fill="#15171B">
        <rect x="6" y="8" width="1" height="16" />
        <rect x="8.5" y="8" width="2" height="16" />
        <rect x="12" y="8" width="1" height="16" />
        <rect x="14" y="8" width="3" height="16" />
        <rect x="18.5" y="8" width="1" height="16" />
        <rect x="21" y="8" width="2" height="16" />
        <rect x="24.5" y="8" width="1" height="16" />
        <rect x="27" y="8" width="3" height="16" />
        <rect x="31.5" y="8" width="1" height="16" />
        <rect x="34" y="8" width="2" height="16" />
        <rect x="37.5" y="8" width="1" height="16" />
        <rect x="40" y="8" width="2" height="16" />
      </g>
    </svg>
  );
}