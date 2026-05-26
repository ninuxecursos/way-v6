import { QrCode, Bus, BedDouble, Users2 } from "lucide-react";

type Variant = "card" | "compact" | "inline";

const RULES = [
  {
    icon: QrCode,
    title: "QR Code único",
    body: "Você recebe 1 único QR Code por reserva. Ele é validado em 2 etapas — após as duas, é desativado e não pode mais ser usado.",
  },
  {
    icon: Bus,
    title: "1ª validação — embarque no ônibus",
    body: "Ao chegar no ônibus, a equipe lê seu QR Code para confirmar seu embarque. Esta validação acontece 1 vez apenas.",
  },
  {
    icon: BedDouble,
    title: "2ª validação — chegada ao quarto",
    body: "Ao chegar na hospedagem, o mesmo QR Code é lido novamente para fazer o check-in no quarto. Esta validação também acontece 1 vez apenas.",
  },
  {
    icon: Users2,
    title: "Quarto compartilhado incompleto",
    body: "Se a ocupação mínima do quarto compartilhado não for completada, a diferença é paga no ato do check-in. Máximo de 8 pessoas por quarto.",
  },
] as const;

export function ExperienceRules({ variant = "card" }: { variant?: Variant }) {
  if (variant === "inline") {
    return (
      <ul className="space-y-2 text-[12px] leading-snug text-muted-foreground">
        {RULES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-2">
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
            <span>
              <strong className="text-foreground">{title}.</strong> {body}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  const wrapper =
    variant === "compact"
      ? "rounded-lg border border-border/60 bg-muted/30 p-3"
      : "rounded-xl border border-border/60 bg-background/40 p-4 sm:p-5";

  return (
    <section className={wrapper} aria-label="Regras da experiência Way Home">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Importante saber
      </h3>
      <ul className="space-y-3">
        {RULES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-tight text-foreground">{title}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}