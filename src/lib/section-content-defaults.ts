/**
 * Defaults de conteúdo (texto + imagens) por tipo de seção, em PT-BR.
 * Usado pelos editores do CMS para PRÉ-PREENCHER os inputs com o que
 * está atualmente renderizado no site, e como fallback nos renderers.
 */
import ptBR from "@/i18n/pt-BR.json";
import { SECTION_IMAGE_DEFAULTS } from "./section-defaults";

const s = (ptBR as Record<string, unknown>).sections as Record<string, any>;

export type SectionDefaults = Record<string, unknown> & {
  images?: Record<string, string>;
};

const HERO: SectionDefaults = {
  line1: s.hero.line1,
  line2a: s.hero.line2a,
  line2b: s.hero.line2b,
  line3: s.hero.line3,
  title: s.hero.cta,
  subtitle: s.hero.subtitle,
  ctaLabel: s.hero.cta,
  ctaUrl: "/reservation",
  images: { ...SECTION_IMAGE_DEFAULTS.hero },
};

const inc = (k: string) => s.lodging.includes[k] as string;

const HOSPEDAGEM: SectionDefaults = {
  eyebrow: s.lodging.eyebrow,
  titleA: s.lodging.titleA,
  titleB: s.lodging.titleB,
  titleC: s.lodging.titleC,
  desc: s.lodging.desc,
  packages: [
    {
      name: s.lodging.suite.name,
      capacity: s.lodging.suite.capacity,
      priceLabel: s.lodging.perPerson,
      price: "R$ 1.500",
      badge: s.lodging.soldOut,
      badgeTone: "soldout",
      includes: [inc("lodging"), inc("transfer"), inc("snacks"), inc("kit"), inc("hygiene"), inc("pool"), inc("interactions")],
      bathroom: s.lodging.suite.bathroom,
      altPrice: s.lodging.suite.altPrice,
      ctaUrl: "/reservation",
    },
    {
      name: s.lodging.camping.name,
      capacity: s.lodging.camping.capacity,
      priceLabel: s.lodging.perPerson,
      price: "R$ 1.000",
      badge: s.lodging.lastSpots,
      badgeTone: "last",
      includes: [inc("campingLodging"), inc("transfer"), inc("snacks"), inc("kit"), inc("hygiene"), inc("pool"), inc("interactions")],
      bathroom: s.lodging.camping.bathroom,
      altPrice: s.lodging.camping.altPrice,
      ctaUrl: "/reservation",
    },
  ],
};

const EXPERIENCE: SectionDefaults = {
  eyebrow: s.experience.eyebrow,
  titleA: s.experience.titleA,
  titleB: s.experience.titleB,
  desc: s.experience.desc,
  ctaLabel: s.experience.cta,
  big: [
    { title: s.experience.cards.comfort.title, text: s.experience.cards.comfort.text },
    { title: s.experience.cards.transfer.title, text: s.experience.cards.transfer.text },
  ],
  small: [
    { title: s.experience.cards.continuous.title, text: s.experience.cards.continuous.text },
    { title: s.experience.cards.breakfast.title, text: s.experience.cards.breakfast.text },
    { title: s.experience.cards.kits.title, text: s.experience.cards.kits.text },
  ],
  images: { ...SECTION_IMAGE_DEFAULTS.experience },
};

const CAMPING: SectionDefaults = {
  subtitle: s.campingPromo.subtitle,
  title: s.campingPromo.title,
  desc: s.campingPromo.desc,
  ctaLabel: s.campingPromo.cta,
  ctaUrl: "/reservation",
  images: { ...SECTION_IMAGE_DEFAULTS.camping },
};

const LOCATION: SectionDefaults = {
  marquee1: s.location.marquee1,
  marquee2: s.location.marquee2,
  marquee3: s.location.marquee3,
  marquee4: s.location.marquee4,
};

const FEEDBACK: SectionDefaults = {
  eyebrow: s.feedback.eyebrow,
  titleA: s.feedback.titleA,
  titleB: s.feedback.titleB,
  desc: s.feedback.desc,
  testimonials: (s.feedback.testimonials as Array<{ name: string; quote: string }>).map((t, i) => ({
    ...t,
    avatar: (SECTION_IMAGE_DEFAULTS.feedback as Record<string, string>)[`avatar${i + 1}`] ?? "",
  })),
  images: { ...SECTION_IMAGE_DEFAULTS.feedback },
};

const CTA: SectionDefaults = {
  title1: s.ctaFinal.title1,
  title2: s.ctaFinal.title2,
  title3: s.ctaFinal.title3,
  desc1: s.ctaFinal.desc1,
  desc2: s.ctaFinal.desc2,
  ctaLabel: s.ctaFinal.cta,
  ctaUrl: "/reservation",
};

const STORIES: SectionDefaults = {
  eyebrow: "Bastidores",
  titleA: "Vivências em",
  titleB: "vídeo",
  desc: "Conheça os ambientes, eventos e momentos da Way Home em vídeos curtos.",
  items: [],
};

const EXPERIENCE_DETAIL: SectionDefaults = {
  eyebrow: "Way Home",
  title: "Título da experiência",
  subtitle: "Subtítulo curto e direto.",
  banner: "",
  intro: "Descrição rica em primeira pessoa do que essa experiência entrega ao hóspede.",
  benefits: [
    { icon: "Sparkles", title: "Benefício 1", text: "Descrição curta." },
    { icon: "ShieldCheck", title: "Benefício 2", text: "Descrição curta." },
    { icon: "Users2", title: "Benefício 3", text: "Descrição curta." },
    { icon: "Clock", title: "Benefício 4", text: "Descrição curta." },
  ],
  info: [
    { label: "Inclusos", value: "—" },
    { label: "Horários", value: "—" },
  ],
  institutional: {
    title: "Bloco institucional",
    text: "Texto que reforça a marca e o cuidado da Way Home com essa parte da experiência.",
    image: "",
  },
  gallery: [],
  ctaLabel: "Reservar agora",
  ctaUrl: "/reservation",
};

const REGISTRY: Record<string, SectionDefaults> = {
  hero: HERO,
  experience: EXPERIENCE,
  experience_detail: EXPERIENCE_DETAIL,
  hospedagem: HOSPEDAGEM,
  camping: CAMPING,
  stories: STORIES,
  location: LOCATION,
  feedback: FEEDBACK,
  cta: CTA,
};

export function getSectionDefaults(type: string): SectionDefaults {
  return REGISTRY[type] ?? {};
}