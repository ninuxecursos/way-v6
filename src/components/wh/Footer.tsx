/**
 * Rodapé (Footer) institucional Way Home.
 * Multi-coluna em desktop, empilhado e elegante em mobile.
 */
import { Instagram, Mail, MessageCircle, MapPin, ShieldCheck, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useT } from "@/components/i18n/LocaleProvider";
import { Logo } from "@/components/branding/Logo";

const WHATSAPP_URL = "https://wa.me/5511992012731?text=Ol%C3%A1!%20Gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20os%20pacotes%20Way%20Home.";
const RILIV_WHATSAPP_URL = "https://wa.me/5511963512105?text=Ol%C3%A1%2C%20Rick!%20Gostaria%20de%20solicitar%20um%20or%C3%A7amento%20para%20um%20site%20premium.%20Pode%20me%20ajudar%3F";

export function Footer() {
  const t = useT();
  const year = new Date().getFullYear();
  const NAV: Record<string, Array<{ label: string; to?: "/" | "/blog" | "/privacidade" | "/termos" | "/direito-de-imagem" | "/cookies" | "/contato"; href?: string; external?: boolean }>> = {
    [t("footer.company")]: [
      { label: t("footer.home"), to: "/" },
      { label: t("footer.blog"), to: "/blog" },
    ],
    [t("footer.support")]: [
      { label: t("footer.talkToUs"), to: "/contato" },
      { label: t("footer.email"), href: "mailto:wayhomeoficial@gmail.com", external: true },
      { label: t("footer.instagram"), href: "https://www.instagram.com/wayhomeoficial/", external: true },
    ],
    [t("footer.legal")]: [
      { label: t("footer.privacy"), to: "/privacidade" },
      { label: t("footer.terms"), to: "/termos" },
      { label: t("footer.imageRights"), to: "/direito-de-imagem" },
      { label: t("footer.cookies"), to: "/cookies" },
    ],
  };
  return (
    <footer
      id="contato"
      className="relative overflow-hidden border-t border-line bg-background text-ink"
    >
      {/* Glow accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 85% 0%, rgba(255,25,94,0.18), transparent 60%), radial-gradient(50% 40% at 0% 100%, rgba(108,16,199,0.14), transparent 60%)",
        }}
      />

      <div className="container-wh relative">
        {/* Top: brand + CTA */}
        <div className="grid gap-10 py-14 md:grid-cols-12 md:py-20">
          {/* Brand */}
          <div className="md:col-span-5 lg:col-span-4">
            <Link to="/" className="inline-flex items-center" aria-label="Way Home">
              <Logo slot="footer" height={56} className="md:h-16" />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-soft">
              {t("footer.description")}
            </p>

            <Link
              to="/contato"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-xs font-bold uppercase tracking-widest text-brand-foreground shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--brand)_60%,transparent)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)]"
            >
              <MessageCircle size={14} />
              {t("footer.ctaWhatsApp")}
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {/* Right column: nav + trust card stacked */}
          <div className="md:col-span-7 lg:col-span-8">
            <nav className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:gap-10">
              {Object.entries(NAV).map(([heading, items]) => (
                <div key={heading}>
                  <h3 className="mb-4 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
                    {heading}
                  </h3>
                  <ul className="space-y-3 text-sm">
                    {items.map((item) =>
                      item.to ? (
                        <li key={item.label}>
                          <Link
                            to={item.to}
                            className="text-ink-soft transition-colors hover:text-ink"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ) : (
                        <li key={item.label}>
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-ink-soft transition-colors hover:text-ink"
                          >
                            {item.label}
                            <ArrowUpRight size={12} className="opacity-60" />
                          </a>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              ))}
            </nav>

            {/* Trust card — abaixo das 3 colunas, ocupando toda a largura */}
            <div className="mt-8 rounded-2xl border border-line bg-surface/60 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-ink-soft">
                    <ShieldCheck size={14} className="text-brand" />
                    {t("footer.trustBadgeTitle")}
                  </div>
                  <p className="mt-2 font-display text-lg font-bold leading-tight">
                    {t("footer.trustBadgeName")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                    {t("footer.trustBadgeDesc")}
                  </p>
                </div>
                <div className="flex items-start gap-2 text-xs text-ink-soft sm:shrink-0">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-brand" />
                  <span>{t("footer.trustBadgeArea")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center gap-5 border-t border-line py-6 text-xs text-ink-soft md:flex-row md:justify-between">
          <p className="order-2 text-center md:order-1 md:text-left">
            © {year} Way Home. {t("footer.rights")}.
          </p>

          <div className="order-1 flex items-center gap-2 md:order-2">
            <a
              href="https://www.instagram.com/wayhomeoficial/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink-soft transition hover:-translate-y-0.5 hover:border-brand hover:text-brand"
            >
              <Instagram size={15} />
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink-soft transition hover:-translate-y-0.5 hover:border-brand hover:text-brand"
            >
              <MessageCircle size={15} />
            </a>
            <a
              href="mailto:wayhomeoficial@gmail.com"
              aria-label="E-mail"
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink-soft transition hover:-translate-y-0.5 hover:border-brand hover:text-brand"
            >
              <Mail size={15} />
            </a>
          </div>

          <p className="order-3 text-center text-[11px] uppercase tracking-widest md:text-right">
            {t("footer.brandTag")}
          </p>
        </div>

        <div className="mt-4 border-t border-line/60 pb-6 pt-4 text-center text-[11px] text-ink-soft">
          {t("footer.developedBy")}{" "}
          <a
            href={RILIV_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-ink transition hover:text-brand"
          >
            RILIV
          </a>
          
        </div>
      </div>
    </footer>
  );
}
