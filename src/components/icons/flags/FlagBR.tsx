import type { SVGProps } from "react";

export function FlagBR(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 14"
      role="img"
      aria-label="Brasil"
      {...props}
    >
      <rect width="20" height="14" rx="1.5" fill="#009C3B" />
      <path d="M10 2 L18 7 L10 12 L2 7 Z" fill="#FFDF00" />
      <circle cx="10" cy="7" r="2.6" fill="#002776" />
      <path
        d="M7.6 6.4 Q10 5.6 12.4 6.4"
        stroke="#FFFFFF"
        strokeWidth="0.45"
        fill="none"
      />
    </svg>
  );
}