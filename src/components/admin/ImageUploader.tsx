/**
 * Uploader de imagem reutilizável para o painel admin.
 * Faz upload pro bucket `media-public` com compressão e retorna URL CDN.
 */
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyError, notifySuccess } from "@/lib/notify";
import { toCdnUrl } from "@/lib/cdn";

const loadCompress = () => import("@/lib/media-compress");

export async function uploadAdminImage(file: File, folder: string): Promise<string | null> {
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

export function ImageUploader({
  label, value, folder, onChange,
}: { label: string; value: string; folder: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      {value ? (
        <img src={toCdnUrl(value)} alt="" className="h-20 w-20 shrink-0 rounded object-contain bg-muted p-1" />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded bg-muted">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
        <div className="flex gap-1.5">
          <Input value={toCdnUrl(value)} onChange={(e) => onChange(e.target.value)} placeholder="URL ou envie um arquivo…" className="h-8 text-xs" />
          <input
            ref={ref} type="file" accept="image/*,image/svg+xml" className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]; e.currentTarget.value = "";
              if (!f) return;
              setBusy(true);
              const url = await uploadAdminImage(f, folder);
              setBusy(false);
              if (url) { onChange(url); notifySuccess("Imagem enviada"); }
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