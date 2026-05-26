import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Check, AlertCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  validateGroupCoupon,
  type GroupCouponPreview,
} from "@/lib/groups.functions";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onValid?: (preview: GroupCouponPreview) => void;
  onInvalid?: () => void;
};

export function CouponField({ value, onChange, onValid, onInvalid }: Props) {
  const validate = useServerFn(validateGroupCoupon);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [preview, setPreview] = useState<GroupCouponPreview | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    if (!value || value.length < 4) {
      setStatus("idle");
      setPreview(null);
      onInvalid?.();
      return;
    }
    setStatus("loading");
    const handle = window.setTimeout(async () => {
      try {
        const res = await validate({ data: { coupon: value } });
        if (cancelled) return;
        setPreview(res);
        setStatus("ok");
        onValid?.(res);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Cupom inválido";
        setError(msg);
        setStatus("error");
        setPreview(null);
        onInvalid?.();
      }
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="space-y-2">
      <Label htmlFor="group-coupon">Cupom do grupo</Label>
      <div className="relative">
        <Input
          id="group-coupon"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          placeholder="EX: A3F9X2"
          maxLength={6}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "pr-9 font-mono uppercase tracking-[0.3em] text-center text-base",
            status === "ok" && "border-emerald-500 focus-visible:ring-emerald-500/30",
            status === "error" && "border-destructive focus-visible:ring-destructive/30",
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {status === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {status === "ok" && <Check className="h-4 w-4 text-emerald-500" />}
          {status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
        </div>
      </div>

      {status === "ok" && preview && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
          <p className="font-semibold text-emerald-600 dark:text-emerald-400">
            Você está entrando no quarto de {preview.holderName}
          </p>
          <p className="text-muted-foreground">
            {preview.paidCount} de {preview.capacity} vagas pagas
            {" · "}
            {preview.available} {preview.available === 1 ? "vaga restante" : "vagas restantes"}
          </p>
        </div>
      )}
      {status === "error" && error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      {status !== "ok" && (
        <p className="text-[11px] text-muted-foreground">
          Código de 6 caracteres do titular (quem reservou o quarto primeiro). Você paga
          a sua vaga e entra no mesmo quarto Galera. O cupom é só de vínculo —
          não dá desconto.
        </p>
      )}
    </div>
  );
}