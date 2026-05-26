import type { SVGProps } from "react";

export function FlagES(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 14"
      role="img"
      aria-label="España"
      {...props}
    >
      <clipPath id="es-r">
        <rect width="20" height="14" rx="1.5" />
      </clipPath>
      <g clipPath="url(#es-r)">
        <rect width="20" height="14" fill="#AA151B" />
        <rect y="3.5" width="20" height="7" fill="#F1BF00" />
        <rect x="3.5" y="5.5" width="2.4" height="3" rx="0.3" fill="#AA151B" />
        <rect x="3.5" y="5.5" width="2.4" height="3" rx="0.3" fill="none" stroke="#9E7A1A" strokeWidth="0.15" />
      </g>
    </svg>
  );
}