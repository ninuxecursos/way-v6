/**
 * Branding (sub-página de Configurações):
 *   - Galeria das 6 variantes oficiais
 *   - Por slot: variante escolhida + altura final em px + upload personalizado
 *   - Identidade (nome, cores) e Favicon/OG
 */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Save, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { invalidateBranding, setBranding as pushBranding, type Branding } from "@/hooks/use-branding";
import { notifyError, notifySuccess } from "@/lib/notify";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LOGO_SLOTS,
  LOGO_VARIANTS,
  resolveLogoUrl,
  type LogoVariantId,
} from "@/lib/logo-catalog";

const DEFAULT: Branding = {
  siteName: "Way Home", siteShortName: "Way Home",
  logoLightUrl: "", logoDarkUrl: "", logoFooterUrl: "",
  faviconUrl: "/favicon.ico", ogImageUrl: "/og-image.png",
  primaryColor: "", accentColor: "",
  logos: {}, logosCustomUrl: {}, logoSizes: {},
};

const DEFAULT_SLOT_SIZE = 32;

function SizeInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState<string>(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const commit = () => {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n) && n > 0) onCommit(n);
    else setDraft(String(value));
  };
  return (
    <Input
      type="number"
      min={8}
      max={400}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className="h-8 w-24 text-sm"
    />
  );
}

export const Route = createFileRoute("/admin/settings/branding")({
  component: BrandingPage,
});

