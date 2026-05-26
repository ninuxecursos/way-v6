/**
 * Header redesign — desktop com pill-nav central, mobile com trigger circular
 * que abre <MobileMenu /> fullscreen.
 */
import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/components/i18n/LocaleProvider";
import { LocaleSelector } from "@/components/i18n/LocaleSelector";
import { Logo } from "@/components/branding/Logo";
import { MobileMenu } from "./MobileMenu";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useIsMobile } from "@/hooks/use-mobile";

export function Header({ variant }: { variant?: "light" | "dark" } = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const t = useT();
  const location = useLocation();
  const { resolved } = useTheme();
  const isMobile = useIsMobile();

  // Em rotas que NÃO são a home, hashes precisam apontar para "/#..." para voltar à home antes de rolar.
  const isHome = location.pathname === "/";
  const hash = (id: string) => (isHome ? `#${id}` : `/#${id}`);

  // Estrutura escalável: cada item pode futuramente receber `children` para virar dropdown/mega-menu.
  const navItems: { label: string; href: string }[] = [
    { label: t("header.experience"), href: hash("experiencia") },
    { label: t("header.lodging"), href: hash("hospedagem") },
    { label: t("header.gallery"), href: "/galeria" },
    { label: t("header.blog"), href: "/blog" },
    { label: t("header.faq"), href: "/faq" },
    { label: t("header.feedback"), href: hash("feedback") },
    { label: t("header.contact"), href: "/contato" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // No topo da página o header é claro (fundo claro + texto/logo escuros).
  // Ao rolar, inverte para fundo escuro com texto/logo claros, em todos os tamanhos de tela.
  // Override opcional via prop `variant`.
  void resolved; void isMobile;
  const dark = variant ? variant === "dark" : scrolled;

  const isActive = (href: string) => {
    if (href.startsWith("/") && !href.includes("#")) {
      return location.pathname === href || location.pathname.startsWith(href + "/");
    }
    return false;
  };

  return (
    <>
      <header
        className={[
          "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ease-out",
          dark
            ? "bg-[#0b0b0b]/75 backdrop-blur-xl backdrop-saturate-150 border-b border-white/10 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.5)]"
            : "bg-white/80 backdrop-blur-xl backdrop-saturate-150 border-b border-black/10 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.12)]",
        ].join(" ")}
      >
        <div
          className={[
            "w-full grid grid-cols-[auto_1fr_auto] items-center gap-3 lg:gap-6 transition-[height] duration-300 ease-out px-4 md:px-6 lg:px-8",
            "h-16",
            scrolled ? "md:h-16" : "md:h-20",
          ].join(" ")}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0" aria-label="Way Home">
            {dark ? (
              <Logo
                slot="headerDark"
                height={28}
                className={["md:transition-all md:duration-300", scrolled ? "md:h-7" : "md:h-9"].join(" ")}
              />
            ) : (
              <Logo
                slot="headerLight"
                height={28}
                className={["md:transition-all md:duration-300", scrolled ? "md:h-7" : "md:h-9"].join(" ")}
              />
            )}
          </Link>

          {/* Desktop nav — centralizada no grid, com underline animado por item */}
          <nav
            aria-label="Principal"
            className={[
              "hidden md:flex justify-self-center items-center gap-2 lg:gap-4 rounded-full px-4 py-2 transition-colors duration-300",
              dark
                ? "bg-white/[0.04] border border-white/10"
                : "bg-black/[0.03] border border-black/10",
            ].join(" ")}
          >
            {navItems.map((item) => {
              const active = isActive(item.href);
              // Em tablet (md), escondemos os 2 últimos itens (Feedback/Contato) para evitar aperto.
              // Eles continuam acessíveis pelo menu mobile e no rodapé.
              const isSecondary = item.href.endsWith("#feedback") || item.href.endsWith("#contato");
              const baseCls = [
                "group relative rounded-full px-2.5 lg:px-4 py-2 text-[12px] lg:text-[13px] font-medium tracking-[0.01em] whitespace-nowrap transition-colors duration-200",
                isSecondary ? "hidden lg:inline-flex items-center" : "",
                dark
                  ? "text-white/75 hover:text-brand"
                  : "text-black/70 hover:text-brand",
              ].join(" ");
              return (
                <a key={item.href} href={item.href} className={baseCls}>
                  <span>{item.label}</span>
                  <span
                    aria-hidden
                    className={[
                      "pointer-events-none absolute left-2.5 lg:left-4 right-2.5 lg:right-4 bottom-1 h-px origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100",
                      dark ? "bg-brand" : "bg-brand",
                      active ? "!scale-x-100 bg-brand" : "",
                    ].join(" ")}
                  />
                </a>
              );
            })}
          </nav>

          {/* Right cluster — desktop */}
          <div className="hidden md:flex justify-self-end items-center gap-3 lg:gap-5 shrink-0">
            <LocaleSelector compact light={!dark} />
            <span
              className={["hidden lg:block h-6 w-px mx-1", dark ? "bg-white/15" : "bg-black/15"].join(" ")}
              aria-hidden
            />
            <Link
              to={user ? "/conta" : "/login"}
              aria-label={user ? t("header.myAccount") : t("header.signIn")}
              title={user ? t("header.myAccount") : t("header.signIn")}
              className={[
                "inline-flex items-center gap-1.5 h-9 lg:h-10 px-3.5 lg:px-4 rounded-full text-[12px] lg:text-[12.5px] font-semibold tracking-wide transition-all duration-200 hover:-translate-y-0.5",
                "border border-brand/50 text-brand bg-transparent hover:bg-brand/10 hover:border-brand",
              ].join(" ")}
            >
              <User size={15} />
              <span>{user ? t("header.myAccount") : t("header.signIn")}</span>
            </Link>
            {!user && (
              <Link
                to="/signup"
                aria-label={t("header.signUp")}
                title={t("header.signUp")}
                className={[
                  "inline-flex items-center gap-1.5 h-9 lg:h-10 px-3.5 lg:px-4 rounded-full text-[12px] lg:text-[12.5px] font-semibold tracking-wide transition-all duration-200 hover:-translate-y-0.5",
                  "bg-brand text-brand-foreground border border-brand hover:bg-brand/90",
                  "shadow-[0_8px_24px_-10px_color-mix(in_oklab,var(--brand)_65%,transparent)] hover:shadow-[0_14px_32px_-12px_color-mix(in_oklab,var(--brand)_80%,transparent)]",
                ].join(" ")}
              >
                <span>{t("header.signUp")}</span>
              </Link>
            )}
          </div>

          {/* Mobile trigger */}
          <button
            aria-label={t("header.openMenu")}
            onClick={() => setMobileOpen(true)}
            className={[
              "justify-self-end grid h-11 w-11 place-items-center rounded-full transition-colors md:hidden",
              dark
                ? "bg-white/10 text-white active:bg-white/20"
                : "bg-black/[0.06] text-black active:bg-black/15",
            ].join(" ")}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} items={navItems} />
    </>
  );
}
