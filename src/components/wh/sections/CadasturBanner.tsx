/**
 * Banner de Credibilidade (Cadastur).
 * Exibe a certificação oficial para passar confiança ao usuário.
 */
import { Reveal } from "../Reveal";
import { getImg } from "@/lib/section-defaults";
import { useT } from "@/components/i18n/LocaleProvider";

export function CadasturBanner({ data }: { data?: Record<string, unknown> }) {
  const t = useT();
  const cadasturLogo = getImg("cadastur", "logo", data);
  return (
    <section className="relative bg-background pb-16 md:pb-24">
      <div className="container-wh">
        <Reveal>
          <div className="card-wh flex flex-col items-center gap-8 p-8 md:flex-row md:p-10 lg:p-12">
            <img
              src={cadasturLogo}
              alt={t("sections.cadastur.alt")}
              className="h-16 w-auto object-contain md:h-20 lg:h-24"
              loading="lazy"
              width={180}
              height={96}
              decoding="async"
            />
            <div className="flex-1 text-center md:text-left">
              <h3 className="heading-display text-2xl italic text-ink md:text-3xl">
                {t("sections.cadastur.title1")}<span className="not-italic">{t("sections.cadastur.title2")}</span>
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft md:text-base">
                {t("sections.cadastur.body")}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
