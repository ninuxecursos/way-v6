/**
 * Layout de Configurações: navegação por abas (Geral / Branding) + Outlet.
 */
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
 import { Settings, Palette, Database, Images, LayoutTemplate, Plug, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsLayout,
});

const TABS = [
   { to: "/admin/settings", label: "Geral", icon: Settings, exact: true },
   { to: "/admin/settings/branding", label: "Branding", icon: Palette, exact: false },
   { to: "/admin/settings/gallery", label: "Galeria", icon: Images, exact: false },
   { to: "/admin/settings/page-images", label: "Imagens das páginas", icon: LayoutTemplate, exact: false },
   { to: "/admin/settings/integrations", label: "Integrações", icon: Plug, exact: false },
   { to: "/admin/settings/seo", label: "SEO", icon: Search, exact: false },
   { to: "/admin/settings/backup", label: "Backup", icon: Database, exact: false },
] as const;

function SettingsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string, exact: boolean) =>
    exact ? path === to : path === to || path.startsWith(to + "/");

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background">
        <div className="px-8 pt-6 pb-3">
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ajustes globais do site, identidade visual e integrações.
          </p>
        </div>
        <nav className="px-8 flex items-center gap-1" aria-label="Sub-navegação">
          {TABS.map((t) => {
            const active = isActive(t.to, t.exact);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
                  active
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
