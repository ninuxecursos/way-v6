import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "../MediaPicker";
import type { SectionEditorProps } from "./index";

export function CampingEditor({ data, defaults, onChange }: SectionEditorProps) {
  const v = data as {
    subtitle?: string; title?: string; desc?: string;
    ctaLabel?: string; ctaUrl?: string;
    images?: Record<string, string>;
  };
  const d = defaults as typeof v;
  const images = v.images ?? {};
  const dImg = d.images ?? {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Subtítulo (eyebrow)</Label>
          <Input value={v.subtitle ?? d.subtitle ?? ""} onChange={(e) => onChange({ ...data, subtitle: e.target.value })} /></div>
        <div><Label className="text-xs">Título</Label>
          <Input value={v.title ?? d.title ?? ""} onChange={(e) => onChange({ ...data, title: e.target.value })} /></div>
      </div>
      <div>
        <Label className="text-xs">Descrição</Label>
        <Textarea rows={3} value={v.desc ?? d.desc ?? ""} onChange={(e) => onChange({ ...data, desc: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Texto do botão</Label>
          <Input value={v.ctaLabel ?? d.ctaLabel ?? ""} onChange={(e) => onChange({ ...data, ctaLabel: e.target.value })} /></div>
        <div><Label className="text-xs">Link do botão</Label>
          <Input value={v.ctaUrl ?? d.ctaUrl ?? ""} onChange={(e) => onChange({ ...data, ctaUrl: e.target.value })} /></div>
      </div>
      <MediaPicker
        label="Imagem de fundo"
        value={images.background ?? dImg.background ?? ""}
        onChange={(u) => {
          const next = { ...images };
          if (u) next.background = u; else delete next.background;
          onChange({ ...data, images: next });
        }}
      />
    </div>
  );
}