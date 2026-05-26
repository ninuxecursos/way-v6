/**
 * Item de seção ordenável com hierarquia visual clara, ícone do tipo e
 * controles de visibilidade descobríveis por tooltip.
 */
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  BedDouble,
  Tent,
  MapPin,
  MessagesSquare,
  Megaphone,
  LayoutTemplate,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SECTION_LABELS, type SectionType, type SectionRow } from "@/lib/cms-types";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<string, LucideIcon> = {
  hero: ImageIcon,
  experience: Sparkles,
  hospedagem: BedDouble,
  camping: Tent,
  location: MapPin,
  feedback: MessagesSquare,
  cta: Megaphone,
};

interface Props {
  section: SectionRow;
  selected?: boolean;
  onToggleVisible: () => void;
  onToggleMobile: () => void;
  onToggleDesktop: () => void;
  onDelete: () => void;
}

export function SortableSection({
  section,
  selected,
  onToggleVisible,
  onToggleMobile,
  onToggleDesktop,
  onDelete,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const label = SECTION_LABELS[section.type as SectionType] ?? section.type;
  const Icon = SECTION_ICONS[section.type] ?? LayoutTemplate;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-stretch rounded-lg border bg-card transition-colors",
        "hover:border-primary/40",
        selected && "border-primary/60 bg-accent/40",
        !section.visible && "opacity-70",
      )}
    >
      {/* selected indicator bar */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 left-0 w-0.5 rounded-full transition-colors",
          selected ? "bg-primary" : "bg-transparent",
        )}
      />

      {/* drag handle */}
      <button
        {...attributes}
        {...listeners}
        aria-label="Arrastar para reordenar"
        className="flex items-center px-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* main content */}
      <div className="flex-1 min-w-0 py-2.5 pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid place-items-center h-7 w-7 rounded-md bg-muted text-muted-foreground shrink-0">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium leading-tight truncate">{label}</div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              {section.type}
            </div>
          </div>
        </div>

        {/* visibility row */}
        <div className="mt-2 flex items-center gap-0.5 -ml-1">
          <IconToggle
            tip={section.visible ? "Visível no site" : "Oculto no site"}
            active={section.visible}
            onClick={onToggleVisible}
            icon={section.visible ? Eye : EyeOff}
          />
          <IconToggle
            tip={section.visible_desktop ? "Visível no desktop" : "Oculto no desktop"}
            active={section.visible_desktop}
            onClick={onToggleDesktop}
            icon={Monitor}
          />
          <IconToggle
            tip={section.visible_mobile ? "Visível no mobile" : "Oculto no mobile"}
            active={section.visible_mobile}
            onClick={onToggleMobile}
            icon={Smartphone}
          />

          <span className="ml-auto" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={onDelete}
                aria-label="Excluir seção"
                className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

function IconToggle({
  tip,
  active,
  onClick,
  icon: Icon,
}: {
  tip: string;
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          aria-label={tip}
          aria-pressed={active}
          className={cn(
            "h-7 w-7",
            active ? "text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
