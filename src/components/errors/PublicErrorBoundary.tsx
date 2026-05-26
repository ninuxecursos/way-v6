import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { getUserMessage } from "@/lib/errors";

type Props = {
  error: Error;
  reset: () => void;
  /** Rótulo do botão de "voltar". Default: "Ir para o início" */
  homeLabel?: string;
  /** Destino do botão de "voltar". Default: "/" */
  homeTo?: string;
  /** Título do fallback. */
  title?: string;
};

/**
 * Fallback para rotas públicas (checkout, blog, recibo, avaliar).
 * Mostra mensagem amigável + ações de retomar/voltar.
 */
export function PublicErrorBoundary({
  error,
  reset,
  homeLabel = "Ir para o início",
  homeTo = "/",
  title = "Não foi possível carregar esta página",
}: Props) {
  // eslint-disable-next-line no-console
  console.error("[public-route]", error);
  const router = useRouter();
  const message = getUserMessage(error);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="max-w-md text-center space-y-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-center gap-2 pt-2">
          <Button onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</Button>
          <Button variant="outline" asChild>
            <Link to={homeTo}>{homeLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}