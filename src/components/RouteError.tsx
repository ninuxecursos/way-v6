import { useRouter, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AlertTriangle, SearchX, ShieldAlert, WifiOff } from "lucide-react";

type Kind = "not_found" | "forbidden" | "unauthorized" | "network" | "server";

function classify(error: any): Kind {
  const status = Number(error?.status ?? error?.statusCode ?? error?.cause?.status ?? 0);
  const code = String(error?.code ?? error?.cause?.code ?? "");
  const msg = String(error?.message ?? "").toLowerCase();

  if (status === 404 || code === "NOT_FOUND" || msg.includes("not found") || msg.includes("não encontrado")) return "not_found";
  if (status === 403 || code === "FORBIDDEN" || msg.includes("forbidden")) return "forbidden";
  if (status === 401 || code === "UNAUTHORIZED" || msg.includes("unauthorized")) return "unauthorized";
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed")) return "network";
  return "server";
}

const COPY: Record<Kind, { title: string; body: string; Icon: typeof AlertTriangle; tint: string }> = {
  not_found: {
    title: "Página não encontrada",
    body: "O endereço acessado não existe ou foi movido.",
    Icon: SearchX,
    tint: "bg-muted/60 text-foreground",
  },
  forbidden: {
    title: "Acesso negado",
    body: "Você não tem permissão para abrir esta página.",
    Icon: ShieldAlert,
    tint: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  unauthorized: {
    title: "Sessão expirada",
    body: "Faça login novamente para continuar.",
    Icon: ShieldAlert,
    tint: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  network: {
    title: "Sem conexão",
    body: "Verifique sua internet e tente novamente.",
    Icon: WifiOff,
    tint: "bg-muted/60 text-foreground",
  },
  server: {
    title: "Algo deu errado",
    body: "Não conseguimos carregar esta página agora. Tente novamente em alguns instantes.",
    Icon: AlertTriangle,
    tint: "bg-destructive/10 text-destructive",
  },
};

export function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const kind = classify(error);
  const { title, body, Icon, tint } = COPY[kind];

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5">
      <div className="max-w-md text-center">
        <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${tint}`}>
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        {import.meta.env.DEV && error?.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {kind === "unauthorized" ? (
            <Link
              to="/login"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Entrar
            </Link>
          ) : kind === "not_found" ? null : (
            <Button onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</Button>
          )}
          <Link to="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}