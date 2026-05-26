import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, ShoppingBag, User, Shield, LogOut, Lock, Bell, LayoutDashboard, MoreHorizontal, ChevronRight, Users, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { InstallPrompt } from "./InstallPrompt";
import { InstallAppButton } from "./InstallAppButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { LocaleSelector } from "@/components/i18n/LocaleSelector";
import { useT } from "@/components/i18n/LocaleProvider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Logo } from "@/components/branding/Logo";

type AccountPath =
  | "/conta"
  | "/conta/pedidos"
  | "/conta/perfil"
  | "/conta/seguranca"
  | "/conta/privacidade"
  | "/conta/notificacoes"
  | "/conta/grupos";

type NavEntry = { to: AccountPath; labelKey: string; icon: typeof Home; exact?: boolean };

/** Itens completos — usados na sidebar desktop e no sheet "Mais" do mobile. */
const NAV: NavEntry[] = [
  { to: "/conta", labelKey: "account.sidebar.home", icon: Home, exact: true },
  { to: "/conta/pedidos", labelKey: "account.sidebar.orders", icon: ShoppingBag },
  { to: "/conta/grupos", labelKey: "account.sidebar.groups", icon: Users },
  { to: "/conta/notificacoes", labelKey: "account.sidebar.notices", icon: Bell },
  { to: "/conta/perfil", labelKey: "account.sidebar.profile", icon: User },
  { to: "/conta/seguranca", labelKey: "account.sidebar.security", icon: Shield },
  { to: "/conta/privacidade", labelKey: "account.sidebar.privacy", icon: Lock },
];

/** 4 itens primários do bottom nav mobile. O 5º slot é sempre "Mais". */
const MOBILE_PRIMARY: NavEntry[] = [
  { to: "/conta", labelKey: "account.sidebar.home", icon: Home, exact: true },
  { to: "/conta/pedidos", labelKey: "account.sidebar.orders", icon: ShoppingBag },
  { to: "/conta/notificacoes", labelKey: "account.sidebar.notices", icon: Bell },
  { to: "/conta/perfil", labelKey: "account.sidebar.profile", icon: User },
];

const MOBILE_PRIMARY_PATHS = new Set<string>(MOBILE_PRIMARY.map((i) => i.to));

