import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingBag, CalendarDays, ArrowRight, ScanLine, X, Ticket } from "lucide-react";
import { useT, useFormatters } from "@/components/i18n/LocaleProvider";
import { CheckinValidator } from "@/components/checkin/CheckinValidator";
import { useReservation } from "@/hooks/use-reservation";
import { z } from "zod";

const searchSchema = z.object({
  resume: z.enum(["reservation"]).optional(),
});

export const Route = createFileRoute("/conta/")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AccountHome,
});

function AccountHome() {
  const { user, isAdmin } = useAuth();
  const t = useT();
  const { formatDate } = useFormatters();
  const navigate = useNavigate();
  const search = useSearch({ from: "/conta/" });
  const { state: reservation, hydrated } = useReservation();
  const [stats, setStats] = useState<{ orders: number; paid: number; total: number; last: string | null }>({
    orders: 0, paid: 0, total: 0, last: null,
  });
  const [loading, setLoading] = useState(true);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);
  const [resumeCancelled, setResumeCancelled] = useState(false);

  // Detecta reserva pendente: modalidade + participante mas sem termos aceitos.
  const hasPendingReservation =
    hydrated &&
    !!reservation.modality &&
    !!reservation.participant &&
    !reservation.terms?.acceptedTerms;

  // Quando ?resume=reservation aparecer (vindo do link de confirmação de e-mail),
  // dispara contagem regressiva de 2s e redireciona para /reservation/terms.
  useEffect(() => {
    if (resumeCancelled) return;
    if (search.resume !== "reservation") return;
    if (!hasPendingReservation) return;
    setResumeCountdown(2);
    const t1 = setTimeout(() => setResumeCountdown(1), 1000);
    const t2 = setTimeout(() => {
      navigate({ to: "/reservation/terms", replace: true });
    }, 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [search.resume, hasPendingReservation, resumeCancelled, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_customer_stats", { _user_id: user.id }).then(({ data }) => {
      const row = (data as Array<{ orders_count: number; paid_orders_count: number; total_spent_cents: number; last_order_at: string | null }> | null)?.[0];
      if (row) {
        setStats({
          orders: Number(row.orders_count ?? 0),
          paid: Number(row.paid_orders_count ?? 0),
          total: Number(row.total_spent_cents ?? 0),
          last: row.last_order_at,
        });
      }
      setLoading(false);
    });
  }, [user]);

  const name = (user?.user_metadata?.display_name as string | undefined) || user?.email?.split("@")[0] || "viajante";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">{t("account.dashboard.hello")}</p>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mt-1">
          {name} <span className="text-brand">.</span>
        </h1>
        <p className="mt-2 text-muted-foreground">{t("account.dashboard.welcomeBack")}</p>
      </header>

      {hasPendingReservation && reservation.modality && (
        <Card className="border-brand/40 bg-gradient-to-br from-brand/10 to-brand/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  Reserva pendente
                </p>
                <p className="font-display text-lg font-bold">
                  {reservation.modality.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Falta aceitar os termos e finalizar o pagamento.
                  {resumeCountdown !== null && !resumeCancelled
                    ? ` Redirecionando em ${resumeCountdown}s…`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {resumeCountdown !== null && !resumeCancelled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setResumeCancelled(true);
                    setResumeCountdown(null);
                  }}
                >
                  Cancelar
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => navigate({ to: "/reservation/terms" })}
                className="gap-1"
              >
                Continuar reserva <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isAdmin && (
        <div>
          <Button
            onClick={() => setCheckinOpen(true)}
            className="gap-2 bg-gradient-to-r from-brand to-brand/80 text-white shadow-lg shadow-brand/20 hover:from-brand/90 hover:to-brand/70"
            size="lg"
          >
            <ScanLine className="h-5 w-5" />
            Check-in
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={<ShoppingBag size={18} />}
          label={t("account.dashboard.orders")}
          value={loading ? "—" : String(stats.orders)}
        />
        <StatCard
          icon={<Ticket size={18} />}
          label={t("account.dashboard.paidOrders")}
          value={loading ? "—" : String(stats.paid)}
        />
        <StatCard
          icon={<CalendarDays size={18} />}
          label={t("account.dashboard.lastOrder")}
          value={loading ? "—" : stats.last ? formatDate(stats.last) : "—"}
        />
      </div>

      <Card className="p-5 bg-gradient-to-br from-[#1a0710] to-[#0f0f0f] border-white/10 text-white">
        <h2 className="font-display text-xl font-bold">{t("account.dashboard.ctaTitle")}</h2>
        <p className="mt-1 text-sm text-white/70">{t("account.dashboard.ctaDesc")}</p>
        <Link to="/reservation" className="mt-4 inline-flex items-center gap-2 text-brand font-semibold text-sm hover:underline">
          {t("account.dashboard.ctaButton")} <ArrowRight size={14} />
        </Link>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <QuickLink to="/conta/pedidos" title={t("account.dashboard.myOrdersTitle")} desc={t("account.dashboard.myOrdersDesc")} />
        <QuickLink to="/conta/perfil" title={t("account.dashboard.myProfileTitle")} desc={t("account.dashboard.myProfileDesc")} />
      </div>

      {isAdmin && (
        <Dialog open={checkinOpen} onOpenChange={setCheckinOpen}>
          <DialogContent
            className="!max-w-none !w-screen !h-[100dvh] !top-0 !left-0 !translate-x-0 !translate-y-0 !rounded-none !border-0 !p-0 overflow-y-auto"
          >
            <DialogHeader className="sticky top-0 z-10 flex flex-row items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
              <DialogTitle className="font-display text-lg font-extrabold">
                Validação / Check-in
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCheckinOpen(false)}
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogHeader>
            <div className="px-2 pb-8 sm:px-4">
              <CheckinValidator hideHeader readUrlToken={false} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest">
        {icon} {label}
      </div>
      <div className="mt-2 font-display text-2xl font-extrabold">{value}</div>
    </Card>
  );
}

function QuickLink({ to, title, desc }: { to: "/conta/pedidos" | "/conta/perfil"; title: string; desc: string }) {
  return (
    <Link to={to} className="group">
      <Card className="p-4 transition-colors hover:border-brand/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-bold">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
          <ArrowRight size={16} className="text-muted-foreground group-hover:text-brand transition-colors" />
        </div>
      </Card>
    </Link>
  );
}
