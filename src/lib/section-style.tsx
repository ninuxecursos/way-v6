/**
 * Aplica estilos por seção (escala de texto) via CSS escopado por data-attribute.
 * Funciona tanto no preview do CMS quanto no site público.
 */
import type { ReactNode } from "react";

const TW_TEXT_SIZES: Record<string, [number, number]> = {
  // utility -> [font-size rem, line-height rem]
  "text-xs": [0.75, 1],
  "text-sm": [0.875, 1.25],
  "text-base": [1, 1.5],
  "text-lg": [1.125, 1.75],
  "text-xl": [1.25, 1.75],
  "text-2xl": [1.5, 2],
  "text-3xl": [1.875, 2.25],
  "text-4xl": [2.25, 2.5],
  "text-5xl": [3, 1],
  "text-6xl": [3.75, 1],
  "text-7xl": [4.5, 1],
  "text-8xl": [6, 1],
  "text-9xl": [8, 1],
};

export interface SectionStyle {
  textScale?: number;
  headingScale?: number;
  bodyScale?: number;
  buttonScale?: number;
}

export function getSectionStyle(data: Record<string, unknown> | undefined): SectionStyle {
  const s = (data?._style as Record<string, unknown> | undefined) ?? {};
  return {
    textScale: typeof s.textScale === "number" ? (s.textScale as number) : 1,
    headingScale: typeof s.headingScale === "number" ? (s.headingScale as number) : 1,
    bodyScale: typeof s.bodyScale === "number" ? (s.bodyScale as number) : 1,
    buttonScale: typeof s.buttonScale === "number" ? (s.buttonScale as number) : 1,
  };
}

/**
 * Wrapper que aplica a escala de texto à seção via CSS escopado.
 * Só renderiza o <style> quando há override (≠ 1).
 */
export function SectionStyleScope({
  id,
  data,
  children,
}: {
  id: string;
  data: Record<string, unknown> | undefined;
  children: ReactNode;
}) {
  const { textScale = 1, headingScale = 1, bodyScale = 1, buttonScale = 1 } = getSectionStyle(data);
  const noop =
    Math.abs(textScale - 1) < 0.001 &&
    Math.abs(headingScale - 1) < 0.001 &&
    Math.abs(bodyScale - 1) < 0.001 &&
    Math.abs(buttonScale - 1) < 0.001;
  if (noop) {
    return <div data-wh-section={id}>{children}</div>;
  }
  const sel = `[data-wh-section="${id}"]`;
  const baseRules = Object.entries(TW_TEXT_SIZES)
    .map(([cls, [fs, lh]]) => {
      const fsv = (fs * textScale).toFixed(4);
      const lhv = lh < 2 && lh > 0 && lh !== 1 ? `${(lh * textScale).toFixed(4)}rem` : `${lh}`;
      return `${sel} .${cls}{font-size:${fsv}rem;line-height:${lhv}}`;
    })
    .join("");
  const headingRule =
    headingScale !== 1
      ? `${sel} h1, ${sel} h2, ${sel} h3, ${sel} h4, ${sel} .heading-display{font-size:calc(1em * ${headingScale.toFixed(4)})}`
      : "";
  const bodyRule =
    bodyScale !== 1
      ? `${sel} p, ${sel} li, ${sel} .eyebrow{font-size:calc(1em * ${bodyScale.toFixed(4)})}`
      : "";
  const buttonRule =
    buttonScale !== 1
      ? `${sel} .btn-brand, ${sel} .btn-white, ${sel} .btn-ghost, ${sel} button:not([aria-label]):not([data-no-scale]){font-size:calc(1em * ${buttonScale.toFixed(4)})}`
      : "";
  const rules = baseRules + headingRule + bodyRule + buttonRule;
  return (
    <div data-wh-section={id} style={{ ["--wh-text-scale" as string]: textScale }}>
      <style dangerouslySetInnerHTML={{ __html: rules }} />
      {children}
    </div>
  );
}
