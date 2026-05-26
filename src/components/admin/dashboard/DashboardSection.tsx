import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function DashboardSection({
  title,
  hint,
  linkTo,
  linkLabel,
  children,
}: {
  title: string;
  hint?: ReactNode;
  linkTo?: string;
  linkLabel?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-end justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        {linkTo && (
          <Link
            to={linkTo}
            className="text-xs font-medium text-foreground/80 hover:text-foreground"
          >
            {linkLabel} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <div className="text-sm text-muted-foreground py-4 text-center">{children}</div>;
}