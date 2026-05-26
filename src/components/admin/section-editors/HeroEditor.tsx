import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "../MediaPicker";
import type { SectionEditorProps } from "./index";

export function HeroEditor({ data, defaults, onChange }: SectionEditorProps) {
  const v = data as {
    line1?: string; line2a?: string; line2b?: string; line3?: string;
    subtitle?: string; ctaLabel?: string; ctaUrl?: string;
    images?: Record<string, string>;
    sizes?: Record<string, number | undefined>;
    spacing?: { logoTopMobile?: number; logoTopDesktop?: number };
  };
  const d = defaults as {
    line1?: string; line2a?: string; line2b?: string; line3?: string;
    subtitle?: string; ctaLabel?: string; ctaUrl?: string;
    images?: Record<string, string>;
  };
  const images = v.images ?? {};
  const dImg = d.images ?? {};
  const sizes = v.sizes ?? {};
  const spacing = v.spacing ?? {};
  const setImage = (k: string, url: string) => {
    const next = { ...images };
    if (url) next[k] = url; else delete next[k];
    onChange({ ...data, images: next });
  };
  const setSize = (k: string, val: string) => {
    const n = Number(val);
    const next = { ...sizes };
    if (!val || Number.isNaN(n) || n <= 0) delete next[k]; else next[k] = n;
    onChange({ ...data, sizes: next });
  };
  const setSpacing = (k: "logoTopMobile" | "logoTopDesktop", val: string) => {
    const n = Number(val);
    const next: { logoTopMobile?: number; logoTopDesktop?: number } = { ...spacing };
    if (!val || Number.isNaN(n) || n < 0) delete next[k]; else next[k] = n;
    onChange({ ...data, spacing: next });
  };
  const sizeFields: { key: string; label: string; placeholder: string }[] = [
    { key: "line1", label: "Linha 1 (px)", placeholder: "ex: 68" },
    { key: "line2", label: "Linha 2 (px)", placeholder: "ex: 68" },
    { key: "line3", label: "Linha 3 (px)", placeholder: "ex: 68" },
    { key: "subtitle", label: "Subtítulo (px)", placeholder: "ex: 18" },
    { key: "cta", label: "Botão CTA (px)", placeholder: "ex: 16" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Título — linha 1</Label>
          <Input value={v.line1 ?? d.line1 ?? ""} onChange={(e) => onChange({ ...data, line1: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Linha 3 (itálico)</Label>
          <Input value={v.line3 ?? d.line3 ?? ""} onChange={(e) => onChange({ ...data, line3: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Linha 2 — prefixo</Label>
          <Input value={v.line2a ?? d.line2a ?? ""} onChange={(e) => onChange({ ...data, line2a: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Linha 2 — destaque</Label>
          <Input value={v.line2b ?? d.line2b ?? ""} onChange={(e) => onChange({ ...data, line2b: e.target.value })} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Subtítulo</Label>
        <Textarea rows={2} value={v.subtitle ?? d.subtitle ?? ""} onChange={(e) => onChange({ ...data, subtitle: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Texto do botão</Label>
          <Input value={v.ctaLabel ?? d.ctaLabel ?? ""} onChange={(e) => onChange({ ...data, ctaLabel: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Link do botão</Label>
          <Input value={v.ctaUrl ?? d.ctaUrl ?? ""} onChange={(e) => onChange({ ...data, ctaUrl: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Imagens</h4>
        <MediaPicker label="Background" value={images.background ?? dImg.background ?? ""} onChange={(u) => setImage("background", u)} />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <MediaPicker
              key={i}
              label={`Avatar ${i}`}
              value={images[`avatar${i}`] ?? dImg[`avatar${i}`] ?? ""}
              onChange={(u) => setImage(`avatar${i}`, u)}
            />
          ))}
        </div>
      </div>
      <div className="space-y-2 rounded-md border border-border/60 p-3">
        <h4 className="text-sm font-semibold">Tamanhos de texto</h4>
        <p className="text-[11px] text-muted-foreground">
          Tamanho em pixels no desktop. No mobile escala automaticamente. Deixe vazio para usar o padrão.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {sizeFields.map((f) => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}</Label>
              <Input
                type="number"
                min={8}
                max={200}
                placeholder={f.placeholder}
                value={sizes[f.key] ?? ""}
                onChange={(e) => setSize(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2 rounded-md border border-border/60 p-3">
        <h4 className="text-sm font-semibold">Espaçamentos do logotipo</h4>
        <p className="text-[11px] text-muted-foreground">
          Distância do topo da página até o logotipo do hero (em pixels).
          Use para evitar sobreposição com o header. Deixe vazio para o padrão (mobile: 112px · desktop: 102px).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Topo no mobile (px)</Label>
            <Input
              type="number"
              min={0}
              max={400}
              placeholder="ex: 112"
              value={spacing.logoTopMobile ?? ""}
              onChange={(e) => setSpacing("logoTopMobile", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Topo no desktop (px)</Label>
            <Input
              type="number"
              min={0}
              max={400}
              placeholder="ex: 102"
              value={spacing.logoTopDesktop ?? ""}
              onChange={(e) => setSpacing("logoTopDesktop", e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}