import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

/**
 * Breadcrumbs derivados da rota atual.
 * Mapeia segmentos de URL para rótulos amigáveis.
 */
const LABELS: Record<string, string> = {
  admin: "Admin",
  pages: "Páginas",
  blog: "Blog",
  media: "Mídia",
  branding: "Branding",
  products: "Produtos",
  orders: "Pedidos",
  receipts: "Recibos",
  "receipt-templates": "Modelos de recibo",
  gateways: "Gateways",
  finance: "Financeiro",
  fiscal: "Fiscal",
  "fiscal-invoices": "Notas emitidas",
  customers: "Clientes",
  segments: "Segmentos",
  "email-templates": "E-mails",
  "email-providers": "Provedores",
  "email-outbox": "Caixa de saída",
  settings: "Configurações",
  audit: "Auditoria",
};

export function Breadcrumbs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const parts = path.split("/").filter(Boolean);
  const items: { label: string; href: string }[] = [];
  let acc = "";
  for (const p of parts) {
    acc += "/" + p;
    const label = LABELS[p] ?? (p.length > 24 ? p.slice(0, 8) + "…" : p);
    items.push({ label, href: acc });
  }
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground min-w-0">
      {items.map((it, i) => (
        <span key={it.href} className="flex items-center gap-1 min-w-0">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />}
          {i === items.length - 1 ? (
            <span className="text-foreground font-medium truncate">{it.label}</span>
          ) : (
            <Link to={it.href} className="hover:text-foreground transition-colors truncate">
              {it.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}