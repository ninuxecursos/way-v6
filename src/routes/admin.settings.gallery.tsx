/**
 * Editor da página Galeria — hero (slides + textos), seção de vídeos
 * e catálogo de fotos. Persiste em site_settings (key="gallery").
 */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2 } from "lucide-react";
import { GalleryMediaManager } from "@/components/admin/GalleryMediaManager";
import { notifyError, notifySuccess } from "@/lib/notify";
import { normalizeMediaList, type GalleryConfig, type GalleryMediaItem } from "@/lib/gallery.functions";

export const Route = createFileRoute("/admin/settings/gallery")({
  component: GalleryAdminPage,
});

const DEFAULT: GalleryConfig = {
  hero: {
    eyebrow: "Galeria Way Home",
    title: "A atmosfera do festival,",
    titleHighlight: "eternizada em imagens.",
    subtitle:
      "Cada momento, suíte, sorriso e amanhecer. Veja como é viver Tomorrowland com a Way Home.",
    slides: [],
  },
  videos: {
    eyebrow: "Reels & Stories",
    title: "Vídeos",
    subtitle: "Pequenas histórias gravadas direto da pista do Tomorrowland",
    items: [],
  },
  photos: {
    eyebrow: "Catálogo",
    title: "Fotos da experiência",
    subtitle: "Selecione uma imagem para ampliar e explorar os detalhes.",
    items: [],
  },
};

function GalleryAdminPage() {
  const router = useRouter();
  const [cfg, setCfg] = useState<GalleryConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "gallery")
        .maybeSingle();
      if (data?.value) {
        const v = data.value as Partial<GalleryConfig>;
        // Migra videos.items legado (GalleryVideo[] com {src,poster,title})
        // para o shape novo GalleryMediaItem[] (apenas url+kind+visible).
        const rawVideos = (v.videos?.items ?? []) as unknown[];
        const migratedVideos: GalleryMediaItem[] = rawVideos
          .map((it): GalleryMediaItem | null => {
            if (!it || typeof it !== "object") return null;
            const o = it as Record<string, unknown>;
            if (typeof o.url === "string") {
              return {
                url: o.url,
                kind: "video",
                visible: o.visible !== false,
                alt: typeof o.alt === "string" ? o.alt : undefined,
              };
            }
            if (typeof o.src === "string") {
              return {
                url: o.src,
                kind: "video",
                visible: o.visible !== false,
                alt: typeof o.title === "string" ? o.title : undefined,
              };
            }
            return null;
          })
          .filter((x): x is GalleryMediaItem => !!x);
        setCfg({
          hero: {
            ...DEFAULT.hero,
            ...(v.hero ?? {}),
            slides: normalizeMediaList(v.hero?.slides ?? []),
          },
          videos: {
            ...DEFAULT.videos,
            ...(v.videos ?? {}),
            items: migratedVideos as never,
          },
          photos: {
            ...DEFAULT.photos,
            ...(v.photos ?? {}),
            items: normalizeMediaList(v.photos?.items ?? []),
          },
        });
      } else {
        setCfg({
          hero: { ...DEFAULT.hero, slides: [] },
          videos: { ...DEFAULT.videos, items: [] },
          photos: { ...DEFAULT.photos, items: [] },
        });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "gallery", value: cfg as never }, { onConflict: "key" });
    setSaving(false);
    if (error) return notifyError(error);
    void router.invalidate();
    notifySuccess("Galeria salva");
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  // Helpers
  const updateHero = (patch: Partial<GalleryConfig["hero"]>) =>
    setCfg({ ...cfg, hero: { ...cfg.hero, ...patch } });
  const updateVideos = (patch: Partial<GalleryConfig["videos"]>) =>
    setCfg({ ...cfg, videos: { ...cfg.videos, ...patch } });
  const updatePhotos = (patch: Partial<GalleryConfig["photos"]>) =>
    setCfg({ ...cfg, photos: { ...cfg.photos, ...patch } });

  return (
    <div className="max-w-5xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Galeria</h2>
          <p className="text-sm text-muted-foreground">
            Configure hero, vídeos e fotos da página /galeria.
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar alterações
        </Button>
      </div>

      <Tabs defaultValue="hero" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="videos">Vídeos</TabsTrigger>
          <TabsTrigger value="photos">Fotos</TabsTrigger>
        </TabsList>

        {/* HERO */}
        <TabsContent value="hero" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Textos do hero</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Eyebrow (chip)">
                <Input value={cfg.hero.eyebrow} onChange={(e) => updateHero({ eyebrow: e.target.value })} />
              </Field>
              <Field label="Título (linha 1)">
                <Input value={cfg.hero.title} onChange={(e) => updateHero({ title: e.target.value })} />
              </Field>
              <Field label="Destaque (linha 2, em rosa)">
                <Input value={cfg.hero.titleHighlight} onChange={(e) => updateHero({ titleHighlight: e.target.value })} />
              </Field>
              <Field label="Subtítulo">
                <Textarea rows={3} value={cfg.hero.subtitle} onChange={(e) => updateHero({ subtitle: e.target.value })} />
              </Field>
            </CardContent>
          </Card>

          <GalleryMediaManager
            title="Slides do hero (rotação automática)"
            hint="Aceita imagens e vídeos curtos (.mp4/.webm). Recomendado: 1920×1080. Clique para marcar/desmarcar; use o olho para ocultar sem remover."
            selected={cfg.hero.slides}
            onChange={(slides) => updateHero({ slides })}
          />
        </TabsContent>

        {/* VIDEOS */}
        <TabsContent value="videos" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Textos da seção Vídeos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Eyebrow">
                <Input value={cfg.videos.eyebrow} onChange={(e) => updateVideos({ eyebrow: e.target.value })} />
              </Field>
              <Field label="Título">
                <Input value={cfg.videos.title} onChange={(e) => updateVideos({ title: e.target.value })} />
              </Field>
              <Field label="Subtítulo">
                <Textarea rows={2} value={cfg.videos.subtitle} onChange={(e) => updateVideos({ subtitle: e.target.value })} />
              </Field>
            </CardContent>
          </Card>

          <GalleryMediaManager
            title="Vídeos exibidos no carrossel"
            hint="Envie um ou vários .mp4/.webm. Os vídeos selecionados aqui aparecem automaticamente no carrossel logo abaixo do hero da página /galeria."
            accept="video/*"
            kindFilter="video"
            selected={cfg.videos.items as unknown as GalleryMediaItem[]}
            onChange={(items) => updateVideos({ items: items as never })}
          />
        </TabsContent>

        {/* PHOTOS */}
        <TabsContent value="photos" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Textos da seção Fotos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Eyebrow">
                <Input value={cfg.photos.eyebrow} onChange={(e) => updatePhotos({ eyebrow: e.target.value })} />
              </Field>
              <Field label="Título">
                <Input value={cfg.photos.title} onChange={(e) => updatePhotos({ title: e.target.value })} />
              </Field>
              <Field label="Subtítulo">
                <Textarea rows={2} value={cfg.photos.subtitle} onChange={(e) => updatePhotos({ subtitle: e.target.value })} />
              </Field>
            </CardContent>
          </Card>

          <GalleryMediaManager
            title="Catálogo de fotos e vídeos"
            hint="Aceita imagens e vídeos. Vídeos abrem em lightbox; imagens em zoom. Recomendado: pelo menos 1200px."
            selected={cfg.photos.items}
            onChange={(items) => updatePhotos({ items })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}