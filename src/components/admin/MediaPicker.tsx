import { toCdnUrl } from "@/lib/cdn";
/**
 * MediaPicker — abre a biblioteca de mídia (bucket `media-public`) em modal,
 * permite upload inline e devolve a URL pública selecionada.
 * Usado nos editores de seção e no painel de Branding.
 */
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImagePlus, Upload, X, Loader2, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyError, notifySuccess } from "@/lib/notify";

interface MediaAsset {
  id: string;
  public_url: string;
  filename: string;
  alt_text: string;
  mime_type?: string | null;
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogg|ogv)(\?|#|$)/i;
const isVideoUrl = (url: string) => !!url && VIDEO_EXT.test(url);

export function MediaPicker({
  value,
  onChange,
  label,
  hint,
  className,
  accept = "image/*",
  kind = "image",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  className?: string;
  /** MIME accept string para o input file. Default: "image/*". */
  accept?: string;
  /** Tipo principal aceito — controla preview e filtro da biblioteca. */
  kind?: "image" | "video";
}) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState(value);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setManualUrl(value); }, [value]);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("media_assets")
      .select("id, public_url, filename, alt_text, mime_type")
      .order("created_at", { ascending: false })
      .limit(180);
    if (kind === "video") q = q.like("mime_type", "video/%");
    else q = q.or("mime_type.like.image/%,mime_type.is.null");
    const { data, error } = await q;
    if (!error) setAssets((data ?? []) as MediaAsset[]);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `cms/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media-public")
        .upload(path, file, { upsert: true, cacheControl: "31536000" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("media-public").getPublicUrl(path);
      await supabase.from("media_assets").insert({
        storage_path: path,
        public_url: toCdnUrl(pub.publicUrl),
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });
      notifySuccess(kind === "video" ? "Vídeo enviado" : "Imagem enviada");
      onChange(toCdnUrl(pub.publicUrl));
      setOpen(false);
    } catch (e) {
      notifyError(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      {label && <Label className="text-xs">{label}</Label>}
      <div className="mt-1 flex items-center gap-2">
        {value ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
            {kind === "video" || isVideoUrl(value) ? (
              <video src={value} muted playsInline className="h-full w-full object-cover" />
            ) : (
              <img src={value} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-0 top-0 rounded-bl-md bg-black/60 p-0.5 text-white hover:bg-black"
              aria-label="Remover"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed bg-muted/40 text-muted-foreground">
            {kind === "video" ? <Film className="h-5 w-5" /> : <ImagePlus className="h-5 w-5" />}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1">
          <Input
            placeholder="https://... ou abrir biblioteca"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            onBlur={() => manualUrl !== value && onChange(manualUrl)}
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(true)}>
              <ImagePlus className="mr-1 h-3.5 w-3.5" /> Biblioteca
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
              Enviar
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
            />
          </div>
        </div>
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Biblioteca de mídia</DialogTitle></DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{assets.length} arquivos</p>
            <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
              Enviar nova
            </Button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : assets.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Nenhum arquivo ainda. Envie a primeira imagem.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {assets.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => { onChange(a.public_url); setOpen(false); }}
                    className="group relative aspect-square overflow-hidden rounded-md border bg-muted hover:ring-2 hover:ring-primary"
                  >
                    {(a.mime_type ?? "").startsWith("video/") || isVideoUrl(a.public_url) ? (
                      <video src={a.public_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    ) : (
                      <img src={a.public_url} alt={a.alt_text || a.filename} className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}