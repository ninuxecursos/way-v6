import type { SVGProps } from "react";

export function Amex(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="American Express" {...props}>
      <title>American Express</title>
      <rect width="48" height="32" rx="4" fill="#2E77BC" />
      <text
        x="24"
        y="14"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="6"
        fill="#FFFFFF"
        letterSpacing="0.4"
      >
        AMERICAN
      </text>
      <text
        x="24"
        y="22"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="6"
        fill="#FFFFFF"
        letterSpacing="0.4"
      >
        EXPRESS
      </text>
    </svg>
  );
}