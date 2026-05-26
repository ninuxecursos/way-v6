import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { EmptyHint } from "@/components/admin/dashboard/DashboardSection";

export function RecentAuditCard({
  items,
}: {
  items: {
    id: string;
    action: string;
    entity_type: string;
    actor_email: string | null;
    created_at: string;
  }[];
}) {
  return (
    <div className="admin-card mt-4 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">Atividade recente</div>
        <Link to="/admin/audit" className="text-xs text-muted-foreground hover:text-foreground">
          Ver auditoria →
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyHint>
          <AlertTriangle className="h-4 w-4 inline mr-1.5" />
          Sem registros ainda.
        </EmptyHint>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
              <div className="min-w-0">
                <span className="font-medium">{a.action}</span>
                <span className="text-muted-foreground ml-2">{a.entity_type}</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-3 shrink-0">
                <span className="hidden sm:inline truncate max-w-[200px]">
                  {a.actor_email ?? "—"}
                </span>
                <span className="tabular-nums">
                  {new Date(a.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}