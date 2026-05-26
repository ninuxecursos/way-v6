import { Check, Clock, CreditCard, PackageCheck, BedDouble, Bus } from "lucide-react";

type Step = { key: string; label: string; icon: typeof Check; date?: string | null; done: boolean; current?: boolean };

export function OrderTimeline({
  status,
  createdAt,
  paidAt,
  checkInAt,
  checkOutAt,
}: {
  status: string;
  createdAt: string;
  paidAt: string | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
}) {
  const isCanceled =
    status === "canceled" ||
    status === "cancelled" ||
    status === "failed" ||
    status === "refunded";
  const isPaid = !!paidAt || status === "paid";
  const isConfirmed = isPaid; // após pago, reserva confirmada

  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : null;

  const steps: Step[] = [
    { key: "created", label: "Pedido criado", icon: Clock, date: fmt(createdAt), done: true },
    { key: "paid", label: "Pagamento aprovado", icon: CreditCard, date: fmt(paidAt), done: isPaid, current: !isPaid && !isCanceled },
    { key: "confirmed", label: "Reserva confirmada", icon: PackageCheck, date: isConfirmed ? fmt(paidAt) : null, done: isConfirmed, current: isPaid && !checkInAt },
    { key: "bus", label: "Embarque no transfer", icon: Bus, date: fmt(checkInAt), done: !!checkInAt, current: isConfirmed && !checkInAt },
    { key: "lodging", label: "Check-in na Hospedagem Way Home", icon: BedDouble, date: fmt(checkOutAt), done: !!checkOutAt, current: !!checkInAt && !checkOutAt },
  ];

  if (isCanceled) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="font-semibold text-destructive">Pedido {status === "refunded" ? "reembolsado" : "cancelado"}.</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Caso tenha dúvidas, fale com o nosso suporte pelo WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-5">
      <span aria-hidden className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
      {steps.map((s) => {
        const Icon = s.done ? Check : s.icon;
        return (
          <li key={s.key} className="relative flex items-start gap-4">
            <div
              className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all ${
                s.done
                  ? "bg-brand border-brand text-brand-foreground shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand)_15%,transparent)]"
                  : s.current
                    ? "border-brand text-brand bg-card animate-pulse"
                    : "border-border text-muted-foreground bg-card"
              }`}
            >
              <Icon size={14} />
            </div>
            <div className="flex-1 pt-1.5">
              <p className={`text-sm font-semibold ${s.done || s.current ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </p>
              {s.date && <p className="text-xs text-muted-foreground mt-0.5">{s.date}</p>}
              {s.current && !s.date && <p className="text-xs text-brand mt-0.5">Em andamento</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}