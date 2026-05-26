import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "../MediaPicker";
import { RepeaterField } from "../RepeaterField";
import { Instagram } from "lucide-react";
import type { SectionEditorProps } from "./index";

type Story = {
  videoUrl: string;
  posterUrl?: string;
  title?: string;
  author?: string;
  description?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

export function StoriesEditor({ data, defaults, onChange }: SectionEditorProps) {
  const v = data as {
    eyebrow?: string;
    titleA?: string;
    titleB?: string;
    desc?: string;
    items?: Story[];
  };
  const d = defaults as typeof v;
  const items: Story[] = v.items ?? d.items ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Eyebrow</Label>
          <Input
            value={v.eyebrow ?? d.eyebrow ?? ""}
            onChange={(e) => onChange({ ...data, eyebrow: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Título — parte 1</Label>
          <Input
            value={v.titleA ?? d.titleA ?? ""}
            onChange={(e) => onChange({ ...data, titleA: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Título — parte 2 (itálico)</Label>
          <Input
            value={v.titleB ?? d.titleB ?? ""}
            onChange={(e) => onChange({ ...data, titleB: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Descrição curta da seção</Label>
        <Textarea
          rows={2}
          value={v.desc ?? d.desc ?? ""}
          onChange={(e) => onChange({ ...data, desc: e.target.value })}
        />
      </div>

      <RepeaterField<Story>
        label="Stories (vídeos verticais 9:16)"
        items={items}
        onChange={(next) => onChange({ ...data, items: next })}
        newItem={() => ({
          videoUrl: "",
          posterUrl: "",
          title: "",
          author: "",
          description: "",
          ctaLabel: "",
          ctaUrl: "",
        })}
        itemLabel={(it, i) => it.title || `Story ${i + 1}`}
        renderItem={(item, update) => (
          <div className="space-y-3">
            <div className="rounded-md border border-dashed border-border bg-muted/40 p-3">
              <Label className="flex items-center gap-1.5 text-xs">
                <Instagram className="h-3.5 w-3.5" />
                URL do Instagram (post / reel)
              </Label>
              <Input
                placeholder="https://www.instagram.com/p/SHORTCODE/  ou  /reel/SHORTCODE/"
                value={
                  /instagram\.com\//i.test(item.videoUrl ?? "") ? item.videoUrl : ""
                }
                onChange={(e) => update({ videoUrl: e.target.value })}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Cole o link público do Instagram. O vídeo será exibido via embed
                oficial e um botão "Ver no Instagram" aparece no modal.
              </p>
            </div>

            <div className="text-center text-[11px] uppercase tracking-wider text-muted-foreground">
              ou faça upload de um arquivo
            </div>

            <MediaPicker
              label="Vídeo (formato vertical 9:16 — MP4/WebM)"
              kind="video"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              value={
                /instagram\.com\//i.test(item.videoUrl ?? "") ? "" : item.videoUrl
              }
              onChange={(url) => update({ videoUrl: url })}
              hint="Recomendado: até 60s, MP4 H.264, áudio AAC."
            />
            <MediaPicker
              label="Capa / poster (opcional)"
              value={item.posterUrl ?? ""}
              onChange={(url) => update({ posterUrl: url })}
              hint="Imagem 9:16 mostrada no card. Recomendada principalmente para links do Instagram."
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Título</Label>
                <Input
                  placeholder="Ex.: Tour da suíte"
                  value={item.title ?? ""}
                  onChange={(e) => update({ title: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Autor / @handle</Label>
                <Input
                  placeholder="wayhome"
                  value={item.author ?? ""}
                  onChange={(e) => update({ author: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição (texto ao lado do vídeo)</Label>
              <Textarea
                rows={5}
                placeholder="Conte a história, dê detalhes, mencione horários, valores etc."
                value={item.description ?? ""}
                onChange={(e) => update({ description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Botão (label)</Label>
                <Input
                  placeholder="Reservar agora"
                  value={item.ctaLabel ?? ""}
                  onChange={(e) => update({ ctaLabel: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Botão (URL)</Label>
                <Input
                  placeholder="https://..."
                  value={item.ctaUrl ?? ""}
                  onChange={(e) => update({ ctaUrl: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}