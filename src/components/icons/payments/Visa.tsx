import type { SVGProps } from "react";

export function Visa(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Visa" {...props}>
      <title>Visa</title>
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <text
        x="24"
        y="22"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="13"
        fill="#FFFFFF"
        letterSpacing="0.5"
      >
        VISA
      </text>
      <rect x="6" y="24" width="36" height="2" fill="#F7B600" />
    </svg>
  );
}