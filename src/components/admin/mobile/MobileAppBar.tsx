/**
 * App bar fixa do shell mobile do admin.
 * Botão de menu (hamburger), logo, título da rota atual e ações.
 */
import { Menu, ExternalLink } from "lucide-react";
import { Logo } from "@/components/branding/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/account/NotificationBell";
import { LocaleSelector } from "@/components/i18n/LocaleSelector";

export function MobileAppBar({
  onOpenMenu,
  title,
}: {
  onOpenMenu: () => void;
  title?: string;
}) {
  return (
    <header
      className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex h-14 items-center gap-2 px-3">
        <button
          type="button"
          onClick={onOpenMenu}
          className="grid h-10 w-10 place-items-center rounded-lg text-foreground hover:bg-accent active:scale-[0.96] transition-transform"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Logo slot="admin" height={22} />
          {title && (
            <span className="text-sm font-medium text-muted-foreground truncate hidden xs:inline">
              · {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Ver site"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <NotificationBell />
          <LocaleSelector compact />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}