import type { SVGProps } from "react";

export function Mastercard(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mastercard" {...props}>
      <title>Mastercard</title>
      <rect width="48" height="32" rx="4" fill="#15171B" />
      <circle cx="20" cy="16" r="8" fill="#EB001B" />
      <circle cx="28" cy="16" r="8" fill="#F79E1B" />
      <path
        d="M24 10.2a7.97 7.97 0 0 0 0 11.6 7.97 7.97 0 0 0 0-11.6Z"
        fill="#FF5F00"
      />
    </svg>
  );
}