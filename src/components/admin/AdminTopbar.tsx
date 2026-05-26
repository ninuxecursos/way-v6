import { ExternalLink, UserRound } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/account/NotificationBell";
import { LocaleSelector } from "@/components/i18n/LocaleSelector";

export function AdminTopbar() {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-full items-center gap-3 px-4">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
        <div className="h-5 w-px bg-border" />
        <div className="min-w-0 flex-1">
          <Breadcrumbs />
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/conta"
            className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <UserRound className="h-3.5 w-3.5" />
            Minha conta
          </Link>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver site
          </a>
          <NotificationBell />
          <LocaleSelector compact />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}