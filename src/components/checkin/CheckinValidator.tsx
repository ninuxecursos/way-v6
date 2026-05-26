import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Loader2,
  History,
  ScanLine,
  Bus,
  BedDouble,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  validateCheckin,
  validateCheckinByOrderId,
  searchOrdersForCheckin,
  recentCheckins,
  type CheckinResult,
  type CheckinStage,
} from "@/lib/checkin.functions";

const Scanner = lazy(() =>
  import("@yudiel/react-qr-scanner").then((m) => ({ default: m.Scanner })),
);

function parseToken(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const u = new URL(value);
    const ci = u.searchParams.get("ci") || u.searchParams.get("token");
    if (ci) return ci;
    const segs = u.pathname.split("/").filter(Boolean);
    const last = segs[segs.length - 1];
    if (last && /^[A-Za-z0-9_-]{8,128}$/.test(last)) return last;
  } catch {
    // não é URL
  }
  return /^[A-Za-z0-9_-]{8,128}$/.test(value) ? value : null;
}

function getCheckinErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as any)?.message ?? "");
  return message || "Check-in indisponível no momento.";
}

function getSetupError(data: unknown): string | null {
  if (!data || typeof data !== "object" || !("setupError" in data)) return null;
  const value = (data as { setupError?: unknown }).setupError;
  return typeof value === "string" ? value : null;
}

export interface CheckinValidatorProps {
  /** Quando true, oculta o cabeçalho (uso dentro de modal com header próprio). */
  hideHeader?: boolean;
  /** Permite ler ?ci=... da URL ao montar. Default true; desligue dentro de modal. */
  readUrlToken?: boolean;
}

