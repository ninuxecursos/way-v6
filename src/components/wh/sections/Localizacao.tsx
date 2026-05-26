/**
 * Seção de Localização.
 *  - Banner de mapa em fundo (configurável em Mídias: `map`).
 *  - Emblema sobreposto (configurável em Mídias: `emblem`).
 *  - Marquee inferior com chamadas curtas (editáveis em Conteúdo).
 */
import { Marquee } from "../Marquee";
import { useT } from "@/components/i18n/LocaleProvider";
import { EditableText } from "@/components/admin/visual-edit/EditableText";
import { getImg } from "@/lib/section-defaults";

export function Localizacao({ data }: { data?: Record<string, unknown> }) {
  const t = useT();
  const m1 = (data?.marquee1 as string | undefined) ?? t("sections.location.marquee1");
  const m2 = (data?.marquee2 as string | undefined) ?? t("sections.location.marquee2");
  const m3 = (data?.marquee3 as string | undefined) ?? t("sections.location.marquee3");
  const m4 = (data?.marquee4 as string | undefined) ?? t("sections.location.marquee4");

  const map = getImg("location", "map", data);
  const emblem = getImg("location", "emblem", data);
  const hidden = (data?.imagesHidden as Record<string, boolean> | undefined) ?? {};
  const showMap = !hidden.map;
  const showEmblem = !hidden.emblem;

  const Item = () => (
    <span className="font-display flex items-center gap-6 text-[2.25rem] font-extrabold uppercase leading-none text-ink md:text-[3.375rem] lg:text-[4.5rem]">
      <EditableText path="marquee1" value={m1} as="span" />
      <EditableText path="marquee2" value={m2} as="span" className="text-italic-brand italic" />
      <span aria-hidden className="text-brand">★</span>
      <EditableText path="marquee3" value={m3} as="span" />
      <EditableText path="marquee4" value={m4} as="span" className="text-italic-brand italic" />
      <span aria-hidden className="text-brand">★</span>
    </span>
  );

  return (
    <section className="relative bg-background">
      {showMap && (
        <div className="relative isolate overflow-hidden">
          <img
            src={map}
            alt="Mapa da região do Tomorrowland Brasil"
            loading="lazy"
            width={1600}
            height={520}
            decoding="async"
            className="h-[280px] w-full object-cover md:h-[420px] lg:h-[520px]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/10 to-background/80"
          />
          {showEmblem && (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <img
                src={emblem}
                alt="Tomorrowland Brasil"
                loading="lazy"
                width={224}
                height={224}
                decoding="async"
                className="h-32 w-auto drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)] md:h-44 lg:h-56"
              />
            </div>
          )}
        </div>
      )}

      {/* Marquee na base */}
      <Marquee>
        <Item />
      </Marquee>
    </section>
  );
}
