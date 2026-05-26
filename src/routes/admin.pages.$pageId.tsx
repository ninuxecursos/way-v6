/**
 * Editor de página em layout de 3 painéis:
 *   [Rail de Seções] | [Inspector da seção] | [Preview ao vivo]
 * Metadados da página vivem num Sheet lateral acionado pelo topbar.
 */
import { createFileRoute, Link, useParams, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Save,
  ExternalLink,
  Smartphone,
  Monitor,
  Settings2,
  Globe,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  BedDouble,
  Tent,
  MapPin,
  MessagesSquare,
  Megaphone,
  CircleDot,
  MousePointerClick,
  Eye,
  Film,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SortableSection } from "@/components/admin/SortableSection";
import { SectionImagesEditor } from "@/components/admin/SectionImagesEditor";
import { SectionStyleEditor } from "@/components/admin/section-editors/StyleEditor";
import { SECTION_EDITORS } from "@/components/admin/section-editors";
import { SECTION_LABELS, type SectionRow, type SectionType, type PageRow } from "@/lib/cms-types";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useConfirmDelete } from "@/components/common/ConfirmDeleteProvider";
import { SectionsPreview } from "@/components/wh/SectionsRenderer";
import { cn } from "@/lib/utils";
import { setByPath } from "@/components/admin/visual-edit/EditContext";
import { getSectionDefaults } from "@/lib/section-content-defaults";

export const Route = createFileRoute("/admin/pages/$pageId")({
  component: PageEditor,
});

const SECTION_META: Record<string, { icon: LucideIcon; description: string }> = {
  hero: { icon: ImageIcon, description: "Banner principal com título e CTA" },
  experience: { icon: Sparkles, description: "Bloco da experiência Way Home" },
  experience_detail: { icon: Sparkles, description: "Página de experiência (banner, galeria, benefícios, info, institucional)" },
  hospedagem: { icon: BedDouble, description: "Suítes e pacotes de hospedagem" },
  camping: { icon: Tent, description: "Opções de camping" },
  stories: { icon: Film, description: "Vídeos verticais 9:16 (estilo stories)" },
  location: { icon: MapPin, description: "Marquee/banner de localização" },
  feedback: { icon: MessagesSquare, description: "Depoimentos de clientes" },
  cta: { icon: Megaphone, description: "Call-to-action final da página" },
};

