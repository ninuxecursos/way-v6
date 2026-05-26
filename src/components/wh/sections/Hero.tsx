/**
 * Seção Hero (Destaque Inicial).
 * Imagens vêm do CMS (data.images) com fallback para os assets padrão.
 */
import { Reveal } from "../Reveal";
import { Link } from "@tanstack/react-router";
import { getImg } from "@/lib/section-defaults";
import { useT } from "@/components/i18n/LocaleProvider";
import { Logo } from "@/components/branding/Logo";
import { EditableText } from "@/components/admin/visual-edit/EditableText";
import { EditableImage } from "@/components/admin/visual-edit/EditableImage";
import { useEditContext } from "@/components/admin/visual-edit/EditContext";

export function Hero({ data }: { data?: Record<string, unknown> }) {
  const t = useT();
  const editing = !!useEditContext();
  const heroImg = getImg("hero", "background", data);
  const avatars = [
    getImg("hero", "avatar1", data),
    getImg("hero", "avatar2", data),
    getImg("hero", "avatar3", data),
    getImg("hero", "avatar4", data),
  ];
  const title = (data?.title as string | undefined) ?? t("sections.hero.cta");
  const subtitle = (data?.subtitle as string | undefined) ?? t("sections.hero.subtitle");
  const ctaLabel = (data?.ctaLabel as string | undefined) ?? title;
  const line1 = (data?.line1 as string | undefined) ?? t("sections.hero.line1");
  const line2a = (data?.line2a as string | undefined) ?? t("sections.hero.line2a");
  const line2b = (data?.line2b as string | undefined) ?? t("sections.hero.line2b");
  const line3 = (data?.line3 as string | undefined) ?? t("sections.hero.line3");

  // Tamanhos customizáveis via CMS (em px no desktop). No mobile aplicamos
  // clamp() para escalar suavemente. Se não definido, usa o tamanho padrão.
  const sizes = (data?.sizes as Record<string, number | undefined> | undefined) ?? {};
  const sizeStyle = (key: string): React.CSSProperties | undefined => {
    const v = sizes[key];
    if (!v || typeof v !== "number" || v <= 0) return undefined;
    // mínimo = 55% do desktop, fluido = 6vw, máximo = valor escolhido
    return { fontSize: `clamp(${Math.round(v * 0.55)}px, 6vw, ${v}px)`, lineHeight: 1.05 };
  };
  const subSize = sizes.subtitle && sizes.subtitle > 0
    ? { fontSize: `clamp(${Math.round(sizes.subtitle * 0.85)}px, 2.2vw, ${sizes.subtitle}px)` }
    : undefined;
  const ctaSize = sizes.cta && sizes.cta > 0 ? { fontSize: `${sizes.cta}px` } : undefined;

  // Espaçamento vertical configurável (CMS) do bloco do logotipo do hero.
  // Mobile e desktop podem ser ajustados separadamente. Padrão preserva os valores atuais.
  const spacing = (data?.spacing as { logoTopMobile?: number; logoTopDesktop?: number } | undefined) ?? {};
  const containerStyle: React.CSSProperties = {};
  if (spacing.logoTopMobile && spacing.logoTopMobile > 0) {
    (containerStyle as Record<string, string>)["--hero-logo-pt-mobile"] = `${spacing.logoTopMobile}px`;
  }
  if (spacing.logoTopDesktop && spacing.logoTopDesktop > 0) {
    (containerStyle as Record<string, string>)["--hero-logo-pt-desktop"] = `${spacing.logoTopDesktop}px`;
  }

  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 z-0">
        <EditableImage
          path="images.background"
          value={heroImg}
          alt="Hóspede Way Home a caminho do Tomorrowland Brasil"
          width={1920}
          height={1080}
          className="h-full w-full object-cover object-[center_45%]"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          wrapperClassName="absolute inset-0 block h-full w-full"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #f5f0e6 15%, rgba(245, 240, 230, 0.6) 40%, rgba(15, 15, 15, 0.4) 60%, rgba(15, 15, 15, 0.9) 100%)",
          }}
        />
      </div>

      <div
        className="container-wh relative z-10 flex min-h-screen flex-col items-center pb-12 text-center pt-[var(--hero-logo-pt-mobile,7rem)] md:pt-[var(--hero-logo-pt-desktop,6.4rem)]"
        style={containerStyle}
      >
        <Reveal>
          <Logo slot="hero" height={48} alt="Way Home" />
        </Reveal>

        <Reveal delay={0.15} className="mt-8 md:mt-4 max-w-4xl">
          <h1 className="heading-display text-[7vw] sm:text-[5vw] md:text-[3.75rem] lg:text-[4.25rem]">
            <EditableText path="line1" value={line1} as="span" className="block text-neutral-500/80" style={sizeStyle("line1")} />
            <span className="block" style={sizeStyle("line2")}>
              <EditableText path="line2a" value={line2a} as="span" className="text-neutral-500/80" />
              <EditableText path="line2b" value={line2b} as="span" className="italic text-neutral-900" />
            </span>
            <EditableText path="line3" value={line3} as="span" className="block italic text-neutral-500/70" style={sizeStyle("line3")} />
          </h1>
        </Reveal>

        {/* CTA + subtitle: visíveis no mobile aqui mesmo */}
        <Reveal delay={0.5} className="md:hidden">
          {editing ? (
            <span className="btn-brand mt-10 inline-block" style={ctaSize}>
              <EditableText path="ctaLabel" value={ctaLabel} as="span" />
            </span>
          ) : (
            <Link to="/reservation" className="btn-brand mt-10" style={ctaSize}>
              {ctaLabel}
            </Link>
          )}
        </Reveal>

        <div className="mt-auto pt-10">
          {/* Subtitle no mobile: aparece aqui, acima dos avatares */}
          <Reveal delay={0.6} className="mx-auto max-w-xl md:hidden">
            <EditableText path="subtitle" value={subtitle} as="p" singleLine={false} className="text-center text-base leading-relaxed text-white/90" style={subSize} />
          </Reveal>

          {/* CTA + subtitle: no desktop/tablet aparecem aqui, acima dos avatares */}
          <Reveal delay={0.5} className="hidden md:block">
            <div className="flex justify-center">
              {editing ? (
                <span className="btn-brand inline-block" style={ctaSize}>
                  <EditableText path="ctaLabel" value={ctaLabel} as="span" />
                </span>
              ) : (
                <Link to="/reservation" className="btn-brand" style={ctaSize}>
                  {ctaLabel}
                </Link>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.6} className="mx-auto mt-6 max-w-xl hidden md:block">
            <EditableText path="subtitle" value={subtitle} as="p" singleLine={false} className="text-center text-base leading-relaxed text-white/90 md:text-lg" style={subSize} />
          </Reveal>

          <div className="mt-8" />
          <Reveal delay={0.7}>
            <div className="flex flex-col items-center justify-center gap-3 px-4 text-center md:flex-row md:gap-4">
              <div className="flex -space-x-3">
                {avatars.map((src, i) => (
                  <EditableImage
                    key={src + i}
                    path={`images.avatar${i + 1}`}
                    value={src}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className="h-9 w-9 rounded-full border-2 border-[#f5f0e6]/20 object-cover"
                    wrapperStyle={{ zIndex: avatars.length - i }}
                  />
                ))}
              </div>
              <p
                className="text-sm text-white/90 md:text-base [&_b]:font-bold"
                dangerouslySetInnerHTML={{ __html: t("sections.hero.social") }}
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
