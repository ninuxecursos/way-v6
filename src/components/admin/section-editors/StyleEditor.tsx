/**
 * Editor de estilo da seção — por enquanto, escala global do tamanho dos textos.
 * Salvo em `data._style.textScale` (número, 1 = padrão).
 */
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface Props {
  data: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

export function SectionStyleEditor({ data, onChange }: Props) {
  const style = (data._style as Record<string, unknown> | undefined) ?? {};
  const get = (k: string) => (typeof style[k] === "number" ? (style[k] as number) : 1);
  const update = (k: string, val: number) => {
    const nextStyle = { ...style, [k]: val };
    onChange({ ...data, _style: nextStyle });
  };
  const fields: { key: string; label: string; help: string }[] = [
    { key: "textScale", label: "Geral (todos os textos)", help: "Escala todos os textos da seção." },
    { key: "headingScale", label: "Títulos (h1, h2, h3…)", help: "Aplica apenas aos títulos." },
    { key: "bodyScale", label: "Parágrafos e listas", help: "Aplica a parágrafos, listas e eyebrow." },
    { key: "buttonScale", label: "Botões", help: "Aplica aos botões da seção." },
  ];
  return (
    <div className="space-y-6">
      {fields.map((f) => {
        const val = get(f.key);
        return (
          <div key={f.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{f.label}</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tabular-nums text-muted-foreground">
                  {Math.round(val * 100)}%
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => update(f.key, 1)}
                  title="Restaurar (100%)"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <Slider
              min={0.6}
              max={1.8}
              step={0.05}
              value={[val]}
              onValueChange={(v) => update(f.key, v[0] ?? 1)}
            />
            <p className="text-[11px] text-muted-foreground">{f.help}</p>
          </div>
        );
      })}
      <p className="text-[11px] text-muted-foreground border-t pt-3">
        Vale para todas as seções (Experiência, Hospedagem, Camping, Localização, Feedback, CTA…). Reflete em tempo real no preview e no site após salvar.
      </p>
    </div>
  );
}
