/**
 * Drawer de navegação completa do admin no mobile.
 * Slide-in pela esquerda, com agrupamento idêntico ao desktop.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Logo } from "@/components/branding/Logo";
import { useAuth } from "@/hooks/use-auth";
import { ADMIN_NAV, isActivePath } from "./admin-nav";

export function MobileNavDrawer({
  open,
  onOpenChange,
  currentPath,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentPath: string;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        data-admin="true"
        className="w-[86vw] max-w-[340px] p-0 [&>button]:hidden flex flex-col"
        style={{
          backgroundColor: "var(--admin-sidebar)",
          color: "var(--admin-sidebar-fg)",
          borderRight: "1px solid var(--admin-sidebar-border)",
        }}
      >
        {/* Header do drawer */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-[var(--admin-sidebar-border)]"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        >
          <Link to="/admin" onClick={close} className="flex items-center gap-2 min-w-0" aria-label="Way Home admin">
            <Logo slot="admin" height={26} />
          </Link>
          <button
            type="button"
            onClick={close}
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lista de navegação */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {ADMIN_NAV.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {group.label}
              </div>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isActivePath(currentPath, item.to);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={close}
                        className={[
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] transition-colors min-h-[48px]",
                          active
                            ? "bg-[var(--admin-sidebar-active)] text-foreground font-medium"
                            : "text-[var(--admin-sidebar-fg)] hover:bg-[var(--admin-sidebar-active)]/60 hover:text-foreground",
                        ].join(" ")}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer: usuário + sair */}
        <div
          className="border-t border-[var(--admin-sidebar-border)] px-3 py-3 flex items-center gap-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
        >
          <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-foreground text-sm font-semibold shrink-0">
            {(user?.email ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{user?.email ?? "—"}</div>
            <div className="text-xs text-muted-foreground">Administrador</div>
          </div>
          <button
            type="button"
            onClick={async () => {
              try { await signOut(); } catch (e) { console.error("[admin/signout]", e); }
              close();
              navigate({ to: "/" });
            }}
            className="grid h-10 w-10 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}