/**
 * Defaults centralizados de imagens das seções da home.
 * Cada seção tem um conjunto de chaves (`hero.background`, `camping.background`...)
 * com a URL padrão. O CMS pode sobrescrever via `data.images.{key}` em cada `page_section`.
 *
 * Para alterar uma imagem direto no admin: edite a seção e adicione
 *   { "images": { "background": "https://..." } }
 * Ou utilize o editor visual de imagens no painel.
 */

import { displayMediaUrl } from "./cdn";

export type ImageMap = Record<string, string>;

export const SECTION_IMAGE_DEFAULTS = {
  hero: {
    background: "/wh/RDQXRypylJzj50EZG0zadUgIPT4.webp",
    avatar1: "/wh/9brow167BD7vSTImdvlzbGTTd0.webp",
    avatar2: "/wh/Oq73XE0jISa881AUlgxkrUQFf0.webp",
    avatar3: "/wh/Bi6OG3sJ6VVrkGbNCU7xvvqaq38.webp",
    avatar4: "/wh/RuTtpWzHKZwo5zG1IMVX5pmrphg.webp",
  },
  camping: {
    background: "/wh/lhAqI3SkQvc8rU1J20IT1rFoEo.webp",
  },
  experience: {
    big1: "/wh/MiyBdR5sRH5u0R5wpUhuJOBVY.webp",
    big2: "/wh/aX2ms4piPBPICe5GmcHASNOFZOo.webp",
    small1: "/wh/J4ZMBX4SZeVTCKE1SPacmEFOhQ.webp",
    small2: "/wh/Qj0ydYUqhNx64xhujaoMluJr9Ek.webp",
    small3: "/wh/Ax4PsoLuTHcsnQh6vWmoOo8oAM.webp",
  },
  feedback: {
    avatar1: "/wh/9brow167BD7vSTImdvlzbGTTd0.webp",
    avatar2: "/wh/Oq73XE0jISa881AUlgxkrUQFf0.webp",
    avatar3: "/wh/Bi6OG3sJ6VVrkGbNCU7xvvqaq38.webp",
    avatar4: "/wh/RuTtpWzHKZwo5zG1IMVX5pmrphg.webp",
    avatar5: "/wh/QYh5P2x7MjxPcRw8gciuiMZaE.webp",
    avatar6: "/wh/VcwdGXlLLAL1TZBt5cmh0uR0sIw.webp",
  },
  location: {
    map: "/assets/map-bg.jpg",
    emblem: "/assets/tml-emblem.png",
  },
  cadastur: {
    logo: "/assets/cadastur.png",
  },
} as const;

export type SectionKey = keyof typeof SECTION_IMAGE_DEFAULTS;

/** Lê um override de imagem do CMS, com fallback para o default. */
export function getImg<S extends SectionKey>(
  section: S,
  key: keyof (typeof SECTION_IMAGE_DEFAULTS)[S],
  data?: Record<string, unknown>,
): string {
  const images = (data?.images as ImageMap | undefined) ?? undefined;
  const k = key as string;
  const override = images?.[k];
  if (typeof override === "string" && override.trim().length > 0) return displayMediaUrl(override);
  return SECTION_IMAGE_DEFAULTS[section][key] as string;
}

/** Lista as chaves de imagem definidas para uma seção (para o editor visual). */
export function listImageKeys(section: SectionKey): string[] {
  return Object.keys(SECTION_IMAGE_DEFAULTS[section]);
}