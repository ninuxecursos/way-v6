import { EmptyHint } from "@/components/admin/dashboard/DashboardSection";

export function CustomersCard({
  newCustomers7,
  newCustomers30,
  totalCustomers,
  reviews,
}: {
  newCustomers7: number;
  newCustomers30: number;
  totalCustomers: number;
  reviews: { id: string; rating: number; comment: string | null }[];
}) {
  return (
    <div className="admin-card p-5">
      <div className="grid grid-cols-3 gap-4 text-center mb-4">
        <Mini label="Novos / 7d" value={newCustomers7} />
        <Mini label="Novos / 30d" value={newCustomers30} />
        <Mini label="Total" value={totalCustomers} />
      </div>
      <div className="text-sm font-semibold mb-2">Últimas avaliações</div>
      {reviews.length === 0 ? (
        <EmptyHint>Sem avaliações recentes.</EmptyHint>
      ) : (
        <ul className="space-y-2">
          {reviews.map((r) => (
            <li key={r.id} className="flex items-start gap-3 text-sm">
              <span className="text-amber-500 tabular-nums shrink-0">
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </span>
              <span className="text-muted-foreground line-clamp-1 flex-1">
                {r.comment ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xl font-semibold tabular-nums">
        {value.toLocaleString("pt-BR")}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
        {label}
      </div>
    </div>
  );
}