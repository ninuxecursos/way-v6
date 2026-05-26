import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

/**
 * Protege o conteúdo: redireciona para /login?redirect=<rota atual> se não houver sessão.
 * Usa o estado do AuthProvider client-side (evita 401 de SSR em serverFns protegidas).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const redirect = location.href || "/";
      navigate({
        to: "/login",
        search: { redirect },
        replace: true,
      });
    }
  }, [loading, user, navigate, location.href]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span className="text-sm">Verificando sua conta…</span>
      </div>
    );
  }

  return <>{children}</>;
}