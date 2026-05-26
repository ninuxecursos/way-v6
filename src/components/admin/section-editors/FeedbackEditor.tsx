import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "../MediaPicker";
import { RepeaterField } from "../RepeaterField";
import type { SectionEditorProps } from "./index";

type Testi = { name: string; quote: string; avatar: string };

export function FeedbackEditor({ data, defaults, onChange }: SectionEditorProps) {
  const v = data as { eyebrow?: string; titleA?: string; titleB?: string; desc?: string; testimonials?: Testi[] };
  const d = defaults as typeof v;
  const items = v.testimonials ?? d.testimonials ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div><Label className="text-xs">Eyebrow</Label>
          <Input value={v.eyebrow ?? d.eyebrow ?? ""} onChange={(e) => onChange({ ...data, eyebrow: e.target.value })} /></div>
        <div><Label className="text-xs">Título — parte 1</Label>
          <Input value={v.titleA ?? d.titleA ?? ""} onChange={(e) => onChange({ ...data, titleA: e.target.value })} /></div>
        <div><Label className="text-xs">Título — parte 2 (itálico)</Label>
          <Input value={v.titleB ?? d.titleB ?? ""} onChange={(e) => onChange({ ...data, titleB: e.target.value })} /></div>
      </div>
      <div>
        <Label className="text-xs">Descrição</Label>
        <Textarea rows={2} value={v.desc ?? d.desc ?? ""} onChange={(e) => onChange({ ...data, desc: e.target.value })} />
      </div>
      <RepeaterField<Testi>
        label="Depoimentos"
        items={items}
        onChange={(testimonials) => onChange({ ...data, testimonials })}
        newItem={() => ({ name: "", quote: "", avatar: "" })}
        itemLabel={(it, i) => it.name || `Depoimento ${i + 1}`}
        renderItem={(item, update) => (
          <div className="space-y-2">
            <Input placeholder="Nome" value={item.name} onChange={(e) => update({ name: e.target.value })} />
            <Textarea rows={4} placeholder="Texto do depoimento" value={item.quote} onChange={(e) => update({ quote: e.target.value })} />
            <MediaPicker label="Avatar" value={item.avatar} onChange={(u) => update({ avatar: u })} />
          </div>
        )}
      />
    </div>
  );
}