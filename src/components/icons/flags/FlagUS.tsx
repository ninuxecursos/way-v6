import type { SVGProps } from "react";

export function FlagUS(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 14"
      role="img"
      aria-label="United States"
      {...props}
    >
      <clipPath id="us-r">
        <rect width="20" height="14" rx="1.5" />
      </clipPath>
      <g clipPath="url(#us-r)">
        <rect width="20" height="14" fill="#FFFFFF" />
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={i} y={i * 2 + 0} width="20" height="1.077" fill="#B22234" transform={`translate(0 ${i * 2 * 0.077})`} />
        ))}
        {[0, 2.15, 4.3, 6.45, 8.6, 10.75, 12.9].map((y, i) => (
          <rect key={i} y={y} width="20" height="1.07" fill="#B22234" />
        ))}
        <rect width="9" height="7.55" fill="#3C3B6E" />
        <g fill="#FFFFFF">
          {Array.from({ length: 9 }).flatMap((_, row) =>
            Array.from({ length: row % 2 === 0 ? 6 : 5 }).map((_, col) => (
              <circle
                key={`${row}-${col}`}
                cx={0.6 + col * 1.4 + (row % 2 === 0 ? 0 : 0.7)}
                cy={0.5 + row * 0.8}
                r="0.28"
              />
            ))
          )}
        </g>
      </g>
    </svg>
  );
}