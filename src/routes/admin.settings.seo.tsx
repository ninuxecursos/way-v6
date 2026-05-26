/**
 * Painel SEO: canonicalUrl, robots.txt editável, noindex global,
 * IndexNow key e ping manual ao Google/Bing.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminSeo, saveAdminSeo, pingSitemapNow } from "@/lib/seo.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, Send, Search, ExternalLink } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";

interface SeoCfg {
  canonicalUrl?: string;
  robotsTxt?: string;
  noindexGlobal?: boolean;
  indexNowKey?: string;
}

export const Route = createFileRoute("/admin/settings/seo")({ component: SeoPage });

function SeoPage() {
  const [val, setVal] = useState<SeoCfg | null>(null);
  const [saving, setSaving] = useState(false);
  const [pinging, setPinging] = useState(false);
  const load = useServerFn(getAdminSeo);
  const save = useServerFn(saveAdminSeo);
  const ping = useServerFn(pingSitemapNow);

  useEffect(() => {
    load().then((r) => setVal(JSON.parse(r.json || "{}") as SeoCfg)).catch((e) => notifyError(e));
  }, [load]);

  const onSave = async () => {
    if (!val) return;
    setSaving(true);
    try {
      await save({ data: { json: JSON.stringify(val) } });
      notifySuccess("Configurações de SEO salvas");
    } catch (e) { notifyError(e as Error); }
    finally { setSaving(false); }
  };

  const onPing = async () => {
    setPinging(true);
    try {
      const r = await ping();
      notifySuccess(`Sitemap enviado: ${r.results.map((x) => `${x.engine}=${x.status}`).join(", ")}`);
    } catch (e) { notifyError(e as Error); }
    finally { setPinging(false); }
  };

  if (!val) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  const base = val.canonicalUrl?.trim().replace(/\/$/, "") || "https://www.wayhomeoficial.com.br";

  return (
    <div className="p-8 space-y-5 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Search className="h-5 w-5" /> SEO técnico</h2>
          <p className="text-sm text-muted-foreground mt-1">Sitemap, robots.txt, indexação e Search Console.</p>
        </div>
        <Button onClick={onSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar"}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Domínio canônico</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label className="text-xs">URL base do site (sem barra final)</Label>
          <Input value={val.canonicalUrl ?? ""} onChange={(e) => setVal({ ...val, canonicalUrl: e.target.value })} placeholder="https://www.wayhomeoficial.com.br" />
          <p className="text-xs text-muted-foreground">Usada em sitemap.xml, robots.txt, canonical e og:url.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            robots.txt
            <a href={`${base}/robots.txt`} target="_blank" rel="noreferrer" className="text-xs font-normal inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" />ver</a>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={10} className="font-mono text-xs" value={val.robotsTxt ?? ""} onChange={(e) => setVal({ ...val, robotsTxt: e.target.value })} />
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Bloquear indexação (noindex global)</p>
              <p className="text-xs text-muted-foreground">Use em emergências. Substitui o robots.txt por <code>Disallow: /</code>.</p>
            </div>
            <Switch checked={!!val.noindexGlobal} onCheckedChange={(v) => setVal({ ...val, noindexGlobal: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Sitemap
            <a href={`${base}/sitemap.xml`} target="_blank" rel="noreferrer" className="text-xs font-normal inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" />ver</a>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Gerado dinamicamente em <code>{base}/sitemap.xml</code> com rotas estáticas, páginas do CMS, posts do blog e experiências ativas. Atualizado em tempo real.</p>
          <Button variant="secondary" onClick={onPing} disabled={pinging}><Send className="h-4 w-4 mr-2" />{pinging ? "Enviando..." : "Pingar Google e Bing agora"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">IndexNow (Bing/Yandex)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label className="text-xs">Chave</Label>
          <Input value={val.indexNowKey ?? ""} onChange={(e) => setVal({ ...val, indexNowKey: e.target.value })} />
          <p className="text-xs text-muted-foreground">Validação disponível em <code>{base}/indexnow/{val.indexNowKey || "&lt;key&gt;"}.txt</code></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Google Search Console</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. Cole o <strong>verification token</strong> em <a className="underline" href="/admin/settings/integrations">Integrações → Search Console</a>.</p>
          <p>2. Publique o site. O meta tag é injetado automaticamente no &lt;head&gt;.</p>
          <p>3. Confirme a propriedade em <a className="underline" href="https://search.google.com/search-console" target="_blank" rel="noreferrer">search.google.com/search-console</a> e adicione o sitemap <code>{base}/sitemap.xml</code>.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar"}</Button>
      </div>
    </div>
  );
}