import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Download, MessageCircle, ShieldCheck } from "lucide-react";
import { PublicErrorBoundary } from "@/components/errors/PublicErrorBoundary";
import { getPublicReceipt } from "@/lib/receipts.functions";

export const Route = createFileRoute("/recibo/$number")({
  head: ({ params }) => ({ meta: [{ title: `Recibo ${params.number} — Way Home` }, { name: "robots", content: "noindex" }] }),
  component: ReceiptViewer,
  errorComponent: ({ error, reset }) => (
    <PublicErrorBoundary error={error} reset={reset} title="Erro ao carregar recibo" />
  ),
});

function ReceiptViewer() {
  const { number } = Route.useParams();
  const [html, setHtml] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const fetchReceipt = useServerFn(getPublicReceipt);

  // ?autoprint=1 abre o diálogo de impressão (Salvar como PDF) automaticamente.
  const autoPrint = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("autoprint") === "1";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const origin = window.location.origin;
        const res = await fetchReceipt({ data: { number, origin } });
        if (cancelled) return;
        if (!res.found) setNotFound(true); else setHtml(res.html);
      } catch (e) {
        if (cancelled) return;
        console.error("[recibo]", e);
        setNotFound(true);
      }
    })();
    return () => { cancelled = true; };
  }, [number, fetchReceipt]);

  // Após renderizar o iframe, dispara print no documento interno (preserva o CSS do template).
  useEffect(() => {
    if (!autoPrint || !html) return;
    const t = setTimeout(() => {
      try {
        const iframe = document.querySelector<HTMLIFrameElement>("iframe[title='recibo']");
        const w = iframe?.contentWindow;
        if (w) { w.focus(); w.print(); } else { window.print(); }
      } catch { window.print(); }
    }, 600);
    return () => clearTimeout(t);
  }, [autoPrint, html]);

  const shareWhatsApp = () => {
    const fullUrl = typeof window !== "undefined" ? window.location.origin + `/recibo/${number}` : "";
    const msg = `Segue o recibo Way Home Nº ${number}:\n${fullUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const downloadPdf = () => {
    try {
      const iframe = document.querySelector<HTMLIFrameElement>("iframe[title='recibo']");
      const w = iframe?.contentWindow;
      if (w) { w.focus(); w.print(); } else { window.print(); }
    } catch { window.print(); }
  };

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Recibo não encontrado.</p>
      </div>
    );
  }
  if (!html) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando recibo…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-brand" />
            <span className="text-muted-foreground">Recibo</span>
            <strong className="font-mono">{number}</strong>
            <span className="hidden sm:inline text-muted-foreground">· documento verificado</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={shareWhatsApp} className="text-[#128C7E] border-[#128C7E]/40 hover:bg-[#128C7E]/10">
              <MessageCircle className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Enviar no WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </Button>
            <Button size="sm" onClick={downloadPdf}>
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Baixar PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </div>
      </div>
      <iframe
        title="recibo"
        srcDoc={html}
        className="w-full"
        style={{ height: "calc(100vh - 56px)", border: 0, background: "white" }}
      />
    </div>
  );
}