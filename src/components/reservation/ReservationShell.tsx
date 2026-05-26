import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ReservationStepper } from "./ReservationStepper";
import { useReservation } from "@/hooks/use-reservation";
import type { ReservationStep } from "@/types/reservation";
import { useT } from "@/components/i18n/LocaleProvider";

interface Props {
  step: ReservationStep;
  title: string;
  subtitle?: string;
  children: ReactNode;
  aside?: ReactNode;
}

/**
 * Layout com header simplificado, stepper e área de conteúdo + resumo lateral.
 */
export function ReservationShell({ step, title, subtitle, children, aside }: Props) {
  const { state } = useReservation();
  const t = useT();
  const completed: ReservationStep[] = [];
  if (state.modality) completed.push("modality");
  if (state.participant) completed.push("register");
  if (state.terms?.acceptedTerms && state.terms.acceptedPrivacy) completed.push("terms");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-card/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-display text-lg font-black tracking-tight">
            Way Home
          </Link>
          <Link
            to="/contato"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {t("common.needHelp")}
          </Link>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <ReservationStepper current={step} completed={completed} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        {aside ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="min-w-0">{children}</section>
            <aside className="lg:sticky lg:top-6 lg:self-start">{aside}</aside>
          </div>
        ) : (
          <section className="min-w-0">{children}</section>
        )}
      </main>
    </div>
  );
}