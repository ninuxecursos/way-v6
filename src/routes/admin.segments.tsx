import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listSegments, upsertSegment } from "@/lib/customers.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/segments")({ component: SegmentsPage });

function SegmentsPage() {
  const list = useServerFn(listSegments);
  const upsert = useServerFn(upsertSegment);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ slug: "", name: "", description: "", color: "#3b82f6" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await list();
      setRows(Array.isArray(r) ? r : []);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "Não foi possível carregar os segmentos.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const saveSegment = async () => {
    if (!form.slug || !form.name) return;
    setSaving(true);
    setError(null);
    try {
      await upsert({ data: form as any });
      setForm({ slug: "", name: "", description: "", color: "#3b82f6" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o segmento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <Link to="/admin/customers" className="text-sm text-primary hover:underline">← Clientes</Link>
      <h1 className="text-3xl font-bold mb-6 mt-2">Segmentos</h1>
      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="bg-card border rounded-lg p-5 mb-6 grid md:grid-cols-2 gap-3">
        <Input placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
        <Textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Button className="md:col-span-2" onClick={saveSegment} disabled={saving || !form.slug || !form.name}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Criar segmento
        </Button>
      </div>
      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><th className="text-left p-3">Cor</th><th className="text-left p-3">Slug</th><th className="text-left p-3">Nome</th><th className="text-left p-3">Descrição</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Carregando segmentos...</td></tr>}
            {!loading && rows.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3"><span className="inline-block w-4 h-4 rounded-full border" style={{ background: s.color ?? "#888" }} /></td>
                <td className="p-3 font-mono text-xs">{s.slug}</td>
                <td className="p-3">{s.name}</td>
                <td className="p-3 text-xs text-muted-foreground">{s.description}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhum segmento.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}