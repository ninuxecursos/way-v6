import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SectionEditorProps } from "./index";

export function CTAEditor({ data, defaults, onChange }: SectionEditorProps) {
  const v = data as {
    title1?: string; title2?: string; title3?: string;
    desc1?: string; desc2?: string;
    ctaLabel?: string; ctaUrl?: string;
  };
  const d = defaults as typeof v;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div><Label className="text-xs">Título — parte 1</Label>
          <Input value={v.title1 ?? d.title1 ?? ""} onChange={(e) => onChange({ ...data, title1: e.target.value })} /></div>
        <div><Label className="text-xs">Título — parte 2 (itálico)</Label>
          <Input value={v.title2 ?? d.title2 ?? ""} onChange={(e) => onChange({ ...data, title2: e.target.value })} /></div>
        <div><Label className="text-xs">Título — parte 3 (itálico)</Label>
          <Input value={v.title3 ?? d.title3 ?? ""} onChange={(e) => onChange({ ...data, title3: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Descrição — linha 1</Label>
          <Input value={v.desc1 ?? d.desc1 ?? ""} onChange={(e) => onChange({ ...data, desc1: e.target.value })} /></div>
        <div><Label className="text-xs">Descrição — linha 2</Label>
          <Input value={v.desc2 ?? d.desc2 ?? ""} onChange={(e) => onChange({ ...data, desc2: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Texto do botão</Label>
          <Input value={v.ctaLabel ?? d.ctaLabel ?? ""} onChange={(e) => onChange({ ...data, ctaLabel: e.target.value })} /></div>
        <div><Label className="text-xs">Link do botão</Label>
          <Input value={v.ctaUrl ?? d.ctaUrl ?? ""} onChange={(e) => onChange({ ...data, ctaUrl: e.target.value })} /></div>
      </div>
    </div>
  );
}