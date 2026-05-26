import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, Copy } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useConfirmDelete } from "@/components/common/ConfirmDeleteProvider";

export const Route = createFileRoute("/admin/products")({ component: ProductsList });

function ProductsList() {
  const [items, setItems] = useState<any[]>([]);
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("suite");
  const confirmDelete = useConfirmDelete();

  const load = async () => {
    const { data } = await supabase.from("products").select("*").order("position");
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!slug.trim()) return;
    const { data, error } = await supabase.from("products").insert({
      slug, type, active: false, price_cents: 0,
      translations: { pt: { name: slug }, en: { name: slug }, es: { name: slug } },
    } as any).select().single();
    if (error) { notifyError(error); return; } notifySuccess("Produto removido");
    setSlug("");
    if (data) window.location.assign(`/admin/products/${data.id}`);
  };

  const remove = async (id: string, label: string) => {
    const ok = await confirmDelete({
      title: "Excluir produto?",
      description: "O produto será removido. Pedidos já criados não são afetados, mas o produto deixa de aparecer no site.",
      resourceLabel: label,
    });
    if (!ok) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { notifyError(error); return; }
    notifySuccess("Produto excluído.");
    load();
  };

  const duplicate = async (p: any) => {
    const baseSlug = `${p.slug}-copia`;
    // garante slug único
    let newSlug = baseSlug;
    let i = 2;
    while (true) {
      const { data: exists } = await supabase
        .from("products").select("id").eq("slug", newSlug).maybeSingle();
      if (!exists) break;
      newSlug = `${baseSlug}-${i++}`;
    }
    const tr = (p.translations ?? {}) as any;
    const newTranslations: any = {};
    for (const loc of Object.keys(tr)) {
      newTranslations[loc] = { ...tr[loc], name: `${tr[loc]?.name ?? p.slug} (cópia)` };
    }
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = p;
    const { data, error } = await supabase.from("products").insert({
      ...rest,
      slug: newSlug,
      active: false,
      translations: newTranslations,
      position: (p.position ?? 0) + 1,
    } as any).select().single();
    if (error) { notifyError(error); return; }
    notifySuccess("Produto duplicado.");
    if (data) window.location.assign(`/admin/products/${data.id}`);
  };

  const toggleActive = async (p: any, next: boolean) => {
    setItems((prev) => prev.map((it) => (it.id === p.id ? { ...it, active: next } : it)));
    const { error } = await supabase.from("products").update({ active: next } as never).eq("id", p.id);
    if (error) {
      notifyError(error);
      setItems((prev) => prev.map((it) => (it.id === p.id ? { ...it, active: !next } : it)));
      return;
    }
    notifySuccess(next ? "Produto ativado." : "Produto desativado.");
  };

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Produtos / Pacotes</h1>
      <div className="flex gap-2 mb-6 p-4 bg-card border rounded-lg">
        <Input placeholder="slug-do-produto" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))} />
        <select className="border rounded px-3" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="suite">Suíte</option>
          <option value="camping">Camping</option>
          <option value="addon">Add-on</option>
          <option value="transfer">Transfer</option>
          <option value="other">Outro</option>
        </select>
        <Button onClick={create}><Plus className="h-4 w-4 mr-2" />Criar</Button>
      </div>
      <div className="space-y-2">
        {items.map((p) => (
          <Link
            key={p.id}
            to="/admin/products/$id"
            params={{ id: p.id }}
            className="flex items-center justify-between gap-3 p-4 bg-card border rounded-lg transition hover:border-primary/60 hover:bg-accent/40 cursor-pointer"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">
                {(p.translations as any)?.pt?.name ?? (p.translations as any)?.["pt-BR"]?.name ?? p.slug}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                /{p.slug} · {p.type} · R$ {(p.price_cents / 100).toFixed(2)} · {p.active ? "✅ ativo" : "⏸ rascunho"}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <div
                className="flex items-center gap-2 mr-2"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              >
                <Switch
                  checked={!!p.active}
                  onCheckedChange={(v) => toggleActive(p, v)}
                  aria-label={p.active ? "Desativar produto" : "Ativar produto"}
                />
              </div>
              <Button variant="ghost" size="sm" asChild>
                <span><Pencil className="h-4 w-4 mr-1" />Editar</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); duplicate(p); }}
                aria-label="Duplicar produto"
                title="Duplicar"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(p.id, (p.translations as any)?.pt?.name ?? p.slug); }}
                aria-label="Excluir produto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Link>
        ))}
        {items.length === 0 && <p className="text-muted-foreground">Nenhum produto ainda.</p>}
      </div>
    </div>
  );
}