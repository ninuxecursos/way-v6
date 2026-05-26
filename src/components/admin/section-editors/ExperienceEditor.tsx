import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "../MediaPicker";
import { RepeaterField } from "../RepeaterField";
import type { SectionEditorProps } from "./index";

type Card = { title: string; text: string };

export function ExperienceEditor({ data, defaults, onChange }: SectionEditorProps) {
  const v = data as {
    eyebrow?: string; titleA?: string; titleB?: string; desc?: string; ctaLabel?: string;
    big?: Card[]; small?: Card[];
    images?: Record<string, string>;
  };
  const d = defaults as {
    eyebrow?: string; titleA?: string; titleB?: string; desc?: string; ctaLabel?: string;
    big?: Card[]; small?: Card[];
    images?: Record<string, string>;
  };
  const images = v.images ?? {};
  const dImg = d.images ?? {};
  const setImage = (k: string, url: string) => {
    const next = { ...images };
    if (url) next[k] = url; else delete next[k];
    onChange({ ...data, images: next });
  };
  const big = v.big ?? d.big ?? [];
  const small = v.small ?? d.small ?? [];
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Descrição</Label>
          <Textarea rows={2} value={v.desc ?? d.desc ?? ""} onChange={(e) => onChange({ ...data, desc: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Texto do botão</Label>
          <Input value={v.ctaLabel ?? d.ctaLabel ?? ""} onChange={(e) => onChange({ ...data, ctaLabel: e.target.value })} />
        </div>
      </div>

      <RepeaterField<Card>
        label="Cards grandes (2)"
        items={big}
        onChange={(big) => onChange({ ...data, big })}
        newItem={() => ({ title: "", text: "" })}
        itemLabel={(it, i) => it.title || `Card ${i + 1}`}
        renderItem={(item, update, i) => (
          <div className="space-y-2">
            <Input placeholder="Título" value={item.title} onChange={(e) => update({ title: e.target.value })} />
            <Textarea rows={2} placeholder="Texto" value={item.text} onChange={(e) => update({ text: e.target.value })} />
            <MediaPicker label="Imagem" value={images[`big${i + 1}`] ?? dImg[`big${i + 1}`] ?? ""} onChange={(u) => setImage(`big${i + 1}`, u)} />
          </div>
        )}
      />

      <RepeaterField<Card>
        label="Cards pequenos (3)"
        items={small}
        onChange={(small) => onChange({ ...data, small })}
        newItem={() => ({ title: "", text: "" })}
        itemLabel={(it, i) => it.title || `Card ${i + 1}`}
        renderItem={(item, update, i) => (
          <div className="space-y-2">
            <Input placeholder="Título" value={item.title} onChange={(e) => update({ title: e.target.value })} />
            <Textarea rows={2} placeholder="Texto" value={item.text} onChange={(e) => update({ text: e.target.value })} />
            <MediaPicker label="Imagem" value={images[`small${i + 1}`] ?? dImg[`small${i + 1}`] ?? ""} onChange={(u) => setImage(`small${i + 1}`, u)} />
          </div>
        )}
      />
    </div>
  );
}