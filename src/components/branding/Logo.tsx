/**
 * <Logo slot="..." /> — renderiza o logo configurado no admin para o slot.
 * Cai num wordmark de texto enquanto o branding ainda não carregou.
 */
import { useLogo } from "@/hooks/use-branding";
import type { LogoSlotId } from "@/lib/logo-catalog";

interface LogoProps {
  slot: LogoSlotId;
  className?: string;
  /** Altura em px (img height). Largura é auto. */
  height?: number;
  alt?: string;
}

export function Logo({ slot, className, height = 32, alt }: LogoProps) {
  const { src, alt: defaultAlt, height: configured } = useLogo(slot);
  const finalHeight = configured && configured > 0 ? configured : height;
  // Largura nominal — proporção aproximada de wordmark (3:1). Evita CLS
  // sem travar o aspect ratio real (width:auto no style).
  const nominalWidth = Math.round(finalHeight * 3);
  return (
    <img
      src={src}
      alt={alt ?? defaultAlt}
      height={finalHeight}
      width={nominalWidth}
      style={{ height: finalHeight, width: "auto" }}
      className={className}
      draggable={false}
      decoding="async"
    />
  );
}