function PageEditor() {
  const { pageId } = useParams({ from: "/admin/pages/$pageId" });
  const confirmDelete = useConfirmDelete();
  const router = useRouter();
  const [page, setPage] = useState<PageRow | null>(null);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const [metaOpen, setMetaOpen] = useState(false);
  const [visualEdit, setVisualEdit] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("pages").select("*").eq("id", pageId).single(),
      supabase
        .from("page_sections")
        .select("*")
        .eq("page_id", pageId)
        .order("position", { ascending: true })
        .order("id", { ascending: true }),
    ]);
    setPage(p as PageRow | null);
    const list = (s ?? []) as SectionRow[];
    setSections(list);
    setSelectedId((prev) => prev ?? list[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [pageId]);

  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) ?? null,
    [sections, selectedId],
  );

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sections, oldIndex, newIndex);
    // Otimista no UI
    setSections(reordered.map((s, i) => ({ ...s, position: i })));
    // Persistência sequencial — evita colisões intermediárias e garante
    // que a ordem salva no banco seja exatamente a exibida.
    for (let i = 0; i < reordered.length; i++) {
      const { error } = await supabase
        .from("page_sections")
        .update({ position: i })
        .eq("id", reordered[i].id);
      if (error) { notifyError(error); break; }
    }
    // Recarrega do banco para confirmar a ordem efetivamente persistida.
    await load();
    // Força refresh do preview (iframe interno re-renderiza com nova ordem).
    setPreviewKey((k) => k + 1);
  };

  const updateSection = async (id: string, patch: Partial<SectionRow>) => {
    // Quando salvamos `data`, removemos quaisquer chaves de mesmo nome em
    // data_i18n['pt-BR'] — o conteúdo base ESTÁ em PT, então um override
    // pt-BR para a mesma chave só serve para sombrear edições recentes
    // (era esse o bug "alterações no admin não refletem no site").
    let nextLocal: Partial<SectionRow> = patch;
    let dbPatch: Record<string, unknown> = JSON.parse(JSON.stringify(patch));
    if (patch.data) {
      const current = sections.find((s) => s.id === id);
      const currentI18n = ((current as unknown as { data_i18n?: Record<string, Record<string, unknown>> } | undefined)?.data_i18n) ?? {};
      const ptOverride = { ...(currentI18n["pt-BR"] ?? {}) };
      for (const k of Object.keys(patch.data)) delete ptOverride[k];
      const nextI18n = { ...currentI18n, "pt-BR": ptOverride };
      nextLocal = { ...patch, ...({ data_i18n: nextI18n } as unknown as Partial<SectionRow>) };
      dbPatch = { ...dbPatch, data_i18n: nextI18n };
    }
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...nextLocal } : s)));
    const { error } = await supabase.from("page_sections").update(dbPatch as never).eq("id", id);
    if (error) { notifyError(error); return; }
    // Invalida loaders públicos (Home etc.) para refletir mudanças do CMS no front.
    void router.invalidate();
  };

  /** Atualiza apenas o estado local (preview ao vivo) — não escreve no DB. */
  const updateSectionDataLocal = (id: string, data: Record<string, unknown>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, data } : s)));
  };

  /** Patch in-place vindo do editor visual: atualiza local e persiste no DB. */
  const handleVisualPatch = (sectionId: string, path: string, value: unknown) => {
    const target = sections.find((s) => s.id === sectionId);
    if (!target) return;
    const nextData = setByPath((target.data ?? {}) as Record<string, unknown>, path, value);
    void updateSection(sectionId, { data: nextData });
  };

  const deleteSection = async (id: string) => {
    const target = sections.find((s) => s.id === id);
    const ok = await confirmDelete({
      title: "Excluir esta seção?",
      description: "A seção será removida da página. Esta ação não pode ser desfeita.",
      resourceLabel: target?.type,
    });
    if (!ok) return;
    await supabase.from("page_sections").delete().eq("id", id);
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const addSection = async (type: SectionType) => {
    const position = sections.length;
    const { data, error } = await supabase
      .from("page_sections")
      .insert({ page_id: pageId, type, position, data: {} })
      .select()
      .single();
    if (error) { notifyError(error); return; }
    notifySuccess("Seção adicionada");
    const row = data as SectionRow;
    setSections((prev) => [...prev, row]);
    setSelectedId(row.id);
  };

  const togglePublish = async () => {
    if (!page) return;
    setSaving(true);
    const newStatus = page.status === "published" ? "draft" : "published";
    if (newStatus === "published") {
      await supabase.from("page_versions").insert({
        page_id: page.id,
        snapshot: JSON.parse(JSON.stringify({ page, sections })),
        note: "Publicação automática",
      });
    }
    await supabase.from("pages").update({ status: newStatus }).eq("id", page.id);
    setPage({ ...page, status: newStatus });
    setSaving(false);
    notifySuccess(newStatus === "published" ? "Página publicada" : "Despublicada");
  };

  if (loading || !page) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  const previewUrl = page.slug === "home" ? "/" : `/${page.slug}`;
  const isPublished = page.status === "published";

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-muted/30">
      {/* Topbar do editor */}
      <header className="shrink-0 h-14 border-b bg-background flex items-center gap-3 px-4">
        <Link to="/admin/pages">
          <Button variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-1.5" />Voltar
          </Button>
        </Link>
        <div className="h-5 w-px bg-border" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-semibold truncate">{page.title}</h1>
            <Badge
              variant={isPublished ? "default" : "secondary"}
              className={cn(
                "h-5 text-[10px] uppercase tracking-wider px-1.5 shrink-0",
                isPublished && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
              )}
            >
              {isPublished ? "Publicado" : "Rascunho"}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <Globe className="h-3 w-3" /> {previewUrl}
          </div>
        </div>
        <Sheet open={metaOpen} onOpenChange={setMetaOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-1.5" />Metadados
            </Button>
          </SheetTrigger>
          <MetaSheet page={page} setPage={setPage} />
        </Sheet>
        <Button variant="outline" size="sm" asChild>
          <a href={previewUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-1.5" />Abrir
          </a>
        </Button>
        <Button size="sm" onClick={togglePublish} disabled={saving}>
          <Save className="h-4 w-4 mr-1.5" />
          {isPublished ? "Despublicar" : "Publicar"}
        </Button>
      </header>

      {/* 3 painéis */}
      <div className="flex-1 min-h-0 flex">
        {/* PAINEL 1 — Rail de seções */}
        <aside className="w-[300px] shrink-0 border-r bg-background flex flex-col min-h-0">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Seções</div>
              <div className="text-[11px] text-muted-foreground">
                {sections.length} {sections.length === 1 ? "bloco" : "blocos"} nesta página
              </div>
            </div>
            <AddSectionPopover onAdd={addSection} />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {sections.map((s) => (
                  <div key={s.id} onClick={() => setSelectedId(s.id)} className="cursor-pointer">
                    <SortableSection
                      section={s}
                      selected={selectedId === s.id}
                      onToggleVisible={() => updateSection(s.id, { visible: !s.visible })}
                      onToggleMobile={() => updateSection(s.id, { visible_mobile: !s.visible_mobile })}
                      onToggleDesktop={() => updateSection(s.id, { visible_desktop: !s.visible_desktop })}
                      onDelete={() => deleteSection(s.id)}
                    />
                  </div>
                ))}
                {sections.length === 0 && (
                  <div className="text-xs text-muted-foreground p-6 text-center border border-dashed rounded-lg">
                    Nenhuma seção ainda.
                    <br />Use o botão <strong>+ Adicionar</strong> acima.
                  </div>
                )}
              </SortableContext>
            </DndContext>
          </div>
        </aside>

        {/* PAINEL 2 + 3 — Inspector + Preview (resizable) */}
        <div className="flex-1 min-w-0">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={45} minSize={32}>
              <div className="h-full flex flex-col bg-background">
                {selected ? (
                  <SectionInspector
                    key={selected.id}
                    section={selected}
                    onLiveChange={(data) => updateSectionDataLocal(selected.id, data)}
                    onSave={(data) => updateSection(selected.id, { data })}
                  />
                ) : (
                  <div className="h-full grid place-items-center text-center p-8">
                    <div className="max-w-xs">
                      <div className="mx-auto h-12 w-12 rounded-full bg-muted grid place-items-center mb-3">
                        <Sparkles className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-medium">Selecione uma seção</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Escolha um bloco no painel à esquerda para editar conteúdo, mídias e visibilidade.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={55} minSize={30}>
              <div className="h-full flex flex-col bg-muted/30">
                <div className="shrink-0 h-12 border-b bg-background flex items-center justify-between px-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Preview · {previewUrl}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={visualEdit ? "default" : "ghost"}
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => setVisualEdit((v) => !v)}
                          aria-pressed={visualEdit}
                        >
                          {visualEdit ? <Eye className="h-4 w-4" /> : <MousePointerClick className="h-4 w-4" />}
                          <span className="text-xs">{visualEdit ? "Visualizar" : "Editar"}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{visualEdit ? "Sair do modo edição" : "Editar diretamente no preview"}</TooltipContent>
                    </Tooltip>
                    <div className="h-5 w-px bg-border mx-0.5" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewKey((k) => k + 1)} aria-label="Atualizar preview">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Atualizar preview</TooltipContent>
                    </Tooltip>
                    <div className="h-5 w-px bg-border mx-0.5" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                          size="icon" className="h-8 w-8"
                          onClick={() => setPreviewDevice("desktop")}
                          aria-label="Preview desktop"
                          aria-pressed={previewDevice === "desktop"}
                        >
                          <Monitor className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Desktop</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                          size="icon" className="h-8 w-8"
                          onClick={() => setPreviewDevice("mobile")}
                          aria-label="Preview mobile"
                          aria-pressed={previewDevice === "mobile"}
                        >
                          <Smartphone className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Mobile</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div className="flex-1 min-h-0 flex items-start justify-center p-4 overflow-auto">
                  <div
                    data-admin="false"
                    key={previewKey}
                    className={cn(
                      "bg-background border overflow-y-auto overflow-x-hidden transition-all",
                      visualEdit && "wh-edit-mode",
                      previewDevice === "mobile"
                        ? "rounded-[2rem] shadow-xl ring-1 ring-border/40"
                        : "rounded-lg shadow-sm",
                    )}
                    style={{
                      width: previewDevice === "mobile" ? 390 : "100%",
                      maxWidth: "100%",
                      height: "100%",
                    }}
                  >
                    <SectionsPreview
                      sections={sections}
                      edit={visualEdit ? {
                        locale: "pt-BR",
                        onPatch: handleVisualPatch,
                        onSelect: setSelectedId,
                        selectedId,
                      } : null}
                    />
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Add section popover ---------------- */
function AddSectionPopover({ onAdd }: { onAdd: (type: SectionType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" className="h-8">
          <Plus className="h-4 w-4 mr-1" />Adicionar
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="px-2 py-1.5">
          <div className="text-xs font-semibold">Adicionar seção</div>
          <div className="text-[11px] text-muted-foreground">Escolha o tipo de bloco a inserir.</div>
        </div>
        <div className="grid grid-cols-1 gap-1 mt-1">
          {(Object.keys(SECTION_LABELS) as SectionType[]).map((key) => {
            const meta = SECTION_META[key];
            const Icon = meta?.icon ?? CircleDot;
            return (
              <button
                key={key}
                onClick={() => { onAdd(key); setOpen(false); }}
                className="flex items-start gap-2.5 rounded-md p-2 text-left hover:bg-accent transition-colors"
              >
                <span className="grid place-items-center h-8 w-8 rounded-md bg-muted text-muted-foreground shrink-0">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{SECTION_LABELS[key]}</span>
                  <span className="block text-[11px] text-muted-foreground">{meta?.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- Section inspector ---------------- */
function SectionInspector({
  section,
  onSave,
  onLiveChange,
}: {
  section: SectionRow;
  onSave: (data: Record<string, unknown>) => void | Promise<void>;
  onLiveChange?: (data: Record<string, unknown>) => void;
}) {
  const [data, setData] = useState<Record<string, unknown>>(section.data ?? {});
  const [json, setJson] = useState(JSON.stringify(section.data ?? {}, null, 2));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setData(section.data ?? {});
    setJson(JSON.stringify(section.data ?? {}, null, 2));
    setDirty(false);
  }, [section.id]);

  const Editor = SECTION_EDITORS[section.type] as
    | ((p: { data: Record<string, unknown>; defaults: Record<string, unknown>; onChange: (n: Record<string, unknown>) => void }) => ReactNode)
    | undefined;
  const label = SECTION_LABELS[section.type as SectionType] ?? section.type;
  const Icon = SECTION_META[section.type]?.icon ?? CircleDot;
  const defaults = useMemo(() => getSectionDefaults(section.type), [section.type]);

  const update = (next: Record<string, unknown>) => {
    setData(next);
    setJson(JSON.stringify(next, null, 2));
    setDirty(true);
    onLiveChange?.(next);
  };

  const save = async () => {
    let parsed: Record<string, unknown> = data;
    try { parsed = JSON.parse(json) as Record<string, unknown>; }
    catch { notifyError(null, "JSON inválido"); return; }
    await onSave(parsed);
    setDirty(false);
    notifySuccess("Seção salva");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 px-5 py-3 border-b bg-background/95 backdrop-blur flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid place-items-center h-9 w-9 rounded-lg bg-muted text-muted-foreground shrink-0">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Editando seção
            </div>
            <div className="text-sm font-semibold truncate">{label}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Não salvo
            </span>
          )}
          <Button size="sm" onClick={save} disabled={!dirty}>
            <Save className="h-4 w-4 mr-1.5" />Salvar
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <Tabs defaultValue={Editor ? "visual" : "images"}>
          <TabsList>
            {Editor && <TabsTrigger value="visual">Conteúdo</TabsTrigger>}
            <TabsTrigger value="images">Mídias</TabsTrigger>
            <TabsTrigger value="style">Estilo</TabsTrigger>
            <TabsTrigger value="json">Avançado</TabsTrigger>
          </TabsList>
          {Editor && (
            <TabsContent value="visual" className="pt-5 space-y-5">
              <Editor data={data} defaults={defaults} onChange={update} />
            </TabsContent>
          )}
          <TabsContent value="images" className="pt-5">
            <SectionImagesEditor type={section.type} data={data} onChange={update} />
          </TabsContent>
          <TabsContent value="style" className="pt-5">
            <SectionStyleEditor data={data} onChange={update} />
          </TabsContent>
          <TabsContent value="json" className="pt-5 space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">JSON bruto</Label>
            <Textarea
              rows={20}
              className="font-mono text-xs"
              value={json}
              onChange={(e) => {
                const next = e.target.value;
                setJson(next);
                setDirty(true);
                // Live-preview: empurra para o preview se o JSON for válido.
                try {
                  const parsed = JSON.parse(next) as Record<string, unknown>;
                  setData(parsed);
                  onLiveChange?.(parsed);
                } catch { /* JSON parcial — ignora até ficar válido */ }
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Edição livre do JSON da seção. Use com cautela — campos inválidos podem quebrar a renderização.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ---------------- Metadata sheet ---------------- */
function MetaSheet({ page, setPage }: { page: PageRow; setPage: (p: PageRow) => void }) {
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draft, setDraft] = useState({ title: page.title, description: page.description ?? "" });
  useEffect(() => {
    setDraft({ title: page.title, description: page.description ?? "" });
    setDirty(false);
  }, [page.id]);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("pages")
      .update({ title: draft.title, description: draft.description })
      .eq("id", page.id);
    setSaving(false);
    if (error) { notifyError(error); return; }
    setPage({ ...page, title: draft.title, description: draft.description });
    setDirty(false);
    notifySuccess("Metadados salvos");
  };
  return (
    <SheetContent className="w-full sm:max-w-md overflow-y-auto">
      <SheetHeader>
        <SheetTitle>Metadados & SEO</SheetTitle>
        <SheetDescription>
          Informações usadas no head da página e em compartilhamentos.
        </SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={draft.title}
            onChange={(e) => { setDraft((d) => ({ ...d, title: e.target.value })); setDirty(true); }}
          />
        </div>
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input value={page.slug} disabled />
          <p className="text-[11px] text-muted-foreground">
            Caminho público: <code>/{page.slug === "home" ? "" : page.slug}</code>
          </p>
        </div>
        <div className="space-y-2">
          <Label>Descrição (SEO)</Label>
          <Textarea
            rows={4}
            value={draft.description}
            onChange={(e) => { setDraft((d) => ({ ...d, description: e.target.value })); setDirty(true); }}
          />
          <p className="text-[11px] text-muted-foreground">Recomendado: até 160 caracteres.</p>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          {dirty && (
            <span className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 mr-auto">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Não salvo
            </span>
          )}
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "Salvando…" : "Salvar metadados"}
          </Button>
        </div>
      </div>
    </SheetContent>
  );
}
