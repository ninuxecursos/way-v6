import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * Card de KPI compacto para o dashboard.
 */
export function StatCard({
  label,
  value,
  sub,
  trend,
  icon,
  loading,
  to,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  trend?: { value: number; label?: string } | null;
  icon?: ReactNode;
  loading?: boolean;
  to?: string;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {icon && <div className="text-muted-foreground/70">{icon}</div>}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
        {loading ? <span className="inline-block h-7 w-24 rounded bg-muted animate-pulse" /> : value}
      </div>
      {(sub || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 font-medium ${
                trend.value >= 0 ? "admin-kpi-up" : "admin-kpi-down"
              }`}
            >
              {trend.value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend.value).toFixed(1)}%
              {trend.label && <span className="text-muted-foreground font-normal ml-1">{trend.label}</span>}
            </span>
          )}
          {sub && <span className="text-muted-foreground">{sub}</span>}
        </div>
      )}
    </>
  );
  if (to) {
    return (
      <Link
        to={to as any}
        className="admin-card p-5 block transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="admin-card p-5">
      {inner}
    </div>
  );
}