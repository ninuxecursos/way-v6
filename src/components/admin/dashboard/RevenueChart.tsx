import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { fmtBRL } from "@/lib/format";

export function RevenueChart({ data }: { data: { day: string; cents: number }[] }) {
  return (
    <div className="admin-card mt-4 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">Vendas diárias</div>
        <div className="text-xs text-muted-foreground">Últimos 30 dias</div>
      </div>
      <div className="h-56 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="grad-sales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={(v) => v.slice(8, 10) + "/" + v.slice(5, 7)}
              fontSize={11}
              stroke="var(--muted-foreground)"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [fmtBRL(v), "Receita"]}
              labelFormatter={(v) => v}
            />
            <Area
              type="monotone"
              dataKey="cents"
              stroke="var(--primary)"
              fill="url(#grad-sales)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}