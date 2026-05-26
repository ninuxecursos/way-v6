import {
  ClipboardList,
  Wallet,
  CreditCard,
  QrCode,
  Clock,
  User,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { fmtBRL } from "@/lib/format";
import type { ReservationStats } from "@/lib/reservations";

export function ReservationStatsGrid({
  stats,
  loading,
}: {
  stats?: ReservationStats;
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total de reservas"
        value={(stats?.total ?? 0).toLocaleString("pt-BR")}
        icon={<ClipboardList className="h-4 w-4" />}
        loading={loading}
      />
      <StatCard
        label="Total recebido"
        value={fmtBRL(stats?.totalReceivedCents ?? 0)}
        icon={<Wallet className="h-4 w-4" />}
        loading={loading}
      />
      <StatCard
        label="Pagamentos PIX"
        value={(stats?.pixCount ?? 0).toLocaleString("pt-BR")}
        icon={<QrCode className="h-4 w-4" />}
        loading={loading}
      />
      <StatCard
        label="Pagamentos Cartão"
        value={(stats?.cardCount ?? 0).toLocaleString("pt-BR")}
        icon={<CreditCard className="h-4 w-4" />}
        loading={loading}
      />
      <StatCard
        label="Pendências"
        value={(stats?.pendingCount ?? 0).toLocaleString("pt-BR")}
        icon={<Clock className="h-4 w-4" />}
        loading={loading}
      />
      <StatCard
        label="Modalidade Individual"
        value={(stats?.individualCount ?? 0).toLocaleString("pt-BR")}
        icon={<User className="h-4 w-4" />}
        loading={loading}
      />
      <StatCard
        label="Modalidade Galera"
        value={(stats?.galeraCount ?? 0).toLocaleString("pt-BR")}
        icon={<Users className="h-4 w-4" />}
        loading={loading}
      />
    </div>
  );
}