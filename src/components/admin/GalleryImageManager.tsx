import { toCdnUrl } from "@/lib/cdn";
/**
 * GalleryImageManager — gerenciador visual para selecionar quais imagens da
 * biblioteca de mídia aparecem em uma seção da página /galeria (hero ou
 * catálogo de fotos). Permite upload inline, edição de alt text, busca,
 * marcar/desmarcar com clique, e reordenar a lista de selecionadas.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, Check, Trash2, Search, ArrowUp, ArrowDown, X } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { cn } from "@/lib/utils";

interface MediaAsset {
  id: string;
  public_url: string;
  filename: string;
  alt_text: string;
  mime_type: string | null;
}

export function GalleryImageManager({
  title,
  hint,
  selected,
  onChange,
}: {
  title: string;
  hint?: string;
  selected: string[];
  onChange: (urls: string[]) => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("media_assets")
      .select("id, public_url, filename, alt_text, mime_type")
      .or("mime_type.like.image/%,mime_type.is.null")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) notifyError(error);
    setAssets((data ?? []) as MediaAsset[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const indexOf = (url: string) => selected.indexOf(url);

  const toggle = (url: string) => {
    if (selectedSet.has(url)) onChange(selected.filter((u) => u !== url));
    else onChange([...selected, url]);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= selected.length) return;
    const next = [...selected];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media-public").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("media-public").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("media_assets").insert({
        storage_path: path,
        public_url: toCdnUrl(pub.publicUrl),
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        alt_text: "",
      });
      if (dbErr) throw dbErr;
      notifySuccess("Imagem enviada e adicionada à seleção");
      onChange([...selected, toCdnUrl(pub.publicUrl)]);
      await load();
    } catch (e) { notifyError(e); }
    finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const updateAlt = async (id: string, alt_text: string) => {
    if (id.startsWith("ext:")) return;
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, alt_text } : a)));
    await supabase.from("media_assets").update({ alt_text }).eq("id", id);
  };

  const remove = async (a: MediaAsset) => {
    if (a.id.startsWith("ext:")) {
      onChange(selected.filter((u) => u !== a.public_url));
      return;
    }
    if (!confirm(`Excluir "${a.filename}" da biblioteca? Esta ação também remove o arquivo do storage.`)) return;
    const path = a.public_url.split("/media-public/")[1];
    if (path) await supabase.storage.from("media-public").remove([path]);
    await supabase.from("media_assets").delete().eq("id", a.id);
    setAssets((prev) => prev.filter((x) => x.id !== a.id));
    if (selectedSet.has(a.public_url)) onChange(selected.filter((u) => u !== a.public_url));
    notifySuccess("Mídia excluída");
  };

  const filtered = useMemo(() => {
    const known = new Set(assets.map((a) => a.public_url));
    const external: MediaAsset[] = selected
      .filter((url) => !known.has(url))
      .map((url) => ({
        id: `ext:${url}`,
        public_url: url,
        filename: url.split("/").pop() || url,
        alt_text: "",
        mime_type: "image/*",
      }));
    const all = [...external, ...assets];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((a) =>
      a.filename.toLowerCase().includes(q) || (a.alt_text || "").toLowerCase().includes(q));
  }, [assets, query, selected]);

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
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                files.forEach((f) => void upload(f));
              }}
            />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Enviar imagens
            </Button>
          </div>
        </div>

        {/* Selecionadas */}
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Selecionadas ({selected.length})</span>
            {selected.length > 0 && (
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onChange([])}
              >
                Limpar seleção
              </button>
            )}
          </div>
          {selected.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Clique nas imagens abaixo para adicionar à seção.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selected.map((url, i) => (
                <div key={url + i} className="group relative">
                  <img src={url} alt="" className="h-20 w-20 rounded border object-cover" loading="lazy" />
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
                    onClick={() => onChange(selected.filter((u) => u !== url))}
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

        {/* Busca */}
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
            {assets.length === 0 ? "Nenhuma imagem na biblioteca. Envie a primeira acima." : "Nenhum resultado para a busca."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((a) => {
              const isSelected = selectedSet.has(a.public_url);
              const pos = indexOf(a.public_url);
              return (
                <div
                  key={a.id}
                  className={cn(
                    "group relative overflow-hidden rounded-md border bg-card transition",
                    isSelected ? "border-primary ring-2 ring-primary" : "hover:border-primary/40",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggle(a.public_url)}
                    className="relative block w-full"
                    title={isSelected ? "Remover desta seção" : "Adicionar a esta seção"}
                  >
                    <img src={a.public_url} alt={a.alt_text || a.filename} className="h-32 w-full object-cover" loading="lazy" />
                    {isSelected && (
                      <span className="absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow">
                        {pos + 1}
                      </span>
                    )}
                    <span
                      className={cn(
                        "absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-white shadow",
                        isSelected ? "bg-primary" : "bg-black/40 group-hover:bg-black/70",
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