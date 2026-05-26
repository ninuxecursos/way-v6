import { toCdnUrl } from "@/lib/cdn";
/**
 * GalleryVideoManager — gerencia os vídeos verticais (9:16) exibidos na
 * página /galeria. Lista toda a biblioteca de vídeos com upload inline,
 * marca/desmarca para inclusão, edição de título e poster por item.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Check, Trash2, ArrowUp, ArrowDown, X, Eye, EyeOff } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { cn } from "@/lib/utils";
import type { GalleryVideo } from "@/lib/gallery.functions";
const loadCompress = () => import("@/lib/media-compress");

interface VideoAsset {
  id: string;
  public_url: string;
  filename: string;
  alt_text: string;
  mime_type: string | null;
}

export function GalleryVideoManager({
  items,
  onChange,
}: {
  items: GalleryVideo[];
  onChange: (items: GalleryVideo[]) => void;
}) {
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ pct: number; stage: string; name: string } | null>(null);
  const [bulkPicked, setBulkPicked] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("media_assets")
      .select("id, public_url, filename, alt_text, mime_type")
      .like("mime_type", "video/%")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) notifyError(error);
    setAssets((data ?? []) as VideoAsset[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const usedSrc = useMemo(() => new Set(items.map((i) => i.src).filter(Boolean) as string[]), [items]);

  const addFromAsset = (a: VideoAsset) => {
    if (usedSrc.has(a.public_url)) {
      onChange(items.filter((i) => i.src !== a.public_url));
      return;
    }
    onChange([
      ...items,
      { id: `v${Date.now()}`, title: a.filename.replace(/\.[^.]+$/, ""), poster: "", src: a.public_url, visible: true },
    ]);
  };

  const uploadOne = async (file: File): Promise<GalleryVideo | null> => {
    try {
      const { compressMediaFile } = await loadCompress();
      const compressed = await compressMediaFile(file, (p) =>
        setProgress({ pct: p.pct, stage: p.stage, name: file.name }),
      );
      const ext = compressed.name.split(".").pop() || "mp4";
      const path = `gallery/videos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media-public")
        .upload(path, compressed, { upsert: true, contentType: compressed.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("media-public").getPublicUrl(path);
      await supabase.from("media_assets").insert({
        storage_path: path,
        public_url: toCdnUrl(pub.publicUrl),
        filename: compressed.name,
        mime_type: compressed.type,
        size_bytes: compressed.size,
        alt_text: "",
      });
      return {
        id: `v${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        title: compressed.name.replace(/\.[^.]+$/, ""),
        poster: "",
        src: toCdnUrl(pub.publicUrl),
        visible: true,
      };
    } catch (e) { notifyError(e); return null; }
  };

  const uploadMany = async (files: File[]) => {
    setUploading(true);
    const added: GalleryVideo[] = [];
    for (const f of files) {
      setProgress({ pct: 0, stage: "Iniciando…", name: f.name });
      const v = await uploadOne(f);
      if (v) added.push(v);
    }
    setProgress(null);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (added.length) {
      onChange([...items, ...added]);
      notifySuccess(`${added.length} vídeo(s) enviados`);
      await load();
    }
  };

  const removeFromLibrary = async (a: VideoAsset) => {
    if (!confirm(`Excluir vídeo "${a.filename}" da biblioteca?`)) return;
    const path = a.public_url.split("/media-public/")[1];
    if (path) await supabase.storage.from("media-public").remove([path]);
    await supabase.from("media_assets").delete().eq("id", a.id);
    setAssets((p) => p.filter((x) => x.id !== a.id));
    onChange(items.filter((i) => i.src !== a.public_url));
    notifySuccess("Vídeo excluído");
  };

  const update = (idx: number, patch: Partial<GalleryVideo>) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const togglePick = (url: string) => setBulkPicked((p) => {
    const n = new Set(p); if (n.has(url)) n.delete(url); else n.add(url); return n;
  });
  const bulkAdd = () => {
    const toAdd: GalleryVideo[] = [];
    bulkPicked.forEach((url) => {
      if (usedSrc.has(url)) return;
      const a = assets.find((x) => x.public_url === url);
      toAdd.push({
        id: `v${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        title: (a?.filename ?? "video").replace(/\.[^.]+$/, ""),
        poster: "",
        src: url,
        visible: true,
      });
    });
    if (toAdd.length) onChange([...items, ...toAdd]);
    setBulkPicked(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Selecionados (com edição) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Vídeos exibidos na galeria ({items.length})</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Defina título, poster (capa) e arquivo. A ordem aqui é a ordem na página.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum vídeo selecionado — escolha abaixo na biblioteca ou envie um novo.
            </p>
          )}
          {items.map((v, i) => (
            <div key={v.id + i} className={cn("grid gap-3 rounded-lg border p-3 md:grid-cols-[80px_1fr_auto]", v.visible === false && "opacity-60")}>
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded bg-muted">
                {v.src ? <video src={v.src} muted playsInline className="h-full w-full object-cover" /> : <span className="text-xs text-muted-foreground">sem vídeo</span>}
              </div>
              <div className="space-y-2">
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <Label className="text-xs">Título</Label>
                    <Input value={v.title} onChange={(e) => update(i, { title: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">ID interno</Label>
                    <Input value={v.id} onChange={(e) => update(i, { id: e.target.value })} />
                  </div>
                </div>
                <MediaPicker label="Poster (capa)" value={v.poster} onChange={(u) => update(i, { poster: u })} />
                <MediaPicker label="Arquivo de vídeo" value={v.src ?? ""} onChange={(u) => update(i, { src: u })} accept="video/*" kind="video" />
              </div>
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <button
                  onClick={() => update(i, { visible: v.visible === false ? true : false })}
                  className="rounded p-1 hover:bg-muted"
                  title={v.visible === false ? "Tornar visível" : "Ocultar do site"}
                >
                  {v.visible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => move(i, -1)} className="rounded p-1 hover:bg-muted" aria-label="Subir"><ArrowUp className="h-4 w-4" /></button>
                <span className="text-[10px] font-semibold">#{i + 1}</span>
                <button onClick={() => move(i, 1)} className="rounded p-1 hover:bg-muted" aria-label="Descer"><ArrowDown className="h-4 w-4" /></button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeItem(i)} aria-label="Remover"><X className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Biblioteca de vídeos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Biblioteca de vídeos</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Clique para adicionar/remover. Use a marcação para adicionar vários de uma vez.</p>
          </div>
          <div>
            <input ref={fileRef} type="file" accept="video/*" multiple hidden onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) void uploadMany(files);
            }} />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Enviar vídeos
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {progress && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate font-medium">{progress.name}</span>
                <span className="shrink-0 text-muted-foreground">{progress.stage} {progress.pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress.pct}%` }} />
              </div>
            </div>
          )}
          {bulkPicked.size > 0 && (
            <div className="flex items-center gap-2 rounded-md border bg-primary/5 p-2 text-xs">
              <span className="font-medium">{bulkPicked.size} marcado(s)</span>
              <Button size="sm" variant="outline" onClick={bulkAdd}>Adicionar selecionados</Button>
              <Button size="sm" variant="ghost" onClick={() => setBulkPicked(new Set())}>Limpar</Button>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : assets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum vídeo na biblioteca ainda.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {assets.map((a) => {
                const used = usedSrc.has(a.public_url);
                const picked = bulkPicked.has(a.public_url);
                return (
                  <div key={a.id} className={cn("group relative overflow-hidden rounded-md border bg-card", used && "border-primary ring-2 ring-primary", picked && "ring-2 ring-amber-400")}>
                    <button type="button" onClick={() => addFromAsset(a)} onDoubleClick={() => togglePick(a.public_url)} className="relative block w-full">
                      <video src={a.public_url} muted playsInline preload="metadata" className="h-32 w-full object-cover" />
                      <span className={cn("absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-white", used ? "bg-primary" : "bg-black/50 group-hover:bg-black/70")}>
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); togglePick(a.public_url); }}
                        className={cn("absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-white text-[10px] font-bold", picked ? "bg-amber-500" : "bg-black/50 hover:bg-black/70")}
                        title="Marcar para ação em massa"
                      >
                        {picked ? "✓" : "+"}
                      </button>
                    </button>
                    <div className="flex items-center justify-between gap-2 p-2">
                      <span className="truncate text-[11px] text-muted-foreground" title={a.filename}>{a.filename}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFromLibrary(a)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}