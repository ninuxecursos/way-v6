import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import { CheckCircle2, FileText, QrCode as QrIcon, Loader2, RefreshCw, Bus, BedDouble } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMyOrderCheckin } from "@/lib/checkin.functions";
import { ensureMyReceipt } from "@/lib/receipts.functions";
import { toAppError } from "@/lib/errors";

type Props = { orderId: string };

export function OrderCheckinQR({ orderId }: Props) {
  const getCheckin = useServerFn(getMyOrderCheckin);
  const ensureReceipt = useServerFn(ensureMyReceipt);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<{
    token: string;
    code: string | null;
    expiresAt: string | null;
    ttlMs: number;
    status: string;
    checkedInAt: string | null;
    busCheckedInAt: string | null;
    lodgingCheckedInAt: string | null;
    fullyCompleted: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useRef(async () => {});
  useEffect(() => {
    let cancelled = false;
    refresh.current = async () => {
      try {
        const r = await getCheckin({ data: { orderId } });
        if (cancelled) return;
        setData({
          token: r.token,
          code: r.code ?? null,
          expiresAt: r.expiresAt ?? null,
          ttlMs: r.ttlMs ?? 60_000,
          status: r.status,
          checkedInAt: r.checkedInAt,
          busCheckedInAt: r.busCheckedInAt ?? null,
          lodgingCheckedInAt: r.lodgingCheckedInAt ?? null,
          fullyCompleted: Boolean(r.fullyCompleted),
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erro ao carregar QR.");
      }
    };
    refresh.current();
    return () => {
      cancelled = true;
    };
  }, [orderId, getCheckin]);

  // Auto-rotação: ressolicita o código pouco antes de expirar.
  useEffect(() => {
    if (!data?.expiresAt) return;
    const expMs = new Date(data.expiresAt).getTime();
    const refreshIn = Math.max(5_000, expMs - Date.now() - 5_000);
    const t = setTimeout(() => refresh.current(), refreshIn);
    return () => clearTimeout(t);
  }, [data?.expiresAt]);

  // Tick para countdown visual.
  useEffect(() => {
    if (!data?.expiresAt) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [data?.expiresAt]);

  // Polling leve enquanto QR não foi totalmente utilizado, para refletir validações
  // (ônibus / hospedagem) em tempo quase real sem depender da rotação do token.
  useEffect(() => {
    if (!data || data.fullyCompleted || data.status !== "paid") return;
    const i = setInterval(() => refresh.current(), 10_000);
    return () => clearInterval(i);
  }, [data?.fullyCompleted, data?.status]);

  useEffect(() => {
    const payload = data?.code || data?.token;
    if (!payload || !canvasRef.current) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://wayhome.app";
    const url = `${origin}/admin/checkin?ci=${payload}`;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 280,
      margin: 1,
      color: { dark: "#0a0a0a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).catch(() => undefined);
  }, [data?.code, data?.token]);

  const downloadReceipt = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const origin = window.location.origin;
      const { number } = await ensureReceipt({ data: { orderId, origin } });
      window.open(`/recibo/${number}?autoprint=1`, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("Não foi possível gerar o recibo", {
        description: toAppError(e).userMessage,
      });
    } finally {
      setDownloading(false);
    }
  };

  if (error) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">{error}</Card>
    );
  }

  if (!data) {
    return (
      <Card className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (data.status !== "paid") {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        O QR Code de check-in fica disponível assim que o pagamento for confirmado.
      </Card>
    );
  }

  const done = data.fullyCompleted;
  const remaining = data.expiresAt
    ? Math.max(0, Math.round((new Date(data.expiresAt).getTime() - now) / 1000))
    : null;

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <QrIcon className="h-4 w-4" /> QR Code de check-in
      </div>

      <div className="flex flex-col items-center gap-3">
        {!done && (
          <>
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <canvas ref={canvasRef} className="block" />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Use este QR Code <strong>2 vezes</strong>: no <strong>embarque do ônibus</strong> e na{" "}
              <strong>chegada ao quarto</strong>. Após as duas validações, ele é desativado.
            </p>
          </>
        )}
        <code className="rounded-md border bg-muted/40 px-3 py-1.5 font-mono text-[11px] tracking-wider">
          {data.token.slice(0, 8).toUpperCase()}-{data.token.slice(8, 16).toUpperCase()}
        </code>

        {/* Progresso das 2 etapas */}
        <div className="mt-1 grid w-full grid-cols-2 gap-2 text-[11px]">
          <div
            className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 ${
              data.busCheckedInAt
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-border/60 bg-muted/30 text-muted-foreground"
            }`}
          >
            <Bus className="h-3.5 w-3.5" />
            <span className="font-semibold">
              {data.busCheckedInAt ? "Ônibus validado" : "Embarque pendente"}
            </span>
          </div>
          <div
            className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 ${
              data.lodgingCheckedInAt
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-border/60 bg-muted/30 text-muted-foreground"
            }`}
          >
            <BedDouble className="h-3.5 w-3.5" />
            <span className="font-semibold">
              {data.lodgingCheckedInAt ? "Quarto validado" : "Quarto pendente"}
            </span>
          </div>
        </div>

        {!done && remaining !== null && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            Código renova em <span className="font-mono">{remaining}s</span>
          </div>
        )}
      </div>

      {done ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          QR Code utilizado nas 2 validações — não é mais ativo.
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadReceipt}
            disabled={downloading}
            className="w-full"
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Baixar recibo (com QR codes)
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            O recibo contém os 2 QR codes oficiais para embarque no ônibus e check-in no quarto.
          </p>
        </div>
      )}
    </Card>
  );
}
