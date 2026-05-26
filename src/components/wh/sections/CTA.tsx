/**
 * Seção final de Call-to-Action (CTA).
 * Reitera o convite para reserva antes do rodapé.
 */
import { Reveal } from "../Reveal";
import { Link } from "@tanstack/react-router";
import { useT } from "@/components/i18n/LocaleProvider";
import { EditableText } from "@/components/admin/visual-edit/EditableText";

export function CTA({ data }: { data?: Record<string, unknown> }) {
  const t = useT();
  const title1 = (data?.title1 as string | undefined) ?? t("sections.ctaFinal.title1");
  const title2 = (data?.title2 as string | undefined) ?? t("sections.ctaFinal.title2");
  const title3 = (data?.title3 as string | undefined) ?? t("sections.ctaFinal.title3");
  const desc1 = (data?.desc1 as string | undefined) ?? t("sections.ctaFinal.desc1");
  const desc2 = (data?.desc2 as string | undefined) ?? t("sections.ctaFinal.desc2");
  const ctaLabel = (data?.ctaLabel as string | undefined) ?? t("sections.ctaFinal.cta");
  return (
    <section className="relative overflow-hidden bg-background py-24 md:py-32">
      <div className="container-wh text-center">
        <Reveal>
          <h2 className="heading-display mx-auto max-w-5xl text-4xl text-ink md:text-7xl lg:text-8xl">
            <EditableText path="title1" value={title1} as="span" />
            {" "}
            <EditableText path="title2" value={title2} as="span" className="italic text-italic-brand" />
            <br />
            <EditableText path="title3" value={title3} as="span" className="italic" />
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="mx-auto mt-6 max-w-xl text-sm text-ink-soft md:text-base">
            <EditableText path="desc1" value={desc1} as="span" />
            <br className="hidden md:block" />
            <EditableText path="desc2" value={desc2} as="span" />
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-8 flex justify-center">
            <Link to="/reservation" className="btn-brand">
              <EditableText path="ctaLabel" value={ctaLabel} as="span" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