function BrandingPage() {
  const router = useRouter();
  const [b, setB] = useState<Branding>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "branding").maybeSingle();
      if (data?.value) setB({ ...DEFAULT, ...(data.value as Partial<Branding>) });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "branding", value: b as never }, { onConflict: "key" });
    setSaving(false);
    if (error) { notifyError(error); return; }
    pushBranding(b);
    invalidateBranding();
    // Invalida loaders (root + páginas) para refletir 100% no preview/site.
    void router.invalidate();
    notifySuccess("Branding salvo");
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Branding</h2>
          <p className="text-sm text-muted-foreground">
            Logos oficiais, tamanho final por local, identidade, favicon e OG.
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar alterações
        </Button>
      </div>

      <Tabs defaultValue="logos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logos">Logos oficiais</TabsTrigger>
          <TabsTrigger value="identity">Identidade</TabsTrigger>
          <TabsTrigger value="meta">Favicon &amp; OG</TabsTrigger>
        </TabsList>

        <TabsContent value="logos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Variantes oficiais</CardTitle>
              <p className="text-xs text-muted-foreground">Galeria de referência das 6 versões disponíveis.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {LOGO_VARIANTS.map((v) => {
                  const dark = v.recommendedOn === "dark";
                  return (
                    <div
                      key={v.id}
                      className={`rounded-lg border p-4 flex flex-col items-center justify-center gap-2 ${
                        dark ? "bg-neutral-900 border-neutral-800" : "bg-neutral-50 border-neutral-200"
                      }`}
                    >
                      <img src={v.publicUrl} alt={v.label} className="h-14 w-auto" />
                      <p className={`text-[11px] text-center ${dark ? "text-neutral-300" : "text-neutral-700"}`}>
                        {v.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Onde cada logo aparece</CardTitle>
              <p className="text-xs text-muted-foreground">
                Para cada local, escolha a variante, ajuste o tamanho final em pixels e (opcional) envie um arquivo personalizado.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {LOGO_SLOTS.map((slot) => {
                const choice: LogoVariantId | "custom" =
                  (b.logos?.[slot.id] as LogoVariantId | "custom") || slot.defaultVariant;
                const customUrl = b.logosCustomUrl?.[slot.id] || "";
                const resolvedUrl = resolveLogoUrl(slot.id, b.logos, b.logosCustomUrl);
                const isDark = slot.background === "dark";
                const variant = LOGO_VARIANTS.find((v) => v.id === choice);
                const mismatch =
                  variant &&
                  ((slot.background === "dark" && variant.recommendedOn === "light") ||
                    (slot.background === "light" && variant.recommendedOn === "dark"));
                const size = b.logoSizes?.[slot.id] ?? DEFAULT_SLOT_SIZE;

                const setChoice = (val: string) => {
                  setB({
                    ...b,
                    logos: { ...(b.logos ?? {}), [slot.id]: val as LogoVariantId | "custom" },
                  });
                };
                const setCustom = (url: string) => {
                  setB({
                    ...b,
                    logosCustomUrl: { ...(b.logosCustomUrl ?? {}), [slot.id]: url },
                  });
                };
                const setSize = (px: number) => {
                  setB({
                    ...b,
                    logoSizes: { ...(b.logoSizes ?? {}), [slot.id]: Math.max(8, Math.min(400, px)) },
                  });
                };
                const resetSize = () => {
                  const next = { ...(b.logoSizes ?? {}) };
                  delete next[slot.id];
                  setB({ ...b, logoSizes: next });
                };

                return (
                  <div key={slot.id} className="rounded-lg border bg-card p-4 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{slot.label}</p>
                        <p className="text-xs text-muted-foreground">{slot.description}</p>
                      </div>
                      <div className="md:w-72 shrink-0">
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Variante</Label>
                        <Select value={choice} onValueChange={setChoice}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LOGO_VARIANTS.map((v) => (
                              <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                            ))}
                            <SelectItem value="custom">Upload personalizado…</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Preview + size control */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(0,300px)] gap-4 items-stretch">
                      <div
                        className={`relative flex items-center justify-center rounded-md border min-h-[120px] p-4 ${
                          isDark ? "bg-neutral-900 border-neutral-800" : "bg-neutral-50 border-neutral-200"
                        }`}
                      >
                        {resolvedUrl ? (
                          <img
                            src={resolvedUrl}
                            alt=""
                            style={{ height: size, width: "auto" }}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem logo</span>
                        )}
                        <span className={`absolute bottom-1.5 right-2 text-[10px] tabular-nums ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                          {size}px
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              Tamanho final (altura)
                            </Label>
                            <button
                              type="button"
                              onClick={resetSize}
                              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                              title="Restaurar padrão"
                            >
                              <RotateCcw className="h-3 w-3" /> padrão
                            </button>
                          </div>
                          <Slider
                            value={[size]}
                            min={8}
                            max={200}
                            step={1}
                            onValueChange={(v) => setSize(v[0] ?? DEFAULT_SLOT_SIZE)}
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <SizeInput value={size} onCommit={setSize} />
                            <span className="text-xs text-muted-foreground">pixels</span>
                          </div>
                        </div>

                        {choice === "custom" && (
                          <div>
                            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              Arquivo personalizado
                            </Label>
                            <div className="mt-1">
                              <MediaPicker label="" value={customUrl} onChange={setCustom} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {mismatch && (
                      <p className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        Esta variante foi pensada para fundo {variant.recommendedOn === "dark" ? "escuro" : "claro"} e este slot é {isDark ? "escuro" : "claro"}.
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="identity" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Identidade</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Nome do site</Label>
                  <Input value={b.siteName} onChange={(e) => setB({ ...b, siteName: e.target.value })} /></div>
                <div><Label className="text-xs">Nome curto</Label>
                  <Input value={b.siteShortName} onChange={(e) => setB({ ...b, siteShortName: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Cor primária (CSS)</Label>
                  <Input placeholder="#ff007a" value={b.primaryColor} onChange={(e) => setB({ ...b, primaryColor: e.target.value })} /></div>
                <div><Label className="text-xs">Cor de destaque (CSS)</Label>
                  <Input placeholder="#ffffff" value={b.accentColor} onChange={(e) => setB({ ...b, accentColor: e.target.value })} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logos legados (compatibilidade)</CardTitle>
              <p className="text-xs text-muted-foreground">Campos antigos. Use a aba “Logos oficiais” acima.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <MediaPicker label="Logo principal (fundo claro)" hint="Usada quando o header está sobre fundo claro." value={b.logoLightUrl} onChange={(u) => setB({ ...b, logoLightUrl: u })} />
              <MediaPicker label="Logo principal (fundo escuro)" hint="Usada quando o header está sobre fundo escuro/scrolled." value={b.logoDarkUrl} onChange={(u) => setB({ ...b, logoDarkUrl: u })} />
              <MediaPicker label="Logo do rodapé" hint="Opcional. Cai no logo principal se vazio." value={b.logoFooterUrl} onChange={(u) => setB({ ...b, logoFooterUrl: u })} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meta" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Favicon e compartilhamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <MediaPicker label="Favicon" value={b.faviconUrl} onChange={(u) => setB({ ...b, faviconUrl: u })} />
              <MediaPicker label="Imagem OG (compartilhamento social)" hint="Recomendado 1200×630." value={b.ogImageUrl} onChange={(u) => setB({ ...b, ogImageUrl: u })} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
