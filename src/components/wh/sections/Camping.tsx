/**
 * Seção de destaque para o Camping.
 * Card de largura total com imagem de fundo e chamada para ação (CTA) de urgência.
 */
import { Reveal } from "../Reveal";
import { Link } from "@tanstack/react-router";
import { getImg } from "@/lib/section-defaults";
import { useT } from "@/components/i18n/LocaleProvider";
import { EditableText } from "@/components/admin/visual-edit/EditableText";
import { EditableImage } from "@/components/admin/visual-edit/EditableImage";

export function Camping({ data }: { data?: Record<string, unknown> }) {
  const t = useT();
  const img = getImg("camping", "background", data);
  const subtitle = (data?.subtitle as string | undefined) ?? t("sections.campingPromo.subtitle");
  const title = (data?.title as string | undefined) ?? t("sections.campingPromo.title");
  const desc = (data?.desc as string | undefined) ?? t("sections.campingPromo.desc");
  const ctaLabel = (data?.ctaLabel as string | undefined) ?? t("sections.campingPromo.cta");
  return (
    <section className="relative bg-background py-16 md:py-24">
      <div className="container-wh">
        <Reveal>
          <article className="relative overflow-hidden rounded-3xl">
            {/* Background image (full bleed) */}
            <EditableImage
              path="images.background"
              value={img}
              alt="Camping Way Home no Tomorrowland Brasil"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              wrapperClassName="absolute inset-0 block h-full w-full"
            />
            {/* Dark gradient overlay - left side darker so text reads */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, oklch(0.08 0.005 20 / 0.92) 0%, oklch(0.08 0.005 20 / 0.7) 45%, oklch(0.08 0.005 20 / 0.15) 100%)",
              }}
            />

            <div className="relative grid items-center md:grid-cols-2">
              <div className="flex flex-col gap-5 p-8 md:p-14 lg:p-16">
                <EditableText path="subtitle" value={subtitle} as="h3" className="heading-display text-2xl italic text-ink md:text-3xl" />
                <EditableText path="title" value={title} as="h2" className="heading-display text-3xl italic text-ink md:text-5xl lg:text-6xl" />
                <EditableText path="desc" value={desc} as="p" singleLine={false} className="max-w-md text-sm leading-relaxed text-ink md:text-base" />
                <div>
                  <Link to="/reservation" className="btn-brand">
                    <EditableText path="ctaLabel" value={ctaLabel} as="span" />
                  </Link>
                </div>
              </div>
              <div className="hidden md:block" />
            </div>

            {/* Maintain min height */}
            <div className="invisible md:h-[460px]" aria-hidden />
          </article>
        </Reveal>
      </div>
    </section>
  );
}
