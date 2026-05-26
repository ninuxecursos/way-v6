import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SectionEditorProps } from "./index";

export function LocationEditor({ data, defaults, onChange }: SectionEditorProps) {
  const v = data as { marquee1?: string; marquee2?: string; marquee3?: string; marquee4?: string };
  const d = defaults as typeof v;
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Cada par compõe o banner deslizante. O segundo trecho de cada par é exibido em itálico/destaque.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Texto 1</Label>
          <Input value={v.marquee1 ?? d.marquee1 ?? ""} onChange={(e) => onChange({ ...data, marquee1: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Texto 2 (itálico)</Label>
          <Input value={v.marquee2 ?? d.marquee2 ?? ""} onChange={(e) => onChange({ ...data, marquee2: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Texto 3</Label>
          <Input value={v.marquee3 ?? d.marquee3 ?? ""} onChange={(e) => onChange({ ...data, marquee3: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Texto 4 (itálico)</Label>
          <Input value={v.marquee4 ?? d.marquee4 ?? ""} onChange={(e) => onChange({ ...data, marquee4: e.target.value })} />
        </div>
      </div>
    </div>
  );
}