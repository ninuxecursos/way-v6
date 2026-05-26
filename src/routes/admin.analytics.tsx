import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Users, MousePointerClick, Eye, Clock, TrendingDown, Globe, Smartphone, Monitor, Tablet, RefreshCw } from "lucide-react";
import {
  getAnalyticsOverview,
  getAnalyticsTimeseries,
  getAnalyticsTopLists,
  getAnalyticsLiveSessions,
  listAnalyticsSessions,
  getAnalyticsSessionDetail,
  getAnalyticsSettings,
  updateAnalyticsSettings,
  toggleAdminExclusion,
  backfillAnalyticsGeo,
} from "@/lib/analytics.functions";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart, CartesianGrid } from "recharts";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
});

type Range = "today" | "yesterday" | "7d" | "30d" | "90d" | "custom";

function rangeToDates(r: Range, custom?: { from: string; to: string }): { from: string; to: string } {
  const now = new Date();
  if (r === "custom" && custom?.from && custom?.to) {
    const from = new Date(custom.from);
    from.setHours(0, 0, 0, 0);
    const to = new Date(custom.to);
    to.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  const from = new Date(now);
  let to = now;
  if (r === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (r === "yesterday") {
    from.setDate(from.getDate() - 1);
    from.setHours(0, 0, 0, 0);
    // Termina no início de hoje, não em "agora".
    to = new Date(now);
    to.setHours(0, 0, 0, 0);
  } else if (r === "7d") {
    from.setDate(from.getDate() - 7);
  } else if (r === "30d") {
    from.setDate(from.getDate() - 30);
  } else if (r === "90d") {
    from.setDate(from.getDate() - 90);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

function fmtDuration(s: number) {
  if (!s) return "0s";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function StatCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </div>
          <div className="rounded-full p-2 bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TopList({ title, items, suffix }: { title: string; items: { key: string; count: number }[]; suffix?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Sem dados.</p>}
        {items.map((it) => (
          <div key={it.key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="truncate max-w-[70%]">{it.key}</span>
              <span className="text-muted-foreground">{it.count}{suffix || ""}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${(it.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DeviceIcon({ kind }: { kind: string }) {
  if (kind === "mobile") return <Smartphone className="h-4 w-4" />;
  if (kind === "tablet") return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

function AnalyticsPage() {
  const [range, setRange] = useState<Range>("7d");
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const sevenAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);
  const [customFrom, setCustomFrom] = useState(sevenAgoStr);
  const [customTo, setCustomTo] = useState(todayStr);
  const dates = useMemo(
    () => rangeToDates(range, { from: customFrom, to: customTo }),
    [range, customFrom, customTo],
  );

  const overviewFn = useServerFn(getAnalyticsOverview);
  const tsFn = useServerFn(getAnalyticsTimeseries);
  const topsFn = useServerFn(getAnalyticsTopLists);

  const overview = useQuery({
    queryKey: ["an-overview", range, dates.from, dates.to],
    queryFn: () => overviewFn({ data: dates }),
    refetchInterval: 30_000,
  });
  const series = useQuery({
    queryKey: ["an-series", range, dates.from, dates.to],
    queryFn: () => tsFn({ data: { ...dates, granularity: range === "today" || range === "yesterday" ? "hour" : "day" } }),
    refetchInterval: 30_000,
  });
  const tops = useQuery({
    queryKey: ["an-tops", range, dates.from, dates.to],
    queryFn: () => topsFn({ data: dates }),
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Activity className="h-7 w-7 text-primary" /> Analytics</h1>
          <p className="text-sm text-muted-foreground">Visitantes, sessões e interações em tempo real — first-party, sem trackers externos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["today", "yesterday", "7d", "30d", "90d"] as Range[]).map((r) => (
            <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>
              {r === "today" ? "Hoje" : r === "yesterday" ? "Ontem" : r === "7d" ? "7 dias" : r === "30d" ? "30 dias" : "90 dias"}
            </Button>
          ))}
          <Button size="sm" variant={range === "custom" ? "default" : "outline"} onClick={() => setRange("custom")}>
            Personalizado
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { overview.refetch(); series.refetch(); tops.refetch(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {range === "custom" && (
        <div className="flex flex-wrap items-end gap-2 rounded-md border p-3 bg-muted/30">
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={customTo} min={customFrom} max={todayStr} onChange={(e) => setCustomTo(e.target.value)} className="h-9" />
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="live">Ao vivo</TabsTrigger>
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {overview.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            ) : (
              <>
                <StatCard icon={Users} label="Visitantes únicos" value={overview.data?.visitors ?? 0} />
                <StatCard icon={Activity} label="Sessões" value={overview.data?.sessions ?? 0} />
                <StatCard icon={Eye} label="Pageviews" value={overview.data?.pageviews ?? 0} />
                <StatCard icon={Clock} label="Duração média" value={fmtDuration(overview.data?.avg_duration_seconds ?? 0)} />
                <StatCard icon={TrendingDown} label="Taxa de rejeição" value={`${overview.data?.bounce_rate_pct ?? 0}%`} />
              </>
            )}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Tráfego</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series.data ?? []}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="ts" tickFormatter={(t) => new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: range === "today" || range === "yesterday" ? "2-digit" : undefined })} fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip labelFormatter={(t: string) => new Date(t).toLocaleString("pt-BR")} />
                    <Area type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" fill="url(#g1)" />
                    <Line type="monotone" dataKey="pageviews" stroke="hsl(var(--muted-foreground))" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <TopList title="Páginas mais vistas" items={tops.data?.pages ?? []} />
            <TopList title="Origens de tráfego" items={tops.data?.referrers ?? []} />
            <TopList title="Países" items={tops.data?.countries ?? []} />
            <TopList title="Dispositivos" items={tops.data?.devices ?? []} />
            <TopList title="Navegadores" items={tops.data?.browsers ?? []} />
            <TopList title="Sistemas" items={tops.data?.os ?? []} />
            <TopList title="UTM source" items={tops.data?.utm_sources ?? []} />
            <TopList title="UTM campaign" items={tops.data?.utm_campaigns ?? []} />
            <TopList title="Cliques mais frequentes" items={tops.data?.top_clicks ?? []} />
          </div>
        </TabsContent>

        <TabsContent value="live" className="mt-4"><LiveTab /></TabsContent>
        <TabsContent value="sessions" className="mt-4"><SessionsTab dates={dates} /></TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function LiveTab() {
  const fn = useServerFn(getAnalyticsLiveSessions);
  const q = useQuery({ queryKey: ["an-live"], queryFn: () => fn({}), refetchInterval: 5_000 });
  const sessions = (q.data?.sessions ?? []) as any[];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>
          {sessions.length} visitante{sessions.length === 1 ? "" : "s"} ao vivo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 && <p className="text-sm text-muted-foreground">Nenhum visitante ativo no momento.</p>}
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.session_id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <DeviceIcon kind={s.device_type} />
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.exit_path || s.landing_path}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[s.ip_city, s.ip_country].filter(Boolean).join(", ") || "—"} • {s.browser} • {s.os}
                  </div>
                </div>
              </div>
              <Badge variant="secondary">{s.pageviews_count}pv</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SessionsTab({ dates }: { dates: { from: string; to: string } }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const fn = useServerFn(listAnalyticsSessions);
  const detailFn = useServerFn(getAnalyticsSessionDetail);
  const backfillFn = useServerFn(backfillAnalyticsGeo);
  const list = useQuery({
    queryKey: ["an-list", dates, q, page],
    queryFn: () => fn({ data: { ...dates, q, page, pageSize: 25 } }),
  });
  const detail = useQuery({
    queryKey: ["an-detail", openId],
    queryFn: () => detailFn({ data: { sessionId: openId! } }),
    enabled: !!openId,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input className="flex-1 min-w-[220px]" placeholder="Buscar por IP, país, cidade, URL..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="outline" onClick={() => { setPage(1); list.refetch(); }}>Buscar</Button>
        <Button
          variant="outline"
          disabled={backfilling}
          onClick={async () => {
            setBackfilling(true);
            setBackfillMsg(null);
            try {
              const r = await backfillFn({});
              setBackfillMsg(`Processadas ${r.processed} sessões — ${r.ok} ok, ${r.fail} falhas.`);
              list.refetch();
            } catch (e: any) {
              setBackfillMsg("Falha ao reprocessar localização.");
            } finally {
              setBackfilling(false);
            }
          }}
        >
          {backfilling ? "Processando..." : "Reprocessar localização"}
        </Button>
      </div>
      {backfillMsg && <p className="text-xs text-muted-foreground">{backfillMsg}</p>}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>
                  <th className="text-left p-2">Início</th>
                  <th className="text-left p-2">Local</th>
                  <th className="text-left p-2">Dispositivo</th>
                  <th className="text-left p-2">Entrada</th>
                  <th className="text-left p-2">Origem</th>
                  <th className="text-left p-2">PV</th>
                  <th className="text-left p-2">Duração</th>
                </tr>
              </thead>
              <tbody>
                {(list.data?.rows ?? []).map((s: any) => (
                  <tr key={s.session_id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setOpenId(s.session_id)}>
                    <td className="p-2 whitespace-nowrap">{new Date(s.started_at).toLocaleString("pt-BR")}</td>
                    <td className="p-2 whitespace-nowrap">{[s.ip_city, s.ip_country].filter(Boolean).join(", ") || s.ip_address || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{s.device_type} · {s.browser}</td>
                    <td className="p-2 truncate max-w-[200px]">{s.landing_path}</td>
                    <td className="p-2 truncate max-w-[160px]">{s.referrer_domain || s.utm_source || "direto"}</td>
                    <td className="p-2">{s.pageviews_count}</td>
                    <td className="p-2">{fmtDuration(s.duration_seconds || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{list.data?.total ?? 0} sessões</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)}>Próximo</Button>
        </div>
      </div>

      {openId && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Detalhes da sessão</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>Fechar</Button>
          </CardHeader>
          <CardContent>
            {detail.isLoading && <Skeleton className="h-40" />}
            {detail.data?.session && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div><div className="text-muted-foreground">IP</div><div>{detail.data.session.ip_address || "—"}</div></div>
                  <div><div className="text-muted-foreground">Local</div><div>{[detail.data.session.ip_city, detail.data.session.ip_country].filter(Boolean).join(", ") || "—"}</div></div>
                  <div><div className="text-muted-foreground">Dispositivo</div><div>{detail.data.session.device_type} · {detail.data.session.os}</div></div>
                  <div><div className="text-muted-foreground">Navegador</div><div>{detail.data.session.browser} {detail.data.session.browser_version}</div></div>
                  <div><div className="text-muted-foreground">Idioma</div><div>{detail.data.session.language || "—"}</div></div>
                  <div><div className="text-muted-foreground">Fuso</div><div>{detail.data.session.timezone || "—"}</div></div>
                  <div><div className="text-muted-foreground">Referrer</div><div className="truncate">{detail.data.session.referrer || "direto"}</div></div>
                  <div><div className="text-muted-foreground">UTM</div><div className="truncate">{[detail.data.session.utm_source, detail.data.session.utm_campaign].filter(Boolean).join(" / ") || "—"}</div></div>
                </div>
                <div className="space-y-1 max-h-96 overflow-auto rounded border p-2">
                  {detail.data.events.map((e: any) => (
                    <div key={e.id} className="text-xs flex gap-2 border-b last:border-0 py-1">
                      <span className="text-muted-foreground whitespace-nowrap">{new Date(e.occurred_at).toLocaleTimeString("pt-BR")}</span>
                      <Badge variant="outline" className="h-5">{e.event_type}</Badge>
                      <span className="truncate">{e.element_text || e.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SettingsTab() {
  const fn = useServerFn(getAnalyticsSettings);
  const upd = useServerFn(updateAnalyticsSettings);
  const tog = useServerFn(toggleAdminExclusion);
  const q = useQuery({ queryKey: ["an-settings"], queryFn: () => fn({}) });
  const [retention, setRetention] = useState(365);
  const [uid, setUid] = useState("");

  useEffect(() => {
    if (q.data?.settings) setRetention(q.data.settings.retention_days || 365);
  }, [q.data]);

  if (q.isLoading) return <Skeleton className="h-64" />;
  const s = q.data?.settings;
  if (!s) return <p className="text-sm text-muted-foreground">Carregando configurações…</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Configurações</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><Label>Coleta ativa</Label>
            <Switch checked={s.enabled} onCheckedChange={async (v) => { await upd({ data: { enabled: v } }); q.refetch(); }} />
          </div>
          <div className="flex items-center justify-between"><Label>Excluir bots dos relatórios</Label>
            <Switch checked={s.exclude_bots} onCheckedChange={async (v) => { await upd({ data: { exclude_bots: v } }); q.refetch(); }} />
          </div>
          <div className="flex items-center justify-between"><Label>Anonimizar IP (LGPD)</Label>
            <Switch checked={s.anonymize_ip} onCheckedChange={async (v) => { await upd({ data: { anonymize_ip: v } }); q.refetch(); }} />
          </div>
          <div className="space-y-2">
            <Label>Retenção (dias)</Label>
            <div className="flex gap-2">
              <Input type="number" min={7} max={3650} value={retention} onChange={(e) => setRetention(Number(e.target.value))} />
              <Button onClick={async () => { await upd({ data: { retention_days: retention } }); q.refetch(); }}>Salvar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Admins excluídos do tracking</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="user_id (UUID)" value={uid} onChange={(e) => setUid(e.target.value)} />
            <Button onClick={async () => { if (uid) { await tog({ data: { user_id: uid, action: "add" } }); setUid(""); q.refetch(); } }}>Adicionar</Button>
          </div>
          <div className="space-y-1 max-h-64 overflow-auto">
            {(q.data?.exclusions ?? []).map((x: any) => (
              <div key={x.user_id} className="flex items-center justify-between text-xs border rounded p-2">
                <div className="truncate"><span className="font-mono">{x.user_id}</span> <span className="text-muted-foreground">— {x.reason}</span></div>
                <Button size="sm" variant="ghost" onClick={async () => { await tog({ data: { user_id: x.user_id, action: "remove" } }); q.refetch(); }}>Remover</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}