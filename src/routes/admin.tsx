import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { AdminMobileShell } from "@/components/admin/mobile/AdminMobileShell";
import { useIsMobile } from "@/hooks/use-mobile";

const AUTH_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: PromiseLike<T>, ms = AUTH_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("auth-timeout")), ms)),
  ]);
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  const { data, error } = await withTimeout(supabase.auth.getUser());
  if (error) return null;
  return data.user?.id ?? null;
}

async function validateAdminAccess(userId: string): Promise<boolean | null> {
  try {
    const { data, error } = await withTimeout(supabase.rpc("is_admin", { _user_id: userId }));
    if (error) {
      console.error("[admin] Falha ao validar papel admin:", error);
      return null;
    }
    return !!data;
  } catch (error) {
    console.error("[admin] Timeout ao validar papel admin:", error);
    return null;
  }
}

function AdminErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div data-admin="true" className="admin-shell flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h1 className="text-xl font-semibold">Erro no painel</h1>
        <p className="text-sm text-muted-foreground">{error.message || "Falha inesperada."}</p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</Button>
          <Button variant="outline" asChild><Link to="/admin">Voltar ao painel</Link></Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    // Segurança por ocultação: no SSR (e para qualquer crawler) redirecionamos
    // para a home — nunca renderizamos shell admin sem sessão validada.
    // No client, validamos sessão + papel admin. Qualquer falha → home,
    // sem revelar que existe um painel admin.
    if (typeof window === "undefined") throw redirect({ to: "/" });
    const userId = await getAuthenticatedUserId();
    if (!userId) throw redirect({ to: "/" });

    const isAdmin = await validateAdminAccess(userId);
    if (isAdmin !== true) throw redirect({ to: "/" });
    return { adminVerified: true };
  },
  head: () => ({
    meta: [
      { title: "Admin — Way Home" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
  errorComponent: AdminErrorComponent,
});

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const { adminVerified } = Route.useRouteContext() as { adminVerified?: boolean };
  const canRenderAdmin = isAdmin || !!adminVerified;
  const isMobile = useIsMobile();
  const branding = useBranding();

  // Sobrescreve o favicon e título da aba com o branding oficial
  // configurado no CMS (Admin → Configurações → Branding).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const href = branding.faviconUrl;
    if (!href) return;

    // Remove qualquer ícone pré-existente injetado pelo root e adiciona
    // um único <link rel="icon"> apontando para o favicon do CMS.
    const existing = document.head.querySelectorAll<HTMLLinkElement>(
      'link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="shortcut icon"]',
    );
    existing.forEach((el) => el.parentNode?.removeChild(el));

    const link = document.createElement("link");
    link.rel = "icon";
    link.href = href;
    document.head.appendChild(link);

    const apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    apple.href = href;
    document.head.appendChild(apple);

    return () => {
      link.parentNode?.removeChild(link);
      apple.parentNode?.removeChild(apple);
    };
  }, [branding.faviconUrl]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const name = branding.siteName || "Way Home";
    document.title = `Admin — ${name}`;
  }, [branding.siteName]);

  if (loading || !user || !canRenderAdmin) {
    // Defense-in-depth: se cair aqui (beforeLoad já cobre o caso normal),
    // não renderiza nada — evita flash de shell admin para visitante anônimo.
    return null;
  }

  if (isMobile) {
    return (
      <div data-admin="true" className="admin-shell">
        <AdminMobileShell>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </AdminMobileShell>
      </div>
    );
  }

  return (
    <div data-admin="true" className="admin-shell min-h-screen">
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AdminSidebar />
          <SidebarInset className="flex-1 min-w-0 bg-background">
            <AdminTopbar />
            <main className="flex-1 overflow-auto">
              <ErrorBoundary>
                <div className="p-6">
                  <Outlet />
                </div>
              </ErrorBoundary>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}