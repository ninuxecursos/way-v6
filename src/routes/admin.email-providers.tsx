import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listEmailProviders, upsertEmailProvider, deleteEmailProvider } from "@/lib/email.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/lib/notify";

export const Route = createFileRoute("/admin/email-providers")({ component: ProvidersPage });

function ProvidersPage() {
  const list = useServerFn(listEmailProviders);
  const upsert = useServerFn(upsertEmailProvider);
  const remove = useServerFn(deleteEmailProvider);
  const [rows, setRows] = useState<any[]>([]);
  const emptyForm = { id: undefined as string | undefined, name: "", provider_type: "resend", from_email: "", from_name: "", secret_ref: "", is_default: false, active: false };
  const [form, setForm] = useState<any>(emptyForm);

  const reload = () =>
    list()
      .then((r: any) => setRows(Array.isArray(r) ? r : []))
      .catch((err: unknown) => {
        // Silencia 401/erros de sessão expirada para não derrubar a tela.
        console.warn("[admin/email-providers] listEmailProviders falhou:", err);
        setRows([]);
      });
  useEffect(() => { reload(); }, []);

  const startEdit = (p: any) => {
    setForm({
      id: p.id,
      name: p.name ?? "",
      provider_type: p.provider_type ?? "resend",
      from_email: p.config?.from_email ?? "",
      from_name: p.config?.from_name ?? "",
      secret_ref: p.secret_ref ?? "",
      is_default: !!p.is_default,
      active: !!p.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (p: any) => {
    if (!confirm(`Excluir provedor "${p.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await remove({ data: { id: p.id } as any });
      notifySuccess("Provedor excluído");
      if (form.id === p.id) setForm(emptyForm);
      reload();
    } catch (e) {
      notifyError(e);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <Link to="/admin/email-templates" className="text-sm text-primary hover:underline">← Templates</Link>
      <h1 className="text-3xl font-bold mt-2 mb-2">Provedores de e-mail</h1>
      <p className="text-sm text-muted-foreground mb-6">Cadastre o provedor (Resend, SendGrid, SMTP). Os e-mails ficarão na caixa de saída e serão despachados quando você ativar um provedor com chave configurada via Secrets.</p>

      <div className="bg-card border rounded-lg p-5 mb-6 grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2 flex items-center justify-between">
          <h3 className="font-semibold text-sm">{form.id ? "Editar provedor" : "Novo provedor"}</h3>
          {form.id && (
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setForm(emptyForm)}>Cancelar edição</button>
          )}
        </div>
        <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className="border rounded px-3 py-2 bg-background" value={form.provider_type} onChange={(e) => setForm({ ...form, provider_type: e.target.value })}>
          <option value="resend">Resend</option>
          <option value="brevo">Brevo</option>
          <option value="sendgrid">SendGrid</option>
          <option value="smtp">SMTP</option>
          <option value="mock">Mock (testes)</option>
        </select>
        <Input placeholder="From email" value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} />
        <Input placeholder="From name" value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} />
        <Input placeholder="Nome do secret (ex: BREVO_API_KEY, RESEND_API_KEY)" value={form.secret_ref} onChange={(e) => setForm({ ...form, secret_ref: e.target.value })} />
        <div className="flex gap-4 items-center">
          <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Ativo</label>
          <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />Padrão</label>
        </div>
        <Button className="md:col-span-2" onClick={async () => {
          try {
            await upsert({ data: { id: form.id, name: form.name, provider_type: form.provider_type, active: form.active, is_default: form.is_default, secret_ref: form.secret_ref || undefined, config: { from_email: form.from_email, from_name: form.from_name } } as any });
            notifySuccess(form.id ? "Provedor atualizado" : "Provedor criado");
            setForm(emptyForm);
            reload();
          } catch (e) { notifyError(e); }
        }}>{form.id ? "Salvar alterações" : "Criar provedor"}</Button>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">From</th><th className="text-left p-3">Secret</th><th className="text-left p-3">Status</th><th className="text-right p-3">Ações</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.name}</td>
                <td className="p-3 text-xs uppercase">{p.provider_type}</td>
                <td className="p-3 text-xs">{p.config?.from_email}</td>
                <td className="p-3 font-mono text-xs">{p.secret_ref ?? "—"}</td>
                <td className="p-3 text-xs">{p.active ? "ativo" : "inativo"}{p.is_default ? " · padrão" : ""}</td>
                <td className="p-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => startEdit(p)}>Editar</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(p)}>Excluir</Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum provedor configurado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}