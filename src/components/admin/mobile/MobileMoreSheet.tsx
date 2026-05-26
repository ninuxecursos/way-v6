/**
 * Bottom sheet acionado pelo botão "Mais" da bottom navigation.
 * Mostra todos os itens que não cabem nos 4 atalhos fixos.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, UserCircle } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { ADMIN_NAV, BOTTOM_NAV, isActivePath } from "./admin-nav";

export function MobileMoreSheet({
  open,
  onOpenChange,
  currentPath,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentPath: string;
}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const close = () => onOpenChange(false);
  const fixed = new Set(BOTTOM_NAV.map((i) => i.to));
  // Agrupado por seção — só remove itens que já estão na bottom-nav fixa
  const groups = ADMIN_NAV
    .map((g) => ({ label: g.label, items: g.items.filter((i) => !fixed.has(i.to)) }))
    .filter((g) => g.items.length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        data-admin="true"
        className="p-0 h-[90vh] max-h-[90vh] rounded-t-2xl bg-[var(--admin-sidebar)] text-[var(--admin-sidebar-fg)] border-t border-[var(--admin-sidebar-border)] [&>button]:hidden flex flex-col"
      >
        <div className="shrink-0">
          <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
          <div className="px-4 pt-2 pb-3 border-b border-[var(--admin-sidebar-border)]">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mais opções
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <Link
            to="/conta"
            onClick={close}
            className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--admin-sidebar-border)] bg-card/40 px-4 py-3 hover:bg-[var(--admin-sidebar-active)]/60 transition-colors"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
              <UserCircle className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-foreground">Minha conta</span>
              <span className="block text-[11.5px] text-muted-foreground">Acessar área do cliente</span>
            </span>
          </Link>
          {groups.map((group) => (
            <section key={group.label} className="mb-4 last:mb-0">
              <h3 className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {group.label}
              </h3>
              <ul className="grid grid-cols-3 gap-2">
                {group.items.map((item) => {
                  const active = isActivePath(currentPath, item.to);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={close}
                        className={[
                          "flex flex-col items-center justify-center gap-1.5 rounded-xl border border-transparent p-3 min-h-[88px] text-center transition-colors",
                          active
                            ? "bg-[var(--admin-sidebar-active)] text-foreground"
                            : "bg-card/40 text-[var(--admin-sidebar-fg)] hover:bg-[var(--admin-sidebar-active)]/60 hover:text-foreground",
                        ].join(" ")}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[11px] leading-tight font-medium line-clamp-2">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
        <div
          className="shrink-0 border-t border-[var(--admin-sidebar-border)] px-3 py-2 bg-[var(--admin-sidebar)]"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
        >
          <button
            type="button"
            onClick={async () => {
              try { await signOut(); } catch (e) { console.error("[admin/signout]", e); }
              close();
              navigate({ to: "/" });
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl p-3 min-h-[48px] bg-destructive/10 text-destructive hover:bg-destructive/15 transition-colors font-medium text-sm"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}