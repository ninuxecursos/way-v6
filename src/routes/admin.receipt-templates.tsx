import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Plus } from "lucide-react";
import { previewReceiptTemplate } from "@/lib/receipts.functions";
import { notifyError, notifySuccess } from "@/lib/notify";

export const Route = createFileRoute("/admin/receipt-templates")({ component: List });

function List() {
  const previewFn = useServerFn(previewReceiptTemplate);
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [previewing, setPreviewing] = useState<{ name: string; html: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const load = () => supabase.from("receipt_templates").select("*").order("created_at").then(({ data }) => setItems(data ?? []));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { default_html, default_css } = await import("@/lib/receipt-defaults");
    const { data, error } = await supabase.from("receipt_templates").insert({
      name, slug, html_template: default_html, css_styles: default_css,
      is_default: items.length === 0,
    } as any).select().single();
    if (error) { notifyError(error); return; } notifySuccess("Template removido");
    if (data) window.location.assign(`/admin/receipt-templates/${data.id}`);
  };

  const setDefault = async (id: string) => {
    await supabase.from("receipt_templates").update({ is_default: false }).neq("id", id);
    await supabase.from("receipt_templates").update({ is_default: true }).eq("id", id);
    load();
  };

  const openPreview = async (t: any) => {
    setLoading(t.id);
    try {
      const res = await previewFn({ data: { html: t.html_template, css: t.css_styles ?? "" } as any });
      setPreviewing({ name: t.name, html: res.html });
    } catch (e) { notifyError(e); } finally { setLoading(null); }
  };

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Templates de Recibo</h1>
      <div className="flex gap-2 mb-6 p-4 bg-card border rounded-lg">
        <Input placeholder="Nome do template" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={create}><Plus className="h-4 w-4 mr-2" />Criar</Button>
      </div>
      <div className="space-y-2">
        {items.map((t) => (
          <div key={t.id} className="flex items-center justify-between p-4 bg-card border rounded-lg">
            <div>
              <Link to="/admin/receipt-templates/$id" params={{ id: t.id }} className="font-medium hover:underline">
                {t.name} {t.is_default && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">PADRÃO</span>}
              </Link>
              <div className="text-xs text-muted-foreground">/{t.slug}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openPreview(t)} disabled={loading === t.id}>
                <Eye className="h-3.5 w-3.5 mr-1.5" />{loading === t.id ? "Carregando..." : "Pré-visualizar"}
              </Button>
              {!t.is_default && <Button variant="outline" size="sm" onClick={() => setDefault(t.id)}>Definir como padrão</Button>}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted-foreground">Nenhum template ainda. O sistema usará um template embutido até você criar um.</p>}
      </div>

      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[88vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Pré-visualização — {previewing?.name}</DialogTitle>
          </DialogHeader>
          <iframe title="tpl-preview" srcDoc={previewing?.html ?? ""} className="w-full flex-1 bg-white" />
        </DialogContent>
      </Dialog>
    </div>
  );
}