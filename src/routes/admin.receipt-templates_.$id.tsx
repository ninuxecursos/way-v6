import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { previewReceiptTemplate } from "@/lib/receipts.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Monitor, RefreshCw, Save, Smartphone, FileText as FileIcon } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";

export const Route = createFileRoute("/admin/receipt-templates_/$id")({ component: Editor });

function Editor() {
  const { id } = Route.useParams();
  const previewFn = useServerFn(previewReceiptTemplate);
  const [t, setT] = useState<any>(null);
  const [preview, setPreview] = useState<string>("");
  const [device, setDevice] = useState<"desktop" | "mobile" | "a4">("desktop");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    supabase.from("receipt_templates").select("*").eq("id", id).single().then(({ data }) => setT(data));
  }, [id]);

  const doPreview = async () => {
    if (!t) return;
    setLoadingPreview(true);
    try {
      const res = await previewFn({ data: { html: t.html_template, css: t.css_styles ?? "" } as any });
      setPreview(res.html);
    } catch (e) { notifyError(e); } finally { setLoadingPreview(false); }
  };

  // Auto-preview: ao carregar e a cada alteração (debounced) quando autoRefresh ativo.
  useEffect(() => {
    if (!t || !autoRefresh) return;
    const h = setTimeout(() => { doPreview(); }, 600);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t?.html_template, t?.css_styles, autoRefresh]);

  if (!t) return <div className="p-8">Carregando...</div>;

  const save = async () => {
    const { error } = await supabase.from("receipt_templates").update({
      name: t.name, html_template: t.html_template, css_styles: t.css_styles, paper_size: t.paper_size,
    }).eq("id", id);
    if (error) notifyError(error); else notifySuccess("Salvo!");
  };

  const frameWidth = useMemo(() => device === "mobile" ? 390 : device === "a4" ? 794 : "100%", [device]);
  const frameHeight = useMemo(() => device === "mobile" ? 780 : device === "a4" ? 1123 : 700, [device]);

  return (
    <div className="p-8 max-w-7xl">
      <Link to="/admin/receipt-templates" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t.name}</h1>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-preview
          </label>
          <Button variant="outline" onClick={doPreview} disabled={loadingPreview}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingPreview ? "animate-spin" : ""}`} />
            Atualizar preview
          </Button>
          <Button onClick={save}><Save className="h-4 w-4 mr-2" />Salvar</Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div><Label>Nome</Label><Input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} /></div>
        <div><Label>Tamanho do papel</Label>
          <select className="border rounded h-10 w-full px-3" value={t.paper_size ?? "A4"} onChange={(e) => setT({ ...t, paper_size: e.target.value })}>
            <option value="A4">A4</option><option value="Letter">Letter</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <Label>HTML</Label>
            <textarea className="w-full font-mono text-xs border rounded p-2 h-96"
              value={t.html_template} onChange={(e) => setT({ ...t, html_template: e.target.value })} />
          </div>
          <div>
            <Label>CSS</Label>
            <textarea className="w-full font-mono text-xs border rounded p-2 h-48"
              value={t.css_styles ?? ""} onChange={(e) => setT({ ...t, css_styles: e.target.value })} />
          </div>
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <strong>Variáveis:</strong> <code>{"{{receipt.number}}"}</code>, <code>{"{{receipt.issued_at}}"}</code>, <code>{"{{receipt.verification_hash}}"}</code>, <code>{"{{customer.name}}"}</code>, <code>{"{{customer.email}}"}</code>, <code>{"{{order.total}}"}</code>, <code>{"{{order.currency}}"}</code>, <code>{"{{order.paid_at}}"}</code>, <code>{"{{order.payment_provider}}"}</code>.<br/>
            Itens em loop: <code>{"{{#each items}}…{{/each}}"}</code> com <code>{"{{this.description}}"}</code>, <code>{"{{this.quantity}}"}</code>, <code>{"{{this.unit_price}}"}</code>, <code>{"{{this.total}}"}</code>.
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label>Pré-visualização (com dados de exemplo)</Label>
            <div className="inline-flex rounded-md border overflow-hidden text-xs">
              <button type="button" onClick={() => setDevice("desktop")} className={`px-2.5 py-1 inline-flex items-center gap-1 ${device === "desktop" ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                <Monitor className="h-3 w-3" /> Desktop
              </button>
              <button type="button" onClick={() => setDevice("a4")} className={`px-2.5 py-1 inline-flex items-center gap-1 border-l ${device === "a4" ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                <FileIcon className="h-3 w-3" /> A4
              </button>
              <button type="button" onClick={() => setDevice("mobile")} className={`px-2.5 py-1 inline-flex items-center gap-1 border-l ${device === "mobile" ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                <Smartphone className="h-3 w-3" /> Mobile
              </button>
            </div>
          </div>
          <div className="border rounded bg-muted/30 overflow-auto flex justify-center p-3" style={{ height: 720 }}>
            <iframe
              title="preview"
              srcDoc={preview || "<div style='padding:40px;color:#999;font-family:sans-serif'>Carregando preview...</div>"}
              style={{ width: frameWidth, height: frameHeight, border: "1px solid hsl(var(--border))", background: "white", borderRadius: 4 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}