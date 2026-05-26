import { toCdnUrl } from "@/lib/cdn";
/**
 * Biblioteca de mídia: upload para bucket media-public, listagem,
 * alt text obrigatório, cópia de URL para colar nos JSONs das seções.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Copy, Trash2 } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useConfirmDelete } from "@/components/common/ConfirmDeleteProvider";
// Carregamento dinâmico (módulo `.client.ts` não pode ser importado em SSR).
const loadCompress = () => import("@/lib/media-compress");

interface MediaRow {
  id: string;
  storage_path: string;
  public_url: string;
  filename: string;
  alt_text: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export const Route = createFileRoute("/admin/media")({
  component: MediaLibrary,
});

function MediaLibrary() {
  const [items, setItems] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; stage: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const confirmDelete = useConfirmDelete();

  const load = async () => {
    const { data } = await supabase
      .from("media_assets")
      .select("id, storage_path, public_url, filename, alt_text, mime_type, size_bytes, created_at")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as MediaRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    let okCount = 0;
    for (let i = 0; i < files.length; i++) {
      const original = files[i];
      setProgress({ done: i, total: files.length, stage: `Comprimindo ${original.name}…` });
      let file = original;
      try {
        const { compressMediaFile } = await loadCompress();
        file = await compressMediaFile(original, (p) =>
          setProgress({ done: i, total: files.length, stage: `${p.stage} (${Math.round(p.pct)}%)` }),
        );
      } catch (err) {
        console.warn("compress failed", err);
      }
      setProgress({ done: i, total: files.length, stage: `Enviando ${file.name}…` });
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media-public").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) { notifyError(upErr); continue; }
      const { data: urlData } = supabase.storage.from("media-public").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("media_assets").insert({
        storage_path: path,
        public_url: toCdnUrl(urlData.publicUrl),
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        alt_text: "",
      });
      if (dbErr) notifyError(dbErr); else okCount++;
    }
    setProgress(null);
    setUploading(false);
    if (okCount > 0) notifySuccess(`${okCount} arquivo(s) enviado(s)`);
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const updateAlt = async (id: string, alt_text: string) => {
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, alt_text } : m)));
    await supabase.from("media_assets").update({ alt_text }).eq("id", id);
  };

  const remove = async (m: MediaRow) => {
    const ok = await confirmDelete({
      title: "Excluir mídia?",
      description: "O arquivo será removido do storage e desvinculado das seções que o utilizam.",
      resourceLabel: m.filename,
    });
    if (!ok) return;
    await supabase.storage.from("media-public").remove([m.storage_path]);
    await supabase.from("media_assets").delete().eq("id", m.id);
    setItems((prev) => prev.filter((x) => x.id !== m.id));
    notifySuccess("Mídia excluída.");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mídia</h1>
          <p className="text-muted-foreground mt-1">Biblioteca de imagens e arquivos</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Enviando..." : "Enviar arquivos"}
          </Button>
        </div>
      </div>
      {progress && (
        <div className="text-xs text-muted-foreground bg-muted/50 border rounded-md px-3 py-2">
          {progress.done}/{progress.total} — {progress.stage}
        </div>
      )}
      <Card>
        <CardHeader><CardTitle>Arquivos ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-muted-foreground">Carregando...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((m) => (
                <div key={m.id} className="border rounded-md overflow-hidden bg-card">
                  {m.mime_type?.startsWith("image/") ? (
                    <img src={toCdnUrl(m.public_url)} alt={m.alt_text} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 flex items-center justify-center bg-muted text-muted-foreground text-xs">{m.mime_type}</div>
                  )}
                  <div className="p-3 space-y-2">
                    <div className="text-xs text-muted-foreground truncate" title={m.filename}>{m.filename}</div>
                    <Input
                      placeholder="Alt text (obrigatório p/ SEO)"
                      value={m.alt_text}
                      onChange={(e) => updateAlt(m.id, e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => navigator.clipboard.writeText(toCdnUrl(m.public_url))}>
                        <Copy className="h-3 w-3 mr-1" />URL
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(m)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && <div className="text-sm text-muted-foreground col-span-full text-center py-8">Nenhum arquivo ainda.</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}