/**
 * Bottom navigation app-native do admin.
 * 4 atalhos fixos + botão "Mais".
 */
import { Link } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import { BOTTOM_NAV, isActivePath } from "./admin-nav";

export function MobileBottomNav({
  currentPath,
  onOpenMore,
}: {
  currentPath: string;
  onOpenMore: () => void;
}) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Navegação principal"
    >
      <ul className="grid grid-cols-5 h-16">
        {BOTTOM_NAV.map((item) => {
          const active = isActivePath(currentPath, item.to);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={[
                  "relative h-full w-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-brand"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <item.icon className={["h-5 w-5", active ? "scale-110" : ""].join(" ")} />
                <span className="leading-none">{item.label}</span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-brand" aria-hidden />
                )}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onOpenMore}
            className="h-full w-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            aria-label="Mais opções"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="leading-none">Mais</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}