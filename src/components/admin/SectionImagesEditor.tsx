import { toCdnUrl } from "@/lib/cdn";
/**
 * Editor visual de imagens de uma seção do CMS.
 * Lista as chaves declaradas em SECTION_IMAGE_DEFAULTS e permite
 * sobrescrever via URL ou upload (bucket `media-public`).
 */
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, RotateCcw, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SECTION_IMAGE_DEFAULTS, listImageKeys, type SectionKey } from "@/lib/section-defaults";
import { notifyError, notifySuccess } from "@/lib/notify";

const TYPE_TO_SECTION: Record<string, SectionKey | undefined> = {
  hero: "hero",
  experience: "experience",
  camping: "camping",
  feedback: "feedback",
  location: "location",
  cadastur: "cadastur",
};

export function SectionImagesEditor({
  type,
  data,
  onChange,
}: {
  type: string;
  data: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const sectionKey = TYPE_TO_SECTION[type];
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  if (!sectionKey) {
    return <p className="text-xs text-muted-foreground">Esta seção não possui imagens configuráveis.</p>;
  }

  const keys = listImageKeys(sectionKey);
  const images = ((data?.images as Record<string, string> | undefined) ?? {}) as Record<string, string>;
  const hidden = ((data?.imagesHidden as Record<string, boolean> | undefined) ?? {}) as Record<string, boolean>;
  const defaults = SECTION_IMAGE_DEFAULTS[sectionKey] as Record<string, string>;

  const setImage = (key: string, url: string | null) => {
    const next = { ...images };
    if (url && url.trim().length > 0) next[key] = url.trim();
    else delete next[key];
    onChange({ ...data, images: next });
  };

  const toggleHidden = (key: string) => {
    const next = { ...hidden };
    if (next[key]) delete next[key];
    else next[key] = true;
    onChange({ ...data, imagesHidden: next });
  };

  const handleUpload = async (key: string, file: File) => {
    setUploadingKey(key);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `cms/${type}/${key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media-public").upload(path, file, { upsert: true });
    if (error) { setUploadingKey(null); notifyError(error); return; }
    const { data: pub } = supabase.storage.from("media-public").getPublicUrl(path);
    setImage(key, toCdnUrl(pub.publicUrl));
    setUploadingKey(null);
    notifySuccess("Imagem enviada");
  };

  return (
    <div className="space-y-3">
      {keys.map((key) => {
        const current = images[key] ?? "";
        const fallback = defaults[key];
        const preview = current || fallback;
        const isHidden = !!hidden[key];
        return (
          <div key={key} className={`flex items-start gap-3 p-3 border rounded-lg ${isHidden ? "opacity-60" : ""}`}>
            <img src={preview} alt={key} className="h-14 w-14 rounded object-cover bg-muted shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{key}</Label>
                <button
                  type="button"
                  onClick={() => toggleHidden(key)}
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  title={isHidden ? "Exibir imagem no site" : "Ocultar imagem no site"}
                >
                  {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                  {isHidden ? "Oculta" : "Visível"}
                </button>
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={current}
                  onChange={(e) => setImage(key, e.target.value || null)}
                  placeholder={fallback}
                  className="text-xs h-8"
                />
                <input
                  ref={(el) => { inputs.current[key] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(key, f); e.target.value = ""; }}
                />
                <Button type="button" size="sm" variant="outline" className="h-8 px-2"
                  onClick={() => inputs.current[key]?.click()} disabled={uploadingKey === key}>
                  <Upload size={12} />
                </Button>
                {current && (
                  <Button type="button" size="sm" variant="ghost" className="h-8 px-2"
                    onClick={() => setImage(key, null)} title="Restaurar padrão">
                    <RotateCcw size={12} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}