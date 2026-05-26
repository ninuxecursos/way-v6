/**
 * Admin → Editor de post.
 * - Edita metadados globais + traduções por idioma (tabs PT/EN/ES).
 * - Campos GEO: keywords, summary, FAQ, entidades, JSON-LD custom, og_image.
 * - Publicação: salva, publica, agenda, arquiva.
 */
import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/blog-types";
import { ArrowLeft, Save, Send, Archive, Trash2 } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useConfirmDelete } from "@/components/common/ConfirmDeleteProvider";

export const Route = createFileRoute("/admin/blog_/$postId")({
  head: () => ({ meta: [{ title: "Editor — Admin Way Home" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminBlogEditor,
});

function AdminBlogEditor() {
  const { postId } = useParams({ from: "/admin/blog/$postId" });
  const navigate = useNavigate();
  const confirmDelete = useConfirmDelete();
  const [post, setPost] = useState<any>(null);
  const [translations, setTranslations] = useState<Record<Locale, any>>({} as any);
  const [activeLocale, setActiveLocale] = useState<Locale>("pt");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("blog_posts").select("*, blog_post_translations(*)").eq("id", postId).maybeSingle();
      if (data) {
        setPost(data);
        const map = {} as Record<Locale, any>;
        LOCALES.forEach((l) => {
          map[l] = (data.blog_post_translations ?? []).find((t: any) => t.locale === l) ?? {
            post_id: postId, locale: l, title: "", slug: `${data.slug}-${l}`, content_markdown: "",
            excerpt: null, meta_title: null, meta_description: null, og_image_url: null, canonical_url: null,
            schema_jsonld: null, geo_summary: null, geo_faq: [], geo_entities: [],
          };
        });
        setTranslations(map);
      }
      setLoading(false);
    })();
  }, [postId]);

  function updPost(patch: any) { setPost((p: any) => ({ ...p, ...patch })); }
  function updTr(patch: any) { setTranslations((m) => ({ ...m, [activeLocale]: { ...m[activeLocale], ...patch } })); }

  async function save() {
    setSaving(true);
    try {
      await supabase.from("blog_posts").update({
        slug: post.slug, status: post.status, cover_image_url: post.cover_image_url, cover_alt: post.cover_alt,
        featured: post.featured, reading_time_min: post.reading_time_min, geo_keywords: post.geo_keywords,
        scheduled_for: post.scheduled_for, published_at: post.published_at,
      }).eq("id", postId);

      for (const l of LOCALES) {
        const t = translations[l];
        await supabase.from("blog_post_translations").upsert({
          post_id: postId, locale: l,
          title: t.title || "(sem título)", slug: t.slug || `${post.slug}-${l}`,
          excerpt: t.excerpt, content_markdown: t.content_markdown ?? "",
          meta_title: t.meta_title, meta_description: t.meta_description, og_image_url: t.og_image_url,
          canonical_url: t.canonical_url, schema_jsonld: t.schema_jsonld,
          geo_summary: t.geo_summary, geo_faq: t.geo_faq, geo_entities: t.geo_entities,
        }, { onConflict: "post_id,locale" });
      }
      notifySuccess("Salvo!");
    } catch (e) { notifyError(e); }
    setSaving(false);
  }

  async function publish() {
    setPost((p: any) => ({ ...p, status: "published" }));
    await supabase.from("blog_posts").update({ status: "published" }).eq("id", postId);
    await save();
  }

  async function remove() {
    const ok = await confirmDelete({
      title: "Excluir post permanentemente?",
      description: "O post e todas as traduções serão removidos. Comentários associados também serão apagados.",
      resourceLabel: post?.slug,
    });
    if (!ok) return;
    await supabase.from("blog_posts").delete().eq("id", postId);
    navigate({ to: "/admin/blog" });
  }

  if (loading || !post) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  const tr = translations[activeLocale] ?? {};

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin/blog" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => updPost({ status: "archived" })}><Archive className="h-4 w-4 mr-1" /> Arquivar</Button>
          <Button variant="destructive" size="sm" onClick={remove}><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>
          <Button variant="outline" size="sm" onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          <Button size="sm" onClick={publish} disabled={saving}><Send className="h-4 w-4 mr-1" /> Publicar</Button>
        </div>
      </div>

      {/* Metadados globais */}
      <div className="rounded-lg border p-5 space-y-4">
        <h2 className="font-semibold">Metadados do post</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Slug global"><Input value={post.slug} onChange={(e) => updPost({ slug: e.target.value })} /></Field>
          <Field label="Status">
            <select className="w-full h-9 border rounded-md px-2 bg-background" value={post.status} onChange={(e) => updPost({ status: e.target.value })}>
              <option value="draft">Rascunho</option>
              <option value="scheduled">Agendado</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </select>
          </Field>
          <Field label="Imagem de capa (URL)"><Input value={post.cover_image_url ?? ""} onChange={(e) => updPost({ cover_image_url: e.target.value })} /></Field>
          <Field label="Alt da capa (acessibilidade/SEO)"><Input value={post.cover_alt ?? ""} onChange={(e) => updPost({ cover_alt: e.target.value })} /></Field>
          <Field label="Tempo de leitura (min)"><Input type="number" value={post.reading_time_min ?? ""} onChange={(e) => updPost({ reading_time_min: e.target.value ? Number(e.target.value) : null })} /></Field>
          <Field label="Agendar para">
            <Input type="datetime-local" value={post.scheduled_for?.slice(0, 16) ?? ""} onChange={(e) => updPost({ scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          </Field>
          <Field label="Keywords GEO (separadas por vírgula)" full>
            <Input value={(post.geo_keywords ?? []).join(", ")} onChange={(e) => updPost({ geo_keywords: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!post.featured} onChange={(e) => updPost({ featured: e.target.checked })} /> Destacar
          </label>
        </div>
      </div>

      {/* Tabs idioma */}
      <div className="flex gap-2">
        {LOCALES.map((l) => (
          <Button key={l} size="sm" variant={activeLocale === l ? "default" : "outline"} onClick={() => setActiveLocale(l)}>
            {LOCALE_LABELS[l]}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border p-5 space-y-4">
        <h2 className="font-semibold">Conteúdo — {LOCALE_LABELS[activeLocale]}</h2>
        <Field label="Título"><Input value={tr.title ?? ""} onChange={(e) => updTr({ title: e.target.value })} /></Field>
        <Field label="Slug (idioma)"><Input value={tr.slug ?? ""} onChange={(e) => updTr({ slug: e.target.value })} /></Field>
        <Field label="Resumo / Excerpt"><Textarea rows={2} value={tr.excerpt ?? ""} onChange={(e) => updTr({ excerpt: e.target.value })} /></Field>
        <Field label="Conteúdo (Markdown)"><Textarea rows={16} value={tr.content_markdown ?? ""} onChange={(e) => updTr({ content_markdown: e.target.value })} className="font-mono text-sm" /></Field>
      </div>

      <div className="rounded-lg border p-5 space-y-4">
        <h2 className="font-semibold">SEO + GEO — {LOCALE_LABELS[activeLocale]}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Meta title"><Input value={tr.meta_title ?? ""} onChange={(e) => updTr({ meta_title: e.target.value })} /></Field>
          <Field label="Canonical URL"><Input value={tr.canonical_url ?? ""} onChange={(e) => updTr({ canonical_url: e.target.value })} /></Field>
          <Field label="Meta description" full><Textarea rows={2} value={tr.meta_description ?? ""} onChange={(e) => updTr({ meta_description: e.target.value })} /></Field>
          <Field label="OG image URL" full><Input value={tr.og_image_url ?? ""} onChange={(e) => updTr({ og_image_url: e.target.value })} /></Field>
          <Field label="GEO — Resumo (1ª resposta da IA)" full><Textarea rows={3} value={tr.geo_summary ?? ""} onChange={(e) => updTr({ geo_summary: e.target.value })} /></Field>
          <Field label="GEO — Entidades (vírgula)" full>
            <Input value={(tr.geo_entities ?? []).join(", ")} onChange={(e) => updTr({ geo_entities: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
          </Field>
          <Field label="GEO — FAQ (JSON [{q,a}])" full>
            <Textarea rows={5} value={JSON.stringify(tr.geo_faq ?? [], null, 2)} onChange={(e) => { try { updTr({ geo_faq: JSON.parse(e.target.value) }); } catch {} }} className="font-mono text-xs" />
          </Field>
          <Field label="JSON-LD adicional (objeto)" full>
            <Textarea rows={5} value={tr.schema_jsonld ? JSON.stringify(tr.schema_jsonld, null, 2) : ""} onChange={(e) => { try { updTr({ schema_jsonld: e.target.value ? JSON.parse(e.target.value) : null }); } catch {} }} className="font-mono text-xs" />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
