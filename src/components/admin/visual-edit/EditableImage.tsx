/**
 * <EditableImage path="images.background" /> — em modo de edição,
 * sobrepõe um botão "Trocar" sobre a imagem. Em produção é transparente.
 */
import { useState, type CSSProperties, type ImgHTMLAttributes } from "react";
import { ImagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { useEditContext } from "./EditContext";

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  path: string;
  value: string;
  /** Wrapper opcional para herdar layout (ex: object-cover full-bleed). */
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
}

export function EditableImage({ path, value, wrapperClassName, wrapperStyle, ...imgProps }: Props) {
  const ctx = useEditContext();
  const [open, setOpen] = useState(false);

  if (!ctx) {
    // Sem URL? Não renderiza <img> (evita ícone de imagem quebrada / flicker).
    if (!value) return null;
    return <img {...imgProps} src={value} />;
  }

  return (
    <span className={"wh-editable wh-editable-image " + (wrapperClassName ?? "")} style={wrapperStyle}>
      {value ? <img {...imgProps} src={value} /> : (
        <span className="block h-full w-full bg-muted/30" aria-hidden />
      )}
      <button
        type="button"
        className="wh-editable-image__btn"
        onClick={(e) => { e.stopPropagation(); ctx.onSelect?.(ctx.sectionId); setOpen(true); }}
      >
        <ImagePlus className="h-3.5 w-3.5" /> Trocar imagem
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Trocar imagem</DialogTitle></DialogHeader>
          <MediaPicker
            value={value}
            onChange={(url) => { ctx.onPatch(ctx.sectionId, path, url); setOpen(false); }}
          />
        </DialogContent>
      </Dialog>
    </span>
  );
}