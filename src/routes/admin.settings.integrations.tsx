/**
 * Painel de Integrações: Meta Pixel, GA4, GTM, Google Ads, TikTok, Pinterest,
 * LinkedIn, Hotjar, Clarity, Search Console verification e HTML customizado.
 * Salva tudo em site_settings.tracking.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminTracking, saveAdminTracking } from "@/lib/tracking.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, Plug } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";

type T = Record<string, Record<string, unknown>>;

export const Route = createFileRoute("/admin/settings/integrations")({
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const [val, setVal] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useServerFn(getAdminTracking);
  const save = useServerFn(saveAdminTracking);

  useEffect(() => {
    load().then((r) => setVal(JSON.parse(r.json || "{}") as T)).catch((e) => notifyError(e));
  }, [load]);

  const set = (group: string, field: string, v: unknown) => {
    setVal((prev) => ({ ...(prev ?? {}), [group]: { ...((prev?.[group] as object) ?? {}), [field]: v } }));
  };

  const onSave = async () => {
    if (!val) return;
    setSaving(true);
    try {
      await save({ data: { json: JSON.stringify(val) } });
      notifySuccess("Integrações salvas");
    } catch (e) {
      notifyError(e as Error);
    } finally {
      setSaving(false);
    }
  };

  if (!val) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const G = (g: string, k: string) => (val[g]?.[k] as string) ?? "";
  const E = (g: string) => !!(val[g]?.enabled);

  return (
    <div className="p-8 space-y-5 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Plug className="h-5 w-5" /> Pixels, tags e analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">Cole IDs/tokens uma vez. Eles passam a ser injetados em todo o site automaticamente (respeitando o consentimento de cookies).</p>
        </div>
        <Button onClick={onSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar tudo"}</Button>
      </div>

      <Provider title="Meta Pixel + Conversions API" enabled={E("meta")} onToggle={(v) => set("meta","enabled", v)}>
        <Field label="Pixel ID" value={G("meta","pixelId")} onChange={(v) => set("meta","pixelId", v)} placeholder="123456789012345" />
        <Field label="Access Token (CAPI – secreto)" value={G("meta","accessToken")} onChange={(v) => set("meta","accessToken", v)} type="password" />
        <Field label="Test Event Code (opcional)" value={G("meta","testEventCode")} onChange={(v) => set("meta","testEventCode", v)} />
      </Provider>

      <Provider title="Google Analytics 4" enabled={E("ga4")} onToggle={(v) => set("ga4","enabled", v)}>
        <Field label="Measurement ID" value={G("ga4","measurementId")} onChange={(v) => set("ga4","measurementId", v)} placeholder="G-XXXXXXXXXX" />
        <Field label="API Secret (Measurement Protocol – secreto)" value={G("ga4","apiSecret")} onChange={(v) => set("ga4","apiSecret", v)} type="password" />
      </Provider>

      <Provider title="Google Tag Manager" enabled={E("gtm")} onToggle={(v) => set("gtm","enabled", v)}>
        <Field label="Container ID" value={G("gtm","containerId")} onChange={(v) => set("gtm","containerId", v)} placeholder="GTM-XXXXXX" />
      </Provider>

      <Provider title="Google Ads" enabled={E("googleAds")} onToggle={(v) => set("googleAds","enabled", v)}>
        <Field label="Conversion ID" value={G("googleAds","conversionId")} onChange={(v) => set("googleAds","conversionId", v)} placeholder="AW-123456789" />
        <Field label="Conversion Label" value={G("googleAds","conversionLabel")} onChange={(v) => set("googleAds","conversionLabel", v)} />
      </Provider>

      <Provider title="TikTok Pixel" enabled={E("tiktok")} onToggle={(v) => set("tiktok","enabled", v)}>
        <Field label="Pixel ID" value={G("tiktok","pixelId")} onChange={(v) => set("tiktok","pixelId", v)} />
      </Provider>

      <Provider title="Pinterest Tag" enabled={E("pinterest")} onToggle={(v) => set("pinterest","enabled", v)}>
        <Field label="Tag ID" value={G("pinterest","tagId")} onChange={(v) => set("pinterest","tagId", v)} />
      </Provider>

      <Provider title="LinkedIn Insight" enabled={E("linkedin")} onToggle={(v) => set("linkedin","enabled", v)}>
        <Field label="Partner ID" value={G("linkedin","partnerId")} onChange={(v) => set("linkedin","partnerId", v)} />
      </Provider>

      <Provider title="Hotjar" enabled={E("hotjar")} onToggle={(v) => set("hotjar","enabled", v)}>
        <Field label="Site ID" value={G("hotjar","siteId")} onChange={(v) => set("hotjar","siteId", v)} />
      </Provider>

      <Provider title="Microsoft Clarity" enabled={E("clarity")} onToggle={(v) => set("clarity","enabled", v)}>
        <Field label="Project ID" value={G("clarity","projectId")} onChange={(v) => set("clarity","projectId", v)} />
      </Provider>

      <Card>
        <CardHeader><CardTitle className="text-base">Verificação do Google Search Console</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Verification token (apenas o conteúdo do meta tag)" value={G("searchConsole","verificationToken")} onChange={(v) => set("searchConsole","verificationToken", v)} placeholder="abc123..." />
          <p className="text-xs text-muted-foreground">Cole apenas o valor do <code>content="..."</code> do meta tag fornecido pelo Search Console. Será injetado no &lt;head&gt; automaticamente.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">HTML customizado (avançado)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Head (final do &lt;head&gt;)</Label>
            <Textarea rows={4} className="font-mono text-xs" value={G("custom","headHtml")} onChange={(e) => set("custom","headHtml", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Body start</Label>
            <Textarea rows={3} className="font-mono text-xs" value={G("custom","bodyStartHtml")} onChange={(e) => set("custom","bodyStartHtml", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Body end</Label>
            <Textarea rows={3} className="font-mono text-xs" value={G("custom","bodyEndHtml")} onChange={(e) => set("custom","bodyEndHtml", e.target.value)} />
          </div>
          <p className="text-xs text-amber-500">⚠ Snippets injetam scripts diretamente — use apenas código de provedores confiáveis.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar tudo"}</Button>
      </div>
    </div>
  );
}

function Provider({ title, enabled, onToggle, children }: { title: string; enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {enabled ? "Ativo" : "Desativado"}
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} />
    </div>
  );
}