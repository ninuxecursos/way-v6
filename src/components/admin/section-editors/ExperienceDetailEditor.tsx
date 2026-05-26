import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "../MediaPicker";
import { RepeaterField } from "../RepeaterField";
import type { SectionEditorProps } from "./index";

type Benefit = { icon?: string; title?: string; text?: string };
type Info = { label?: string; value?: string };
type Institutional = { title?: string; text?: string; image?: string };

type V = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  banner?: string;
  intro?: string;
  benefits?: Benefit[];
  info?: Info[];
  institutional?: Institutional;
  gallery?: string[];
  ctaLabel?: string;
  ctaUrl?: string;
};

export function ExperienceDetailEditor({ data, defaults, onChange }: SectionEditorProps) {
  const v = data as V;
  const d = defaults as V;
  const get = <K extends keyof V>(k: K): V[K] => (v[k] ?? d[k]) as V[K];

  const set = (patch: Partial<V>) => onChange({ ...data, ...patch });

  const gallery = (v.gallery ?? d.gallery ?? []) as string[];
  const inst = (v.institutional ?? d.institutional ?? {}) as Institutional;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Eyebrow</Label>
          <Input value={(get("eyebrow") as string) ?? ""} onChange={(e) => set({ eyebrow: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Título principal (H1)</Label>
          <Input value={(get("title") as string) ?? ""} onChange={(e) => set({ title: e.target.value })} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Subtítulo</Label>
        <Input value={(get("subtitle") as string) ?? ""} onChange={(e) => set({ subtitle: e.target.value })} />
      </div>

      <MediaPicker
        label="Banner principal"
        value={(get("banner") as string) ?? ""}
        onChange={(u) => set({ banner: u })}
      />

      <div>
        <Label className="text-xs">Descrição rica (introdução)</Label>
        <Textarea rows={5} value={(get("intro") as string) ?? ""} onChange={(e) => set({ intro: e.target.value })} />
      </div>

      <RepeaterField<Benefit>
        label="Benefícios (ícone + título + texto)"
        items={(v.benefits ?? d.benefits ?? []) as Benefit[]}
        onChange={(benefits) => set({ benefits })}
        newItem={() => ({ icon: "Sparkles", title: "", text: "" })}
        itemLabel={(it, i) => it.title || `Benefício ${i + 1}`}
        renderItem={(item, update) => (
          <div className="space-y-2">
            <Input placeholder="Ícone (nome lucide-react, ex: Sparkles, BedDouble, Coffee)" value={item.icon ?? ""} onChange={(e) => update({ icon: e.target.value })} />
            <Input placeholder="Título" value={item.title ?? ""} onChange={(e) => update({ title: e.target.value })} />
            <Textarea rows={2} placeholder="Texto" value={item.text ?? ""} onChange={(e) => update({ text: e.target.value })} />
          </div>
        )}
      />

      <RepeaterField<Info>
        label="Bloco de informações (label + valor)"
        items={(v.info ?? d.info ?? []) as Info[]}
        onChange={(info) => set({ info })}
        newItem={() => ({ label: "", value: "" })}
        itemLabel={(it, i) => it.label || `Item ${i + 1}`}
        renderItem={(item, update) => (
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Label" value={item.label ?? ""} onChange={(e) => update({ label: e.target.value })} />
            <Input placeholder="Valor" value={item.value ?? ""} onChange={(e) => update({ value: e.target.value })} />
          </div>
        )}
      />

      <RepeaterField<{ url: string }>
        label="Galeria de fotos"
        items={gallery.map((url) => ({ url }))}
        onChange={(items) => set({ gallery: items.map((i) => i.url).filter(Boolean) })}
        newItem={() => ({ url: "" })}
        itemLabel={(it, i) => it.url ? `Foto ${i + 1}` : `Foto ${i + 1} (vazia)`}
        renderItem={(item, update) => (
          <MediaPicker label="Imagem" value={item.url} onChange={(u) => update({ url: u })} />
        )}
      />

      <div className="space-y-3 rounded-md border p-4">
        <Label className="text-xs font-semibold uppercase tracking-wider">Bloco institucional</Label>
        <Input placeholder="Título" value={inst.title ?? ""} onChange={(e) => set({ institutional: { ...inst, title: e.target.value } })} />
        <Textarea rows={3} placeholder="Texto" value={inst.text ?? ""} onChange={(e) => set({ institutional: { ...inst, text: e.target.value } })} />
        <MediaPicker label="Imagem" value={inst.image ?? ""} onChange={(u) => set({ institutional: { ...inst, image: u } })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Texto do botão final</Label>
          <Input value={(get("ctaLabel") as string) ?? ""} onChange={(e) => set({ ctaLabel: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Link do botão final</Label>
          <Input value={(get("ctaUrl") as string) ?? ""} onChange={(e) => set({ ctaUrl: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
