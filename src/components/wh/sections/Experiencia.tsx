/**
 * Seção de Diferenciais/Experiência.
 * Lista os motivos para escolher a Way Home através de cards informativos.
 */
import { Reveal } from "../Reveal";
import { Link } from "@tanstack/react-router";
import { getImg, SECTION_IMAGE_DEFAULTS } from "@/lib/section-defaults";
import { displayMediaUrl } from "@/lib/cdn";
import { useT } from "@/components/i18n/LocaleProvider";
import { EditableText } from "@/components/admin/visual-edit/EditableText";
import { EditableImage } from "@/components/admin/visual-edit/EditableImage";

export function Experiencia({ data }: { data?: Record<string, unknown> }) {
  const t = useT();
  const eyebrow = (data?.eyebrow as string | undefined) ?? t("sections.experience.eyebrow");
  const titleA = (data?.titleA as string | undefined) ?? t("sections.experience.titleA");
  const titleB = (data?.titleB as string | undefined) ?? t("sections.experience.titleB");
  const desc = (data?.desc as string | undefined) ?? t("sections.experience.desc");
  const ctaLabel = (data?.ctaLabel as string | undefined) ?? t("sections.experience.cta");
  const dataBig = data?.big as Array<{ title: string; text: string }> | undefined;
  const dataSmall = data?.small as Array<{ title: string; text: string }> | undefined;
  const linked = (data?.linkedBanners as Record<string, string> | undefined) ?? {};
  const images = (data?.images as Record<string, string> | undefined) ?? {};
  const pickImg = (key: keyof typeof SECTION_IMAGE_DEFAULTS.experience, slug: string): string => {
    const fromPage = linked[slug];
    if (typeof fromPage === "string" && fromPage.trim().length > 0) return displayMediaUrl(fromPage);
    const override = images[key as string];
    if (typeof override === "string" && override.trim().length > 0) return displayMediaUrl(override);
    return getImg("experience", key, data);
  };
  const TEXT_BIG = (Array.isArray(dataBig) && dataBig.length > 0 ? dataBig : [
    { title: t("sections.experience.cards.comfort.title"), text: t("sections.experience.cards.comfort.text") },
    { title: t("sections.experience.cards.transfer.title"), text: t("sections.experience.cards.transfer.text") },
  ]);
  const TEXT_SMALL = (Array.isArray(dataSmall) && dataSmall.length > 0 ? dataSmall : [
    { title: t("sections.experience.cards.continuous.title"), text: t("sections.experience.cards.continuous.text") },
    { title: t("sections.experience.cards.breakfast.title"), text: t("sections.experience.cards.breakfast.text") },
    { title: t("sections.experience.cards.kits.title"), text: t("sections.experience.cards.kits.text") },
  ]);
  const BIG = [
    { ...(TEXT_BIG[0] ?? { title: "", text: "" }), img: pickImg("big1", "hospedagem"), slug: "hospedagem" },
    { ...(TEXT_BIG[1] ?? { title: "", text: "" }), img: pickImg("big2", "transfer"), slug: "transfer" },
  ];
  const SMALL = [
    { ...(TEXT_SMALL[0] ?? { title: "", text: "" }), img: pickImg("small1", "experiencia"), slug: "experiencia" },
    { ...(TEXT_SMALL[1] ?? { title: "", text: "" }), img: pickImg("small2", "cafe-da-manha"), slug: "cafe-da-manha" },
    { ...(TEXT_SMALL[2] ?? { title: "", text: "" }), img: pickImg("small3", "kits"), slug: "kits" },
  ];
  return (
    <section
      id="experiencia"
      className="relative bg-background pt-20 pb-10 md:pt-32 md:pb-16"
    >
      <div className="container-wh">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <EditableText path="eyebrow" value={eyebrow} as="span" className="eyebrow mx-auto" />
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="heading-display mt-5 text-4xl text-ink md:text-6xl">
              <EditableText path="titleA" value={titleA} as="span" />
              <EditableText path="titleB" value={titleB} as="span" className="text-italic-brand italic" />
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <EditableText path="desc" value={desc} as="p" singleLine={false} className="mt-6 text-base text-ink-soft md:text-lg" />
          </Reveal>
        </div>

        {/* Row 1 — 2 large cards */}
        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {BIG.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <Link
                to="/experiencias/$slug"
                params={{ slug: f.slug }}
                className="card-wh group block h-full overflow-hidden transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="photo-vignette aspect-[16/10] overflow-hidden">
                  <EditableImage
                    path={`images.big${i + 1}`}
                    value={f.img}
                    alt={f.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
                <div className="p-7 md:p-8">
                  <h3 className="font-display text-2xl font-bold text-ink md:text-3xl">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft md:text-base">
                    {f.text}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* Row 2 — 3 small cards */}
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {SMALL.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <Link
                to="/experiencias/$slug"
                params={{ slug: f.slug }}
                className="card-wh group block h-full overflow-hidden transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="photo-vignette aspect-square overflow-hidden">
                  <EditableImage
                    path={`images.small${i + 1}`}
                    value={f.img}
                    alt={f.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
                <div className="p-6 md:p-7">
                  <h3 className="font-display text-xl font-bold text-ink md:text-2xl">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    {f.text}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-14 flex justify-center">
            <Link to="/reservation" className="btn-brand">
              <EditableText path="ctaLabel" value={ctaLabel} as="span" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
