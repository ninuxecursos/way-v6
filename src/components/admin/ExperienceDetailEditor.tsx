/**
 * Editor completo para seções do tipo `experience_detail`.
 * Permite editar TODOS os campos informativos da página (ex.: Transfer):
 *  - textos: eyebrow, title, subtitle, intro, ctaLabel, ctaUrl
 *  - banner (imagem hero) com upload
 *  - benefícios (ícone + título + texto)
 *  - galeria com legenda (até 3 imagens em destaque na página)
 *  - checklist / info (label + value)
 *  - bloco institucional (imagem + título + texto)
 */
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Plus, Image as ImageIcon, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyError, notifySuccess } from "@/lib/notify";
import { toCdnUrl } from "@/lib/cdn";
const loadCompress = () => import("@/lib/media-compress");

type Benefit = { icon?: string; title: string; text?: string };
type GalleryItem = { src: string; caption?: string };
type InfoItem = { label?: string; value: string };
type Institutional = { image?: string; title?: string; text?: string };

const ICON_OPTIONS = [
  "Armchair", "Snowflake", "Wifi", "Usb", "ShieldCheck", "CheckCircle2",
  "Bus", "MapPin", "Clock", "AlertTriangle", "Star",
];

async function uploadFile(file: File, folder: string): Promise<string | null> {
  try {
    const { compressMediaFile } = await loadCompress();
    const compressed = await compressMediaFile(file).catch(() => file);
    const ext = compressed.name.split(".").pop() || "bin";
    const path = `cms/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("media-public").upload(path, compressed, { upsert: true });
    if (error) { notifyError(error); return null; }
    const { data: pub } = supabase.storage.from("media-public").getPublicUrl(path);
    return toCdnUrl(pub.publicUrl);
  } catch (e) {
    notifyError(e);
    return null;
  }
}

function ImageUploader({
  label, value, folder, onChange, accept = "image/*,video/*",
}: { label: string; value: string; folder: string; onChange: (v: string) => void; accept?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const isVideo = /\.(mp4|webm|mov|m4v|ogg|ogv)(\?|#|$)/i.test(value);
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      {value ? (
        isVideo ? (
          <video src={toCdnUrl(value)} muted className="h-20 w-20 shrink-0 rounded object-cover bg-muted" />
        ) : (
          <img src={toCdnUrl(value)} alt="" className="h-20 w-20 shrink-0 rounded object-cover bg-muted" />
        )
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded bg-muted">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          {label} <span className="normal-case opacity-60">(imagem ou vídeo)</span>
        </Label>
        <div className="flex gap-1.5">
          <Input value={toCdnUrl(value)} onChange={(e) => onChange(e.target.value)} placeholder="URL ou envie um arquivo…" className="h-8 text-xs" />
          <input
            ref={ref} type="file" accept={accept} className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]; e.currentTarget.value = "";
              if (!f) return;
              setBusy(true);
              const url = await uploadFile(f, folder);
              setBusy(false);
              if (url) { onChange(url); notifySuccess("Mídia enviada"); }
            }}
          />
          <Button type="button" size="sm" variant="outline" className="h-8 px-2" disabled={busy} onClick={() => ref.current?.click()}>
            <Upload className="h-3.5 w-3.5" />
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-destructive" onClick={() => onChange("")}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExperienceDetailEditor({
  data, onChange,
}: { data: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }) {
  const set = (k: string, v: unknown) => onChange({ ...data, [k]: v });

  const benefits: Benefit[] = Array.isArray(data.benefits) ? (data.benefits as Benefit[]) : [];
  const galleryRaw = Array.isArray(data.gallery) ? (data.gallery as unknown[]) : [];
  const gallery: GalleryItem[] = galleryRaw.map((it) =>
    typeof it === "string" ? { src: it, caption: "" } : (it as GalleryItem),
  );
  const info: InfoItem[] = Array.isArray(data.info) ? (data.info as InfoItem[]) : [];
  const institutional: Institutional = (data.institutional as Institutional) || {};

  const bulkRef = useRef<HTMLInputElement>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const handleBulkUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBulkBusy(true);
    const uploaded: GalleryItem[] = [];
    let okCount = 0;
    for (const f of Array.from(files)) {
      const url = await uploadFile(f, "experience_detail/gallery");
      if (url) { uploaded.push({ src: url, caption: "" }); okCount++; }
    }
    setBulkBusy(false);
    if (uploaded.length > 0) {
      set("gallery", [...gallery, ...uploaded]);
      notifySuccess(`${okCount} mídia(s) enviada(s)`);
    }
  };

  const moveItem = <T,>(arr: T[], from: number, to: number): T[] => {
    if (to < 0 || to >= arr.length) return arr;
    const next = [...arr];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    return next;
  };

  return (
    <div className="space-y-6">
      {/* TEXTOS PRINCIPAIS */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Textos principais</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Eyebrow</Label>
            <Input value={(data.eyebrow as string) || ""} onChange={(e) => set("eyebrow", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Título (use "." ou "|" para quebrar em duas linhas)</Label>
            <Input value={(data.title as string) || ""} onChange={(e) => set("title", e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Subtítulo</Label>
          <Textarea rows={2} value={(data.subtitle as string) || ""} onChange={(e) => set("subtitle", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Introdução (parágrafo longo, opcional)</Label>
          <Textarea rows={3} value={(data.intro as string) || ""} onChange={(e) => set("intro", e.target.value)} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">CTA — texto do botão</Label>
            <Input value={(data.ctaLabel as string) || ""} onChange={(e) => set("ctaLabel", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">CTA — URL</Label>
            <Input value={(data.ctaUrl as string) || ""} onChange={(e) => set("ctaUrl", e.target.value)} />
          </div>
        </div>
      </section>

      {/* BANNER */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Imagem principal (banner / hero)</h3>
        <ImageUploader label="banner" folder="experience_detail/banner" value={(data.banner as string) || ""} onChange={(v) => set("banner", v)} />
      </section>

      {/* BENEFÍCIOS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Benefícios (barra de ícones — até 5)</h3>
          <Button type="button" size="sm" variant="outline" onClick={() => set("benefits", [...benefits, { icon: "CheckCircle2", title: "", text: "" }])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {benefits.map((b, i) => (
            <div key={i} className="grid items-start gap-2 rounded-lg border p-3 md:grid-cols-[140px_1fr_auto]">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Ícone</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={b.icon || "CheckCircle2"}
                  onChange={(e) => set("benefits", benefits.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))}
                >
                  {ICON_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Input
                  placeholder="Título"
                  value={b.title || ""}
                  onChange={(e) => set("benefits", benefits.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                />
                <Textarea
                  rows={2}
                  placeholder="Texto (opcional)"
                  value={b.text || ""}
                  onChange={(e) => set("benefits", benefits.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => set("benefits", moveItem(benefits, i, i - 1))}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => set("benefits", moveItem(benefits, i, i + 1))}><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => set("benefits", benefits.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
          {benefits.length === 0 && <p className="text-xs text-muted-foreground">Nenhum benefício cadastrado.</p>}
        </div>
      </section>

      {/* GALERIA */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Galeria de mídias (imagens e vídeos)</h3>
          <div className="flex gap-2">
            <input
              ref={bulkRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = e.target.files;
                e.currentTarget.value = "";
                await handleBulkUpload(files);
              }}
            />
            <Button type="button" size="sm" variant="default" disabled={bulkBusy} onClick={() => bulkRef.current?.click()}>
              <Upload className="mr-1 h-3.5 w-3.5" /> {bulkBusy ? "Enviando…" : "Enviar várias"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => set("gallery", [...gallery, { src: "", caption: "" }])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Use "Enviar várias" para upload em massa, ou "Adicionar" para criar um item individual. Suporta imagens e vídeos (mp4, webm, mov).
        </p>
        <div className="space-y-2">
          {gallery.map((g, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <ImageUploader
                label={`Imagem ${i + 1}`}
                folder="experience_detail/gallery"
                value={g.src}
                onChange={(v) => set("gallery", gallery.map((x, j) => j === i ? { ...x, src: v } : x))}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Legenda (aparece sobre a imagem)"
                  value={g.caption || ""}
                  onChange={(e) => set("gallery", gallery.map((x, j) => j === i ? { ...x, caption: e.target.value } : x))}
                />
                <Button type="button" size="sm" variant="ghost" onClick={() => set("gallery", moveItem(gallery, i, i - 1))}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => set("gallery", moveItem(gallery, i, i + 1))}><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => set("gallery", gallery.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
          {gallery.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma imagem na galeria.</p>}
        </div>
      </section>

      {/* CHECKLIST / INFO */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Checklist informativo</h3>
          <Button type="button" size="sm" variant="outline" onClick={() => set("info", [...info, { label: "", value: "" }])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {info.map((it, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border p-2">
              <Input
                placeholder="Texto exibido"
                value={it.value || ""}
                onChange={(e) => set("info", info.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
              />
              <Button type="button" size="sm" variant="ghost" onClick={() => set("info", moveItem(info, i, i - 1))}><ArrowUp className="h-3.5 w-3.5" /></Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => set("info", moveItem(info, i, i + 1))}><ArrowDown className="h-3.5 w-3.5" /></Button>
              <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => set("info", info.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          {info.length === 0 && <p className="text-xs text-muted-foreground">Nenhum item de checklist.</p>}
        </div>
      </section>

      {/* INSTITUCIONAL */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Bloco institucional (card de destaque)</h3>
        <ImageUploader
          label="Imagem institucional"
          folder="experience_detail/institutional"
          value={institutional.image || ""}
          onChange={(v) => set("institutional", { ...institutional, image: v })}
        />
        <div>
          <Label className="text-xs">Título</Label>
          <Input
            value={institutional.title || ""}
            onChange={(e) => set("institutional", { ...institutional, title: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Texto</Label>
          <Textarea
            rows={3}
            value={institutional.text || ""}
            onChange={(e) => set("institutional", { ...institutional, text: e.target.value })}
          />
        </div>
      </section>
    </div>
  );
}