/**
 * Fonte única dos itens de navegação do admin (compartilhada entre
 * sidebar desktop e shell mobile).
 */
import {
  LayoutDashboard,
  FileText,
  Newspaper,
  Image as ImageIcon,
  Package,
  ShoppingBag,
  Receipt,
  ReceiptText,
  CreditCard,
  BarChart3,
  FileCheck,
  FileStack,
  Users,
  Tag,
  Mail,
  PlugZap,
  Inbox,
  Settings,
  ShieldCheck,
  ScanLine,
  ClipboardList,
  Users2,
  BedDouble,
  MessagesSquare,
  Sparkles,
  Trash2,
  Activity,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type NavGroup = { label: string; items: NavItem[] };

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Visão geral",
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Conteúdo",
    items: [
      { to: "/admin/pages", label: "Páginas (CMS)", icon: FileText },
      { to: "/admin/blog", label: "Blog", icon: Newspaper },
      { to: "/admin/media", label: "Mídia", icon: ImageIcon },
    ],
  },
  {
    label: "Vendas",
    items: [
      { to: "/admin/products", label: "Produtos", icon: Package },
      { to: "/admin/orders", label: "Pedidos", icon: ShoppingBag },
      { to: "/admin/checkin", label: "Check-in (QR)", icon: ScanLine },
      { to: "/admin/reservations", label: "Reservas", icon: ClipboardList },
      { to: "/admin/groups", label: "Grupos Galera", icon: Users2 },
      { to: "/admin/coupons", label: "Cupons", icon: Tag },
      { to: "/admin/rooms", label: "Quartos", icon: BedDouble },
      { to: "/admin/receipts", label: "Recibos", icon: Receipt },
      { to: "/admin/receipt-templates", label: "Modelos de recibo", icon: ReceiptText },
      { to: "/admin/gateways", label: "Gateways", icon: CreditCard },
      { to: "/admin/finance", label: "Financeiro", icon: BarChart3 },
      { to: "/admin/fiscal", label: "Fiscal (NF-e/NFS-e)", icon: FileCheck },
      { to: "/admin/fiscal-invoices", label: "Notas emitidas", icon: FileStack },
    ],
  },
  {
    label: "Clientes",
    items: [
      { to: "/admin/customers", label: "Clientes", icon: Users },
      { to: "/admin/segments", label: "Segmentos", icon: Tag },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { to: "/admin/email-templates", label: "E-mails (templates)", icon: Mail },
      { to: "/admin/email-providers", label: "Provedores", icon: PlugZap },
      { to: "/admin/email-outbox", label: "Caixa de saída", icon: Inbox },
      { to: "/admin/messages", label: "Mensagens (contato)", icon: MessagesSquare },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/admin/settings", label: "Configurações", icon: Settings },
      { to: "/admin/analytics", label: "Analytics", icon: Activity },
      { to: "/admin/ai-providers", label: "Provedores de IA", icon: Sparkles },
      { to: "/admin/security", label: "Segurança (2FA)", icon: ShieldCheck },
      { to: "/admin/audit", label: "Auditoria", icon: ShieldCheck },
      { to: "/admin/data-cleanup", label: "Limpeza de dados", icon: Trash2 },
    ],
  },
];

/** Atalhos fixos exibidos na bottom navigation. O 5º item é "Mais". */
export const BOTTOM_NAV: NavItem[] = [
  { to: "/admin", label: "Início", icon: LayoutDashboard },
  { to: "/admin/orders", label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/products", label: "Produtos", icon: Package },
  { to: "/admin/customers", label: "Clientes", icon: Users },
];

export function isActivePath(currentPath: string, to: string): boolean {
  if (to === "/admin") return currentPath === "/admin";
  return currentPath === to || currentPath.startsWith(to + "/");
}