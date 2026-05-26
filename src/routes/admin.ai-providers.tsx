import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listAiProviders,
  upsertAiProvider,
  deleteAiProvider,
  setDefaultAiProvider,
} from "@/lib/ai-providers.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Plus, Star, Trash2, Save } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useConfirmDelete } from "@/components/common/ConfirmDeleteProvider";

type Provider = {
  id?: string;
  name: string;
  provider_type: string;
  active: boolean;
  is_default: boolean;
  is_test: boolean;
  model_default?: string | null;
  secret_ref?: string | null;
  config?: Record<string, unknown>;
};

const TYPES = [
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "gemini", label: "Google Gemini" },
  { value: "kling", label: "Kling AI" },
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "groq", label: "Groq" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "stability", label: "Stability AI" },
  { value: "elevenlabs", label: "ElevenLabs" },
  { value: "generic", label: "Genérico" },
];

export const Route = createFileRoute("/admin/ai-providers")({ component: AiProvidersPage });

function AiProvidersPage() {
  const list = useServerFn(listAiProviders);
  const upsert = useServerFn(upsertAiProvider);
  const del = useServerFn(deleteAiProvider);
  const setDefault = useServerFn(setDefaultAiProvider);
  const confirmDelete = useConfirmDelete();
  const [rows, setRows] = useState<Provider[]>([]);
  const [editing, setEditing] = useState<Provider | null>(null);

  const reload = async () => {
    try {
      const r = (await list()) as unknown as Provider[];
      setRows(r ?? []);
    } catch (e) {
      notifyError(e);
    }
  };
  useEffect(() => {
    reload();
  }, []);

  const startNew = () =>
    setEditing({
      name: "",
      provider_type: "openai",
      active: true,
      is_default: false,
      is_test: true,
      model_default: "",
      secret_ref: "",
      config: {},
    });

  const save = async () => {
    if (!editing) return;
    try {
      const payload = {
        ...editing,
        model_default: editing.model_default?.trim() || null,
        secret_ref: editing.secret_ref?.trim() || null,
      };
      await upsert({ data: payload as never });
      notifySuccess("Provedor salvo");
      setEditing(null);
      await reload();
    } catch (e) {
      notifyError(e);
    }
  };

  const remove = async (p: Provider) => {
    if (!p.id) return;
    const ok = await confirmDelete({
      title: "Excluir provedor de IA?",
      description: "Essa ação não pode ser desfeita. O secret referenciado NÃO é removido.",
      resourceLabel: p.name,
      confirmButtonLabel: "Excluir",
      confirmWord: "EXCLUIR",
    });
    if (!ok) return;
    try {
      await del({ data: { id: p.id } as never });
      notifySuccess("Provedor removido");
      await reload();
    } catch (e) {
      notifyError(e);
    }
  };

  const markDefault = async (p: Provider) => {
    if (!p.id) return;
    try {
      await setDefault({ data: { id: p.id } as never });
      notifySuccess("Marcado como padrão");
      await reload();
    } catch (e) {
      notifyError(e);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-7 w-7" />
          Provedores de IA
        </h1>
        <Button onClick={startNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo provedor
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Cadastre as chaves de cada provedor primeiro como <strong>secret</strong> (Admin → Secrets) e
        depois referencie aqui via <code className="text-xs">secret_ref</code> (ex.: <code>OPENAI_API_KEY</code>).
        Nunca cole a chave bruta — apenas o nome do secret.
      </p>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-left p-3">Modelo padrão</th>
              <th className="text-left p-3">Secret</th>
              <th className="text-left p-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium flex items-center gap-2">
                  {p.is_default && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                  {p.name}
                </td>
                <td className="p-3 text-xs uppercase">{p.provider_type}</td>
                <td className="p-3 text-xs font-mono">{p.model_default || "—"}</td>
                <td className="p-3 text-xs font-mono">{p.secret_ref || "—"}</td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      p.active ? "bg-green-500/20" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                  {p.is_test && (
                    <span className="text-xs ml-2 px-2 py-0.5 rounded bg-amber-500/20">teste</span>
                  )}
                </td>
                <td className="p-3 flex gap-1 justify-end">
                  {!p.is_default && (
                    <Button size="sm" variant="outline" onClick={() => markDefault(p)}>
                      Padrão
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Nenhum provedor cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold">{editing.id ? "Editar provedor" : "Novo provedor"}</h2>

            <div>
              <Label>Nome</Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Ex.: OpenAI Produção"
              />
            </div>

            <div>
              <Label>Tipo</Label>
              <select
                className="w-full bg-background border rounded px-3 py-2"
                value={editing.provider_type}
                onChange={(e) => setEditing({ ...editing, provider_type: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Modelo padrão</Label>
              <Input
                value={editing.model_default ?? ""}
                onChange={(e) => setEditing({ ...editing, model_default: e.target.value })}
                placeholder="Ex.: gpt-4o-mini, gemini-2.5-flash, kling-v1"
              />
            </div>

            <div>
              <Label>Secret ref (nome do secret no Lovable Cloud)</Label>
              <Input
                value={editing.secret_ref ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, secret_ref: e.target.value.toUpperCase() })
                }
                placeholder="Ex.: OPENAI_API_KEY"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Letras maiúsculas, números e _. A chave em si fica nos Secrets — aqui só o nome.
              </p>
            </div>

            <div className="flex items-center justify-between border rounded p-3">
              <Label className="cursor-pointer">Ativo</Label>
              <Switch
                checked={editing.active}
                onCheckedChange={(v) => setEditing({ ...editing, active: v })}
              />
            </div>
            <div className="flex items-center justify-between border rounded p-3">
              <Label className="cursor-pointer">Modo de teste (sandbox)</Label>
              <Switch
                checked={editing.is_test}
                onCheckedChange={(v) => setEditing({ ...editing, is_test: v })}
              />
            </div>
            <div className="flex items-center justify-between border rounded p-3">
              <Label className="cursor-pointer">Marcar como padrão</Label>
              <Switch
                checked={editing.is_default}
                onCheckedChange={(v) => setEditing({ ...editing, is_default: v })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button onClick={save}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}