/**
 * Editor profissional de mídias por página.
 * Lista todas as páginas (pages) e suas seções (page_sections),
 * permitindo editar todas as imagens/banners/galerias de cada uma
 * de forma organizada — com upload + compressão automática.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Upload, Trash2, Image as ImageIcon, FileText } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
const loadCompress = () => import("@/lib/media-compress");
import { SectionImagesEditor } from "@/components/admin/SectionImagesEditor";
import { ExperienceDetailEditor } from "@/components/admin/ExperienceDetailEditor";
import { cn } from "@/lib/utils";
import { toCdnUrl } from "@/lib/cdn";

export const Route = createFileRoute("/admin/settings/page-images")({
  component: PageImagesEditor,
});

interface PageRow { id: string; slug: string; title: string | null }
interface SectionRow {
  id: string;
  page_id: string;
  type: string;
  position: number;
  data: Record<string, unknown>;
}

const SECTIONS_WITH_IMAGE_KEYS = new Set([
  "hero", "experience", "camping", "feedback", "location", "cadastur",
]);

function PageImagesEditor() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [activePage, setActivePage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: pgs } = await supabase.from("pages").select("id, slug, title").order("slug");
      const { data: secs } = await supabase
        .from("page_sections")
        .select("id, page_id, type, position, data")
        .order("position");
      setPages((pgs ?? []) as PageRow[]);
      setSections((secs ?? []) as SectionRow[]);
      if (pgs?.length) setActivePage(pgs[0].id);
      setLoading(false);
    })();
  }, []);

  const activeSections = useMemo(
    () => sections.filter((s) => s.page_id === activePage).sort((a, b) => a.position - b.position),
    [sections, activePage],
  );

  const getDraft = (s: SectionRow): Record<string, unknown> =>
    drafts[s.id] ?? (s.data as Record<string, unknown>) ?? {};

  const updateDraft = (id: string, next: Record<string, unknown>) =>
    setDrafts((prev) => ({ ...prev, [id]: next }));

  const save = async (s: SectionRow) => {
    const data = getDraft(s);
    setSavingId(s.id);
    const { error } = await supabase
      .from("page_sections")
      .update({ data: data as never })
      .eq("id", s.id);
    setSavingId(null);
    if (error) { notifyError(error); return; }
    notifySuccess("Seção atualizada");
    setSections((prev) => prev.map((x) => (x.id === s.id ? { ...x, data } : x)));
    setDrafts((prev) => { const n = { ...prev }; delete n[s.id]; return n; });
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <div className="flex h-full min-h-0">
      <aside className="w-60 border-r bg-muted/30 p-3 overflow-y-auto shrink-0">
        <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Páginas</div>
        <nav className="space-y-0.5">
          {pages.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePage(p.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded text-sm transition-colors",
                activePage === p.id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted text-foreground",
              )}
            >
              <div className="capitalize">{p.title || p.slug.replace(/-/g, " ")}</div>
              <div className={cn("text-[10px]", activePage === p.id ? "opacity-80" : "text-muted-foreground")}>/{p.slug}</div>
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto p-8 space-y-5">
        {activeSections.length === 0 ? (
          <div className="text-sm text-muted-foreground">Esta página não tem seções cadastradas.</div>
        ) : activeSections.map((s) => {
          const draft = getDraft(s);
          const isDirty = !!drafts[s.id];
          return (
            <Card key={s.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{s.type.replace(/_/g, " ")}</span>
                  <span className="text-xs text-muted-foreground font-normal">#{s.position}</span>
                </CardTitle>
                <Button size="sm" onClick={() => save(s)} disabled={!isDirty || savingId === s.id}>
                  <Save className="h-4 w-4 mr-1.5" />
                  {savingId === s.id ? "Salvando…" : isDirty ? "Salvar" : "Salvo"}
                </Button>
              </CardHeader>
              <CardContent>
                {s.type === "experience_detail" ? (
                  <ExperienceDetailEditor
                    data={draft}
                    onChange={(next) => updateDraft(s.id, next)}
                  />
                ) : SECTIONS_WITH_IMAGE_KEYS.has(s.type) ? (
                  <SectionImagesEditor
                    type={s.type}
                    data={draft}
                    onChange={(next) => updateDraft(s.id, next)}
                  />
                ) : (
                  <GenericMediaEditor data={draft} onChange={(next) => updateDraft(s.id, next)} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Editor genérico que descobre campos de mídia em `data`:
 * - strings com nome 'banner' / 'image' / 'cover' / 'background' / 'logo' / 'video'
 * - objetos aninhados com `.image`
 * - arrays `gallery` de URLs
 */
