import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/branding/Logo";
import { ADMIN_NAV } from "@/components/admin/mobile/admin-nav";

export function AdminSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const isActive = (to: string) => {
    if (to === "/admin") return path === "/admin";
    return path === to || path.startsWith(to + "/");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar)] text-[var(--admin-sidebar-fg)]">
      <SidebarHeader className="px-4 py-4 border-b border-[var(--admin-sidebar-border)]">
        <Link to="/admin" className="flex items-center gap-2 min-w-0" aria-label="Way Home admin">
          {collapsed ? (
            <Logo slot="admin" height={26} />
          ) : (
            <div className="min-w-0 flex flex-col">
              <Logo slot="admin" height={26} />
              <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Painel admin</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 flex-1 min-h-0 overflow-y-auto">
        {ADMIN_NAV.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.to);
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link
                          to={item.to}
                          className={[
                            "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                            active
                              ? "bg-[var(--admin-sidebar-active)] text-foreground font-medium"
                              : "text-[var(--admin-sidebar-fg)] hover:bg-[var(--admin-sidebar-active)]/60 hover:text-foreground",
                          ].join(" ")}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--admin-sidebar-border)] p-3 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-foreground text-xs font-semibold shrink-0">
              {(user?.email ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{user?.email ?? "—"}</div>
              <div className="text-[10px] text-muted-foreground">Administrador</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                // fix(B2): tratar falha do logout — sempre navegar mesmo em erro.
                try { await signOut(); } catch (e) { console.error("[admin/signout]", e); }
                navigate({ to: "/" });
              }}
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={async () => {
              try { await signOut(); } catch (e) { console.error("[admin/signout]", e); }
              navigate({ to: "/" });
            }}
            className="grid h-8 w-8 mx-auto place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}