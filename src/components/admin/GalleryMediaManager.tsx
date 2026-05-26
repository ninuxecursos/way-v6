import { toCdnUrl } from "@/lib/cdn";
/**
 * GalleryMediaManager — gerencia listas mistas de imagens E vídeos para uma
 * seção da galeria (hero ou catálogo de fotos). Suporta:
 *  - Upload em massa (multi-file) com compressão automática.
 *  - Multi-seleção em massa na biblioteca (modo seleção).
 *  - Toggle visível/oculto por item selecionado.
 *  - Reordenação ↑/↓ na lista selecionada.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload, Loader2, Check, Trash2, Search, ArrowUp, ArrowDown, X,
  Eye, EyeOff, CheckSquare, Square, Film, ImageIcon,
} from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { detectMediaKind } from "@/lib/media-kind";
// `.client.ts` não pode ser importado estaticamente (proteção SSR do TanStack).
const loadCompress = () => import("@/lib/media-compress");
import type { GalleryMediaItem } from "@/lib/gallery.functions";

interface MediaAsset {
  id: string;
  public_url: string;
  filename: string;
  alt_text: string;
  mime_type: string | null;
}

export function GalleryMediaManager({
  title,
  hint,
  selected,
  onChange,
  accept = "image/*,video/*",
  kindFilter,
}: {
  title: string;
  hint?: string;
  selected: GalleryMediaItem[];
  onChange: (items: GalleryMediaItem[]) => void;
  accept?: string;
  /** Limita a biblioteca exibida a apenas imagens ou apenas vídeos. */
  kindFilter?: "image" | "video";
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadInfo, setUploadInfo] = useState<{ name: string; pct: number; stage: string } | null>(null);
  const [query, setQuery] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkPicked, setBulkPicked] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("media_assets")
      .select("id, public_url, filename, alt_text, mime_type");
    if (kindFilter === "video") {
      q = q.like("mime_type", "video/%");
    } else if (kindFilter === "image") {
      q = q.like("mime_type", "image/%");
    } else {
      q = q.or("mime_type.like.image/%,mime_type.like.video/%,mime_type.is.null");
    }
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) notifyError(error);
    let rows = (data ?? []) as MediaAsset[];
    // Filtro extra por extensão (cobre assets sem mime_type correto).
    if (kindFilter) {
      rows = rows.filter((a) => detectMediaKind(a.public_url, a.mime_type) === kindFilter);
    }
    setAssets(rows);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [kindFilter]);

  const urlIndex = useMemo(() => {
    const m = new Map<string, number>();
    selected.forEach((s, i) => m.set(s.url, i));
    return m;
  }, [selected]);

  const isSelected = (url: string) => urlIndex.has(url);

  const toggle = (a: MediaAsset) => {
    if (isSelected(a.public_url)) {
      onChange(selected.filter((s) => s.url !== a.public_url));
    } else {
      onChange([
        ...selected,
        {
          url: a.public_url,
          kind: detectMediaKind(a.public_url, a.mime_type),
          visible: true,
          alt: a.alt_text || undefined,
        },
      ]);
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= selected.length) return;
    const next = [...selected];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const setVisible = (i: number, v: boolean) =>
    onChange(selected.map((it, idx) => (idx === i ? { ...it, visible: v } : it)));

  const uploadOne = async (file: File): Promise<GalleryMediaItem | null> => {
    try {
      const { compressMediaFile } = await loadCompress();
      const compressed = await compressMediaFile(file, (p) =>
        setUploadInfo({ name: file.name, pct: p.pct, stage: p.stage }),
      );
      const ext = compressed.name.split(".").pop() || "bin";
      const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
        url: toCdnUrl(pub.publicUrl),
        kind: detectMediaKind(pub.publicUrl, compressed.type),
        visible: true,
      };
    } catch (e) {
      notifyError(e);
      return null;
    }
  };

  const uploadMany = async (files: File[]) => {
    const added: GalleryMediaItem[] = [];
    for (const f of files) {
      setUploadInfo({ name: f.name, pct: 0, stage: "Iniciando…" });
      const item = await uploadOne(f);
      if (item) added.push(item);
    }
    setUploadInfo(null);
    if (added.length) {
      onChange([...selected, ...added]);
      notifySuccess(`${added.length} arquivo(s) enviados`);
      await load();
    }
  };

  const remove = async (a: MediaAsset) => {
    if (!confirm(`Excluir "${a.filename}" da biblioteca?`)) return;
    const path = a.public_url.split("/media-public/")[1];
    if (path) await supabase.storage.from("media-public").remove([path]);
    await supabase.from("media_assets").delete().eq("id", a.id);
    setAssets((p) => p.filter((x) => x.id !== a.id));
    if (isSelected(a.public_url)) onChange(selected.filter((s) => s.url !== a.public_url));
    notifySuccess("Mídia excluída");
  };

  const updateAlt = async (id: string, alt_text: string) => {
    if (id.startsWith("ext:")) return;
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, alt_text } : a)));
    await supabase.from("media_assets").update({ alt_text }).eq("id", id);
  };

  const filtered = useMemo(() => {
    const known = new Set(assets.map((a) => a.public_url));
    const external: MediaAsset[] = selected
      .filter((s) => !known.has(s.url))
      .map((s) => ({
        id: `ext:${s.url}`,
        public_url: s.url,
        filename: s.url.split("/").pop() || s.url,
        alt_text: s.alt || "",
        mime_type: s.kind === "video" ? "video/*" : "image/*",
      }));
    const all = [...external, ...assets];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((a) =>
      a.filename.toLowerCase().includes(q) || (a.alt_text || "").toLowerCase().includes(q),
    );
  }, [assets, query, selected]);

  // Bulk actions
  const togglePick = (url: string) => {
    setBulkPicked((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  };
  const bulkAdd = () => {
    const toAdd: GalleryMediaItem[] = [];
    bulkPicked.forEach((url) => {
      if (urlIndex.has(url)) return;
      const a = assets.find((x) => x.public_url === url);
      toAdd.push({
        url,
        kind: detectMediaKind(url, a?.mime_type ?? null),
        visible: true,
        alt: a?.alt_text || undefined,
      });
    });
    if (toAdd.length) onChange([...selected, ...toAdd]);
    setBulkPicked(new Set());
    setBulkMode(false);
  };
  const bulkSetVisible = (v: boolean) => {
    if (bulkPicked.size === 0) return;
    onChange(selected.map((s) => (bulkPicked.has(s.url) ? { ...s, visible: v } : s)));
    setBulkPicked(new Set());
    setBulkMode(false);
  };
  const bulkRemove = () => {
    if (bulkPicked.size === 0) return;
    onChange(selected.filter((s) => !bulkPicked.has(s.url)));
    setBulkPicked(new Set());
    setBulkMode(false);
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) void uploadMany(files);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={!!uploadInfo}>
              {uploadInfo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Enviar em massa
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const toAdd: GalleryMediaItem[] = [];
                filtered.forEach((a) => {
                  if (urlIndex.has(a.public_url)) return;
                  toAdd.push({
                    url: a.public_url,
                    kind: detectMediaKind(a.public_url, a.mime_type ?? null),
                    visible: true,
                    alt: a.alt_text || undefined,
                  });
                });
                if (toAdd.length) onChange([...selected, ...toAdd]);
                notifySuccess(`${toAdd.length} item(s) adicionados`);
              }}
              disabled={filtered.every((a) => urlIndex.has(a.public_url))}
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              Selecionar todos
            </Button>
            <Button
              size="sm"
              variant={bulkMode ? "default" : "outline"}
              onClick={() => { setBulkMode((v) => !v); setBulkPicked(new Set()); }}
            >
              {bulkMode ? <CheckSquare className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
              Modo seleção
            </Button>
          </div>
        </div>

        {uploadInfo && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate font-medium">{uploadInfo.name}</span>
              <span className="shrink-0 text-muted-foreground">{uploadInfo.stage} {uploadInfo.pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${uploadInfo.pct}%` }} />
            </div>
          </div>
        )}

        {/* Barra de ações em massa */}
        {bulkMode && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-primary/5 p-2 text-xs">
            <span className="font-medium">{bulkPicked.size} selecionado(s)</span>
            <Button size="sm" variant="outline" onClick={bulkAdd} disabled={bulkPicked.size === 0}>
              Adicionar à seção
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkSetVisible(true)} disabled={bulkPicked.size === 0}>
              <Eye className="mr-1 h-3 w-3" /> Marcar visível
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkSetVisible(false)} disabled={bulkPicked.size === 0}>
              <EyeOff className="mr-1 h-3 w-3" /> Marcar oculto
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={bulkRemove} disabled={bulkPicked.size === 0}>
              Remover da seção
            </Button>
          </div>
        )}

        {/* Selecionadas */}
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Selecionados ({selected.length})</span>
            {selected.length > 0 && (
              <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => onChange([])}>
                Limpar seleção
              </button>
            )}
          </div>
          {selected.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Clique nas miniaturas abaixo para adicionar (ou envie em massa).
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selected.map((it, i) => (
                <div key={it.url + i} className={cn("group relative", !it.visible && "opacity-50")}>
                  {it.kind === "video" ? (
                    <video src={it.url} muted playsInline preload="metadata" className="h-20 w-20 rounded border object-cover" />
                  ) : (
                    <img src={it.url} alt="" className="h-20 w-20 rounded border object-cover" loading="lazy" />
                  )}
                  <span className="absolute left-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded bg-black/60 text-[10px] text-white">
                    {it.kind === "video" ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVisible(i, !it.visible)}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded bg-black/60 text-white hover:bg-black"
                    title={it.visible ? "Ocultar do site" : "Tornar visível"}
                  >
                    {it.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 text-white opacity-0 transition group-hover:opacity-100">
                    <button type="button" onClick={() => move(i, -1)} className="p-1 hover:bg-white/20" aria-label="Anterior">
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <span className="px-1 text-[10px] font-semibold">#{i + 1}</span>
                    <button type="button" onClick={() => move(i, 1)} className="p-1 hover:bg-white/20" aria-label="Próximo">
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange(selected.filter((s) => s.url !== it.url))}
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remover"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou alt text…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando biblioteca…
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {assets.length === 0 ? "Nenhum arquivo na biblioteca. Envie o primeiro acima." : "Nenhum resultado para a busca."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((a) => {
              const sel = isSelected(a.public_url);
              const pos = urlIndex.get(a.public_url) ?? -1;
              const picked = bulkPicked.has(a.public_url);
              const kind = detectMediaKind(a.public_url, a.mime_type);
              return (
                <div
                  key={a.id}
                  className={cn(
                    "group relative overflow-hidden rounded-md border bg-card transition",
                    sel ? "border-primary ring-2 ring-primary" : "hover:border-primary/40",
                    picked && "ring-2 ring-amber-400",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => bulkMode ? togglePick(a.public_url) : toggle(a)}
                    className="relative block w-full"
                    title={bulkMode
                      ? (picked ? "Tirar da seleção" : "Marcar na seleção")
                      : (sel ? "Remover desta seção" : "Adicionar a esta seção")}
                  >
                    {kind === "video" ? (
                      <video src={a.public_url} muted playsInline preload="metadata" className="h-32 w-full object-cover" />
                    ) : (
                      <img src={a.public_url} alt={a.alt_text || a.filename} className="h-32 w-full object-cover" loading="lazy" />
                    )}
                    <span className="absolute left-2 top-2 inline-flex h-5 items-center gap-1 rounded bg-black/60 px-1.5 text-[10px] text-white">
                      {kind === "video" ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                      {kind}
                    </span>
                    {sel && (
                      <span className="absolute left-2 bottom-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow">
                        {pos + 1}
                      </span>
                    )}
                    <span
                      className={cn(
                        "absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-white shadow",
                        picked ? "bg-amber-500" : sel ? "bg-primary" : "bg-black/40 group-hover:bg-black/70",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  </button>
                  <div className="space-y-1.5 p-2">
                    <div className="truncate text-[11px] text-muted-foreground" title={a.filename}>{a.filename}</div>
                    <Input
                      value={a.alt_text || ""}
                      placeholder="Alt text (SEO)"
                      onChange={(e) => updateAlt(a.id, e.target.value)}
                      className="h-7 text-xs"
                    />
                    <div className="flex justify-end">
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => remove(a)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}