function GenericMediaEditor({
  data,
  onChange,
}: { data: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }) {
  const mediaKeys = ["banner", "image", "cover", "background", "logo", "video", "thumbnail"];
  const singleFields = Object.entries(data).filter(
    ([k, v]) => typeof v === "string" && mediaKeys.some((m) => k.toLowerCase().includes(m)),
  ) as [string, string][];

  const nestedImage = Object.entries(data).filter(([_, v]) =>
    v && typeof v === "object" && !Array.isArray(v) && typeof (v as Record<string, unknown>).image === "string",
  ) as [string, Record<string, unknown>][];

  const gallery = Array.isArray(data.gallery) ? (data.gallery as string[]) : null;

  const hasAnything = singleFields.length > 0 || nestedImage.length > 0 || gallery !== null;

  return (
    <div className="space-y-5">
      {singleFields.map(([key, url]) => (
        <SingleMediaField
          key={key}
          label={key}
          value={url}
          onChange={(v) => onChange({ ...data, [key]: v })}
        />
      ))}
      {nestedImage.map(([key, obj]) => (
        <SingleMediaField
          key={key}
          label={`${key}.image`}
          value={(obj.image as string) ?? ""}
          onChange={(v) => onChange({ ...data, [key]: { ...obj, image: v } })}
        />
      ))}
      {gallery && (
        <GalleryEditor
          urls={gallery}
          onChange={(next) => onChange({ ...data, gallery: next })}
        />
      )}
      {!hasAnything && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Esta seção não tem campos de mídia detectáveis. Edite o JSON em “Conteúdo das páginas”.
        </p>
      )}
    </div>
  );
}

function SingleMediaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const { compressMediaFile } = await loadCompress();
      const compressed = await compressMediaFile(file).catch(() => file);
      const ext = compressed.name.split(".").pop() || "bin";
      const path = `cms/page-images/${label}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("media-public").upload(path, compressed, { upsert: true });
      if (error) { notifyError(error); return; }
      const { data: pub } = supabase.storage.from("media-public").getPublicUrl(path);
      onChange(toCdnUrl(pub.publicUrl));
      notifySuccess("Mídia enviada");
    } finally { setBusy(false); }
  };

  const displayValue = toCdnUrl(value);
  const isVideo = /\.(mp4|webm|mov)$/i.test(value);

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      {value ? (
        isVideo ? (
          <video src={value} muted className="h-16 w-16 rounded object-cover bg-muted shrink-0" />
        ) : (
          <img src={value} alt={label} className="h-16 w-16 rounded object-cover bg-muted shrink-0" />
        )
      ) : (
        <div className="h-16 w-16 rounded bg-muted shrink-0 flex items-center justify-center text-muted-foreground">
          <ImageIcon className="h-5 w-5" />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
        <div className="flex gap-1.5">
          <Input value={displayValue} onChange={(e) => onChange(e.target.value)} placeholder="URL ou envie um arquivo…" className="text-xs h-8" />
          <input
            ref={ref}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }}
          />
          <Button type="button" size="sm" variant="outline" className="h-8 px-2" disabled={busy} onClick={() => ref.current?.click()}>
            <Upload className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function GalleryEditor({ urls, onChange }: { urls: string[]; onChange: (next: string[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const uploadFiles = async (files: File[]) => {
    setBusy(true);
    const added: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setProgress(`Enviando ${i + 1}/${files.length}…`);
      try {
        const { compressMediaFile } = await loadCompress();
        const compressed = await compressMediaFile(files[i]).catch(() => files[i]);
        const ext = compressed.name.split(".").pop() || "bin";
        const path = `cms/gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("media-public").upload(path, compressed, { upsert: true });
        if (error) { notifyError(error); continue; }
        const { data: pub } = supabase.storage.from("media-public").getPublicUrl(path);
        added.push(toCdnUrl(pub.publicUrl));
      } catch (e) { console.warn(e); }
    }
    if (added.length) onChange([...urls, ...added]);
    setProgress(null);
    setBusy(false);
  };

  const update = (idx: number, v: string) => onChange(urls.map((u, i) => (i === idx ? v : u)));
  const remove = (idx: number) => onChange(urls.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2 p-3 border rounded-lg">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Galeria ({urls.length})</Label>
        <div className="flex items-center gap-2">
          {progress && <span className="text-[11px] text-muted-foreground">{progress}</span>}
          <input ref={ref} type="file" accept="image/*,video/*" multiple className="hidden"
            onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length) uploadFiles(fs); e.currentTarget.value = ""; }} />
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => ref.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1" />Adicionar
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {urls.map((u, i) => {
          const display = toCdnUrl(u);
          const isVideo = /\.(mp4|webm|mov)$/i.test(u);
          return (
            <div key={i} className="border rounded overflow-hidden bg-card">
              {isVideo ? (
                <video src={u} muted className="w-full h-24 object-cover" />
              ) : (
                <img src={u} alt="" className="w-full h-24 object-cover" />
              )}
              <div className="p-1.5 flex gap-1">
                <Input value={display} onChange={(e) => update(i, e.target.value)} className="text-[10px] h-7" />
                <Button size="sm" variant="ghost" className="h-7 px-1.5 text-destructive" onClick={() => remove(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}