export function CheckinValidator({ hideHeader = false, readUrlToken = true }: CheckinValidatorProps) {
  const validateFn = useServerFn(validateCheckin);
  const validateByIdFn = useServerFn(validateCheckinByOrderId);
  const searchFn = useServerFn(searchOrdersForCheckin);
  const recentFn = useServerFn(recentCheckins);

  const [cameraOn, setCameraOn] = useState(false);
  const [stage, setStage] = useState<CheckinStage>("bus");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [search, setSearch] = useState("");
  const lastScanRef = useRef<{ token: string; at: number } | null>(null);

  useEffect(() => {
    if (!readUrlToken) return;
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const stageParam = url.searchParams.get("stage");
    if (stageParam === "bus" || stageParam === "lodging") {
      setStage(stageParam);
    }
    const ci = url.searchParams.get("ci");
    if (ci && /^[A-Za-z0-9_-]{8,128}$/.test(ci)) {
      const requested: CheckinStage = stageParam === "lodging" ? "lodging" : "bus";
      validateFn({ data: { token: ci, stage: requested } })
        .then((data) => {
          setResult(data);
          if (data.status === "ok") {
            toast.success(
              data.stage === "bus" ? "Embarque no ônibus validado!" : "Check-in no quarto validado!",
            );
          } else if (data.status === "already") {
            toast.warning(
              data.stage === "bus"
                ? "Embarque no ônibus já validado."
                : "Check-in no quarto já validado.",
            );
          } else if (data.status === "unpaid") {
            toast.error("Pedido não está pago.");
          } else {
            toast.error("QR inválido.");
          }
        })
        .catch((e) => toast.error(e?.message ?? "Erro ao validar."));
      url.searchParams.delete("ci");
      url.searchParams.delete("stage");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recent = useQuery({
    queryKey: ["checkin-recent"],
    queryFn: async () => {
      try {
        return await recentFn();
      } catch (error) {
        return { rows: [], setupError: getCheckinErrorMessage(error) };
      }
    },
    refetchInterval: 30_000,
    retry: false,
  });

  const validateMutation = useMutation({
    mutationFn: (token: string) => validateFn({ data: { token, stage } }),
    onSuccess: (data) => {
      setResult(data);
      if (data.status === "ok") {
        toast.success(
          data.stage === "bus" ? "Embarque no ônibus validado!" : "Check-in no quarto validado!",
        );
        if (navigator.vibrate) navigator.vibrate(100);
        recent.refetch();
      } else if (data.status === "already") {
        toast.warning(
          data.stage === "bus"
            ? "Embarque no ônibus já validado para este QR."
            : "Check-in no quarto já validado para este QR.",
        );
      } else if (data.status === "unpaid") {
        toast.error("Pedido não está pago.");
      } else {
        toast.error("QR inválido.");
      }
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Erro ao validar.");
    },
  });

  const validateByIdMutation = useMutation({
    mutationFn: (orderId: string) => validateByIdFn({ data: { orderId, stage } }),
    onSuccess: (data) => {
      setResult(data);
      if (data.status === "ok") {
        toast.success(
          data.stage === "bus" ? "Embarque no ônibus validado!" : "Check-in no quarto validado!",
        );
        recent.refetch();
      } else if (data.status === "already") {
        toast.warning(
          data.stage === "bus"
            ? "Embarque no ônibus já validado."
            : "Check-in no quarto já validado.",
        );
      } else if (data.status === "unpaid") {
        toast.error("Pedido não está pago.");
      } else {
        toast.error("Pedido inválido.");
      }
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Erro ao validar pedido.");
    },
  });

  const searchQ = useQuery({
    queryKey: ["checkin-search", search],
    queryFn: async () => {
      try {
        return await searchFn({ data: { q: search } });
      } catch (error) {
        return { rows: [], setupError: getCheckinErrorMessage(error) };
      }
    },
    enabled: search.trim().length >= 2,
    retry: false,
  });

  const searchSetupError = getSetupError(searchQ.data);
  const recentSetupError = getSetupError(recent.data);

  const handleDetected = (raw: string) => {
    const token = parseToken(raw);
    if (!token) {
      toast.error("Conteúdo do QR não reconhecido.");
      return;
    }
    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.token === token && now - lastScanRef.current.at < 4000) return;
    lastScanRef.current = { token, at: now };
    validateMutation.mutate(token);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-2 sm:p-4">
      {!hideHeader && (
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Validação / Check-in</h1>
          <p className="text-sm text-muted-foreground">
            Cada hóspede tem <strong>1 QR Code</strong> validado em duas etapas:
            embarque no ônibus e chegada ao quarto. Selecione a etapa abaixo antes de ler o QR.
          </p>
        </header>
      )}

      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        <Button
          variant={stage === "bus" ? "default" : "outline"}
          onClick={() => setStage("bus")}
          className="gap-2"
        >
          <Bus className="h-4 w-4" /> Embarque (ônibus)
        </Button>
        <Button
          variant={stage === "lodging" ? "default" : "outline"}
          onClick={() => setStage("lodging")}
          className="gap-2"
        >
          <BedDouble className="h-4 w-4" /> Quarto (hospedagem)
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResultPanel
          result={result}
          loading={validateMutation.isPending || validateByIdMutation.isPending}
        />

        <Card className="overflow-hidden order-last lg:order-first">
          <div className="flex items-center justify-between border-b border-border/60 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ScanLine className="h-4 w-4" /> Leitor de QR
            </div>
            <Button
              size="sm"
              variant={cameraOn ? "outline" : "default"}
              onClick={() => setCameraOn((v) => !v)}
            >
              {cameraOn ? (
                <>
                  <CameraOff className="mr-1.5 h-4 w-4" /> Parar
                </>
              ) : (
                <>
                  <Camera className="mr-1.5 h-4 w-4" /> Iniciar câmera
                </>
              )}
            </Button>
          </div>

          <div className="relative aspect-square w-full bg-black">
            {cameraOn ? (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-white/60">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                }
              >
                <Scanner
                  onScan={(codes) => {
                    if (codes && codes.length > 0) handleDetected(codes[0].rawValue);
                  }}
                  onError={(err) => {
                    console.error("Scanner error", err);
                    toast.error("Não foi possível acessar a câmera.");
                    setCameraOn(false);
                  }}
                  constraints={{ facingMode: "environment" }}
                  styles={{ container: { width: "100%", height: "100%" } }}
                  scanDelay={500}
                />
              </Suspense>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-white/60">
                <Camera className="h-10 w-10" />
                <p className="text-sm">Toque em "Iniciar câmera" para começar</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Search className="h-4 w-4" /> Busca manual
        </div>
        <div className="relative">
          <Input
            placeholder="ID do pedido, e-mail ou nome do hóspede"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searchQ.isFetching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        {search.trim().length >= 2 && (
          <div className="divide-y divide-border/60 rounded-md border border-border/60">
            {searchSetupError && (
              <p className="flex items-start gap-2 p-3 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {searchSetupError}
              </p>
            )}
            {(searchQ.data?.rows ?? []).length === 0 && !searchQ.isFetching && (
              <p className="p-3 text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
            )}
            {(searchQ.data?.rows ?? []).map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{o.customerName || o.customerEmail}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    #{o.id.slice(0, 8)} · {o.customerEmail}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {o.checkedInAt ? (
                    <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      Já check-in
                    </Badge>
                  ) : o.status === "paid" ? (
                    <Badge variant="default">Pago</Badge>
                  ) : (
                    <Badge variant="outline">{o.status}</Badge>
                  )}
                  <Button
                    size="sm"
                    disabled={o.status !== "paid" || !!o.checkedInAt}
                    onClick={() => validateByIdMutation.mutate(o.id)}
                  >
                    Check-in
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4" /> Últimos check-ins
        </div>
        {recentSetupError && (
          <p className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {recentSetupError}
          </p>
        )}
        {(recent.data?.rows ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum check-in ainda.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {(recent.data?.rows ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.customerName || r.customerEmail}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    #{r.id.slice(0, 8)} ·{" "}
                    {new Date(r.checkedInAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {r.method || "manual"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ResultPanel({
  result,
  loading,
}: {
  result: CheckinResult | null;
  loading: boolean;
}) {
  const tone = useMemo(() => {
    if (!result) return null;
    if (result.status === "ok") return "ok";
    if (result.status === "already") return "warn";
    return "err";
  }, [result]);

  const bg =
    tone === "ok"
      ? "bg-emerald-500/10 border-emerald-500/40"
      : tone === "warn"
        ? "bg-amber-500/10 border-amber-500/40"
        : tone === "err"
          ? "bg-rose-500/10 border-rose-500/40"
          : "bg-muted/30 border-border/60";

  return (
    <Card className={`flex min-h-[210px] lg:min-h-[300px] flex-col items-center justify-center border-2 p-4 lg:p-6 text-center ${bg}`}>
      {loading && <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />}
      {!loading && !result && (
        <>
          <ScanLine className="h-12 w-12 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Aguardando leitura…</p>
        </>
      )}
      {!loading && result?.status === "ok" && (
        <>
          <CheckCircle2 className="h-16 w-16 text-emerald-600" />
          <h2 className="mt-2 font-display text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
            {result.stage === "bus" ? "Embarque confirmado" : "Check-in confirmado"}
          </h2>
          <p className="mt-1 text-sm">{result.customerName || result.customerEmail}</p>
          <p className="text-xs text-muted-foreground">{result.productLabel}</p>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">#{result.orderId.slice(0, 8)}</p>
          <StageProgress busAt={result.busCheckedInAt} lodgingAt={result.lodgingCheckedInAt} />
          {result.fullyCompleted && (
            <p className="mt-3 rounded-md bg-emerald-600/15 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              QR Code totalmente utilizado — não é mais válido.
            </p>
          )}
        </>
      )}
      {!loading && result?.status === "already" && (
        <>
          <AlertTriangle className="h-16 w-16 text-amber-600" />
          <h2 className="mt-2 font-display text-xl font-extrabold text-amber-700 dark:text-amber-300">
            {result.stage === "bus" ? "Embarque já validado" : "Check-in no quarto já validado"}
          </h2>
          <p className="mt-1 text-sm">{result.customerName || result.customerEmail}</p>
          <p className="text-xs text-muted-foreground">
            Validado em {new Date(result.checkedInAt).toLocaleString("pt-BR")}
          </p>
          <StageProgress busAt={result.busCheckedInAt} lodgingAt={result.lodgingCheckedInAt} />
        </>
      )}
      {!loading && result?.status === "unpaid" && (
        <>
          <XCircle className="h-16 w-16 text-rose-600" />
          <h2 className="mt-2 font-display text-xl font-extrabold text-rose-700 dark:text-rose-300">
            Pedido não pago
          </h2>
          <p className="mt-1 text-sm">Status atual: {result.orderStatus}</p>
          <p className="font-mono text-[11px] text-muted-foreground">#{result.orderId.slice(0, 8)}</p>
        </>
      )}
      {!loading && result?.status === "invalid" && (
        <>
          <XCircle className="h-16 w-16 text-rose-600" />
          <h2 className="mt-2 font-display text-xl font-extrabold text-rose-700 dark:text-rose-300">
            QR inválido
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Esse código não corresponde a nenhum pedido.
          </p>
        </>
      )}
    </Card>
  );
}

function StageProgress({
  busAt,
  lodgingAt,
}: {
  busAt: string | null;
  lodgingAt: string | null;
}) {
  return (
    <div className="mt-4 grid w-full max-w-xs grid-cols-2 gap-2 text-[11px]">
      <div
        className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 ${
          busAt
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-border/60 bg-muted/30 text-muted-foreground"
        }`}
      >
        <Bus className="h-3.5 w-3.5" />
        {busAt ? "Ônibus ✓" : "Ônibus pendente"}
      </div>
      <div
        className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 ${
          lodgingAt
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-border/60 bg-muted/30 text-muted-foreground"
        }`}
      >
        <BedDouble className="h-3.5 w-3.5" />
        {lodgingAt ? "Quarto ✓" : "Quarto pendente"}
      </div>
    </div>
  );
}