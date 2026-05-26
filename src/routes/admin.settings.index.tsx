/**
 * Configurações gerais (chave/valor JSON em site_settings).
 * Filtra a chave `branding` — ela é editada na aba dedicada.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";

interface Setting { key: string; value: unknown }

export const Route = createFileRoute("/admin/settings/")({
  component: SettingsIndex,
});

function SettingsIndex() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("site_settings").select("key, value").order("key");
    const list = ((data ?? []) as Setting[]).filter(
      (s) => s.key !== "branding" && s.key !== "gallery" && s.key !== "tracking" && s.key !== "seo",
    );
    setSettings(list);
    setDrafts(Object.fromEntries(list.map((s) => [s.key, JSON.stringify(s.value, null, 2)])));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (key: string) => {
    let parsed: unknown;
    try { parsed = JSON.parse(drafts[key]); }
    catch { notifyError(null, "JSON inválido"); return; }
    const { error } = await supabase.from("site_settings").update({ value: parsed as never }).eq("key", key);
    if (error) { notifyError(error); return; }
    notifySuccess("Configurações salvas");
    load();
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : settings.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhuma configuração geral cadastrada.</div>
      ) : settings.map((s) => (
        <Card key={s.key}>
          <CardHeader><CardTitle className="capitalize text-base">{s.key}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={8}
              className="font-mono text-xs"
              value={drafts[s.key] ?? ""}
              onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
            />
            <Button size="sm" onClick={() => save(s.key)}><Save className="h-4 w-4 mr-2" />Salvar {s.key}</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
