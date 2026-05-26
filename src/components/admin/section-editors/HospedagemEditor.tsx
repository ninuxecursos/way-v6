import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RepeaterField } from "../RepeaterField";
import type { SectionEditorProps } from "./index";

type Pkg = {
  name: string; capacity: string; price: string; priceLabel: string;
  badge: string; badgeTone: "soldout" | "last" | "available";
  includes: string[]; bathroom: string; altPrice?: string; ctaUrl?: string;
};

export function HospedagemEditor({ data, defaults, onChange }: SectionEditorProps) {
  const v = data as {
    eyebrow?: string; titleA?: string; titleB?: string; titleC?: string; desc?: string; packages?: Pkg[];
  };
  const d = defaults as typeof v;
  const packages = v.packages ?? d.packages ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <div><Label className="text-xs">Eyebrow</Label>
          <Input value={v.eyebrow ?? d.eyebrow ?? ""} onChange={(e) => onChange({ ...data, eyebrow: e.target.value })} /></div>
        <div><Label className="text-xs">Título A</Label>
          <Input value={v.titleA ?? d.titleA ?? ""} onChange={(e) => onChange({ ...data, titleA: e.target.value })} /></div>
        <div><Label className="text-xs">Título B (itálico)</Label>
          <Input value={v.titleB ?? d.titleB ?? ""} onChange={(e) => onChange({ ...data, titleB: e.target.value })} /></div>
        <div><Label className="text-xs">Título C</Label>
          <Input value={v.titleC ?? d.titleC ?? ""} onChange={(e) => onChange({ ...data, titleC: e.target.value })} /></div>
      </div>
      <div>
        <Label className="text-xs">Descrição</Label>
        <Textarea rows={2} value={v.desc ?? d.desc ?? ""} onChange={(e) => onChange({ ...data, desc: e.target.value })} />
      </div>

      <RepeaterField<Pkg>
        label="Pacotes"
        items={packages}
        onChange={(packages) => onChange({ ...data, packages })}
        newItem={() => ({
          name: "", capacity: "", price: "", priceLabel: "Valor por pessoa",
          badge: "Disponível", badgeTone: "available",
          includes: [], bathroom: "", altPrice: "", ctaUrl: "",
        })}
        itemLabel={(it, i) => it.name || `Pacote ${i + 1}`}
        renderItem={(item, update) => (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Nome" value={item.name} onChange={(e) => update({ name: e.target.value })} />
              <Input placeholder="Capacidade" value={item.capacity} onChange={(e) => update({ capacity: e.target.value })} />
              <Input placeholder="Preço (R$ 1.500)" value={item.price} onChange={(e) => update({ price: e.target.value })} />
              <Input placeholder="Label do preço" value={item.priceLabel} onChange={(e) => update({ priceLabel: e.target.value })} />
              <Input placeholder="Badge" value={item.badge} onChange={(e) => update({ badge: e.target.value })} />
              <Select value={item.badgeTone} onValueChange={(badgeTone) => update({ badgeTone: badgeTone as Pkg["badgeTone"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="last">Últimas vagas</SelectItem>
                  <SelectItem value="soldout">Esgotado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Banheiro" value={item.bathroom} onChange={(e) => update({ bathroom: e.target.value })} />
            <Input placeholder="Preço alternativo (opcional)" value={item.altPrice ?? ""} onChange={(e) => update({ altPrice: e.target.value })} />
            <Input placeholder="Link de checkout (URL)" value={item.ctaUrl ?? ""} onChange={(e) => update({ ctaUrl: e.target.value })} />
            <div>
              <Label className="text-xs">Itens inclusos (um por linha)</Label>
              <Textarea
                rows={6}
                value={item.includes.join("\n")}
                onChange={(e) => update({ includes: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
              />
            </div>
          </div>
        )}
      />
    </div>
  );
}