export function AccountLayout() {
  const { user, signOut, isAdmin } = useAuth();
  const t = useT();
  const loc = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (to: string, exact?: boolean) =>
    exact ? loc.pathname === to : loc.pathname === to || loc.pathname.startsWith(to + "/");

  const handleSignOut = async () => {
    setMoreOpen(false);
    await signOut();
    window.__showRouteLoading?.(); navigate({ to: "/login" });
  };

  const initials = (user?.user_metadata?.display_name || user?.email || "?")
    .toString().split(/\s+/).map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  /** "Mais" fica ativo quando estamos numa rota /conta/* fora dos 4 primários. */
  const moreActive = loc.pathname.startsWith("/conta") && !MOBILE_PRIMARY.some((i) => isActive(i.to, i.exact));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile header — limpo: logo + sino + avatar */}
      <header
        className="md:hidden sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border px-4 h-14 flex items-center justify-between"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <Link to="/conta" className="flex items-center" aria-label="Way Home">
          <Logo slot="mobileHeader" height={28} />
        </Link>
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          <div
            className="grid h-9 w-9 place-items-center rounded-full bg-brand text-brand-foreground text-xs font-bold ring-2 ring-background"
            aria-hidden
          >
            {initials}
          </div>
        </div>
      </header>

      {/* Desktop sidebar — sticky em altura de viewport para que o rodapé
          (Instalar App / Voltar / Sair) NUNCA role com a página. */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-card text-foreground sticky top-0 self-start h-screen">
        <div className="px-6 py-6 border-b border-border flex items-start justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <Link to="/" className="block">
              <Logo slot="admin" height={28} />
            </Link>
            <p className="mt-2 text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
        <div className="px-3 pt-3 shrink-0">
          <LocaleSelector />
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.exact);
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}>
                <Icon size={18} />
                {t(item.labelKey)}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-brand/10 text-brand hover:bg-brand hover:text-brand-foreground transition-colors"
            >
              <LayoutDashboard size={18} />
              {t("account.sidebar.adminPanel")}
            </Link>
          )}
        </nav>
        {/* Rodapé fixo do sidebar — sempre visível, fora do scroll. */}
        <div className="shrink-0 border-t border-border bg-card">
          <InstallAppButton variant="sidebar" />
          <Link
            to="/"
            className="mx-3 mt-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft size={18} />
            {t("account.sidebar.backToSite")}
          </Link>
          <button onClick={handleSignOut}
            className="m-3 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer">
            <LogOut size={18} />
            {t("account.sidebar.logout")}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-0">
        <div className="container max-w-4xl mx-auto px-4 py-6 md:py-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav — 5 slots fixos: 4 atalhos + Mais */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        role="navigation"
        aria-label={t("account.sidebar.home")}
      >
        <ul className="grid grid-cols-5 h-[68px] px-1">
          {MOBILE_PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.exact);
            return (
              <li key={item.to} className="flex">
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className="relative flex-1 flex flex-col items-center justify-center gap-1 group"
                >
                  {/* Indicador superior */}
                  <span
                    className={`absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all ${
                      active ? "w-8 bg-brand" : "w-0 bg-transparent"
                    }`}
                  />
                  <span
                    className={`grid place-items-center h-7 w-12 rounded-full transition-colors ${
                      active ? "bg-brand/12 text-brand" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
                  </span>
                  <span
                    className={`text-[11px] leading-none transition-colors ${
                      active ? "text-brand font-semibold" : "text-muted-foreground font-medium"
                    }`}
                  >
                    {t(item.labelKey)}
                  </span>
                </Link>
              </li>
            );
          })}

          {/* Slot "Mais" — abre sheet com itens secundários */}
          <li className="flex">
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-current={moreActive ? "page" : undefined}
                  className="relative flex-1 flex flex-col items-center justify-center gap-1 group"
                >
                  <span
                    className={`absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all ${
                      moreActive ? "w-8 bg-brand" : "w-0 bg-transparent"
                    }`}
                  />
                  <span
                    className={`grid place-items-center h-7 w-12 rounded-full transition-colors ${
                      moreActive ? "bg-brand/12 text-brand" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <MoreHorizontal size={20} strokeWidth={moreActive ? 2.4 : 1.9} />
                  </span>
                  <span
                    className={`text-[11px] leading-none transition-colors ${
                      moreActive ? "text-brand font-semibold" : "text-muted-foreground font-medium"
                    }`}
                  >
                    {t("account.sidebar.more")}
                  </span>
                </button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="rounded-t-2xl border-t border-border bg-card p-0 max-h-[85vh] overflow-auto"
              >
                <SheetHeader className="px-5 pt-5 pb-3 text-left">
                  <SheetTitle className="text-lg">{t("account.more.title")}</SheetTitle>
                </SheetHeader>

                {/* Identidade do usuário */}
                <div className="mx-5 mb-4 flex items-center gap-3 rounded-xl border border-border bg-background/50 px-4 py-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-brand text-brand-foreground text-sm font-bold">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {user?.user_metadata?.display_name || user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>

                {/* Instalar app — destacado */}
                <div className="mx-5 mb-4">
                  <InstallAppButton variant="featured" />
                </div>

                {/* Itens secundários */}
                <div className="px-3 pb-2">
                  {NAV.filter((i) => !MOBILE_PRIMARY_PATHS.has(i.to)).map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to, item.exact);
                    return (
                      <SheetClose asChild key={item.to}>
                        <Link
                          to={item.to}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-[15px] font-medium transition-colors ${
                            active
                              ? "bg-brand/10 text-brand"
                              : "text-foreground hover:bg-accent"
                          }`}
                        >
                          <Icon size={20} className="shrink-0" />
                          <span className="flex-1">{t(item.labelKey)}</span>
                          <ChevronRight size={16} className="text-muted-foreground" />
                        </Link>
                      </SheetClose>
                    );
                  })}
                  {isAdmin && (
                    <SheetClose asChild>
                      <Link
                        to="/admin"
                        className="flex items-center gap-3 px-3 py-3 rounded-lg text-[15px] font-semibold text-brand hover:bg-brand/10"
                      >
                        <LayoutDashboard size={20} className="shrink-0" />
                        <span className="flex-1">{t("account.sidebar.adminPanel")}</span>
                        <ChevronRight size={16} />
                      </Link>
                    </SheetClose>
                  )}
                </div>

                {/* Preferências */}
                <div className="border-t border-border mt-2 px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Tema</span>
                    <ThemeToggle />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Idioma</span>
                    <LocaleSelector compact />
                  </div>
                </div>

                {/* Sair */}
                <div className="border-t border-border px-3 py-3">
                  <SheetClose asChild>
                    <Link
                      to="/"
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[15px] font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      <ArrowLeft size={20} />
                      {t("account.sidebar.backToSite")}
                    </Link>
                  </SheetClose>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[15px] font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut size={20} />
                    {t("account.sidebar.logout")}
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </li>
        </ul>
      </nav>

      <InstallPrompt />
    </div>
  );
}
