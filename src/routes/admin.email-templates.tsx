import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listEmailTemplates, upsertEmailTemplate } from "@/lib/email.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Mail } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";

export const Route = createFileRoute("/admin/email-templates")({ component: EmailTemplates });

const LOCALES = ["pt", "en", "es"] as const;
type L = typeof LOCALES[number];

function EmailTemplates() {
  const list = useServerFn(listEmailTemplates);
  const upsert = useServerFn(upsertEmailTemplate);
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [tab, setTab] = useState<L>("pt");

  const reload = () => list().then((r: any) => setRows(r));
  useEffect(() => { reload(); }, []);

  const newTpl = () => setEditing({ slug: "", name: "", active: true, translations: { pt: { subject: "", html: "" } }, variables_doc: {} });
  const save = async () => {
    if (!editing.slug || !editing.name) { notifyError(null, "Slug e nome obrigatórios"); return; }
    await upsert({ data: editing });
    setEditing(null); reload();
  };
  const setTr = (locale: L, field: string, val: string) => setEditing({ ...editing, translations: { ...editing.translations, [locale]: { ...(editing.translations[locale] ?? {}), [field]: val } } });

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Mail className="h-7 w-7" />Templates de e-mail</h1>
        <div className="flex gap-2">
          <Link to="/admin/email-providers" className="text-sm text-primary hover:underline self-center">Provedores →</Link>
          <Link to="/admin/email-outbox" className="text-sm text-primary hover:underline self-center">Caixa de saída →</Link>
          <Button onClick={newTpl}><Plus className="h-4 w-4 mr-2" />Novo</Button>
        </div>
      </div>

      {editing ? (
        <div className="bg-card border rounded-lg p-5 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <Input placeholder="slug (ex: order_paid)" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            <Input placeholder="Nome" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <Textarea placeholder="Descrição" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          <div className="flex gap-2 border-b">
            {LOCALES.map((l) => (
              <button key={l} onClick={() => setTab(l)} className={`px-4 py-2 text-sm uppercase ${tab === l ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}>{l}</button>
            ))}
          </div>
          <Input placeholder={`Assunto (${tab})`} value={editing.translations?.[tab]?.subject ?? ""} onChange={(e) => setTr(tab, "subject", e.target.value)} />
          <Textarea placeholder={`HTML (${tab}) — use {{variavel}}`} rows={12} value={editing.translations?.[tab]?.html ?? ""} onChange={(e) => setTr(tab, "html", e.target.value)} className="font-mono text-xs" />
          <Textarea placeholder={`Texto puro (${tab}) — opcional`} rows={4} value={editing.translations?.[tab]?.text ?? ""} onChange={(e) => setTr(tab, "text", e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-left p-3">Slug</th><th className="text-left p-3">Nome</th><th className="text-left p-3">Idiomas</th><th className="text-left p-3">Ativo</th><th></th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{t.slug}</td>
                  <td className="p-3">{t.name}</td>
                  <td className="p-3 text-xs">{Object.keys(t.translations ?? {}).join(", ")}</td>
                  <td className="p-3">{t.active ? "✓" : "—"}</td>
                  <td className="p-3"><Button size="sm" variant="outline" onClick={() => setEditing(t)}>Editar</Button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum template. Crie o primeiro.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}