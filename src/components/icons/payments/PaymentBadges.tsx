import { MercadoPago } from "./MercadoPago";
import { Pix } from "./Pix";
import { Visa } from "./Visa";
import { Mastercard } from "./Mastercard";
import { Amex } from "./Amex";
import { Boleto } from "./Boleto";

const BADGES = [
  { Comp: MercadoPago, label: "Mercado Pago" },
  { Comp: Pix, label: "Pix" },
  { Comp: Visa, label: "Visa" },
  { Comp: Mastercard, label: "Mastercard" },
  { Comp: Amex, label: "American Express" },
  { Comp: Boleto, label: "Boleto" },
];

interface PaymentBadgesProps {
  className?: string;
  size?: "sm" | "md";
}

/**
 * Linha horizontal de badges de pagamento (SVG).
 * Acessível: cada SVG tem <title> e role="img".
 */
export function PaymentBadges({ className = "", size = "md" }: PaymentBadgesProps) {
  const heights = { sm: "h-5", md: "h-7" } as const;
  return (
    <ul className={`flex flex-wrap items-center gap-2 ${className}`} aria-label="Formas de pagamento aceitas">
      {BADGES.map(({ Comp, label }) => (
        <li
          key={label}
          className="rounded-md bg-card/40 ring-1 ring-line/60 p-1 transition hover:bg-card/80"
          title={label}
        >
          <Comp className={`${heights[size]} w-auto block`} />
        </li>
      ))}
    </ul>
  );
}