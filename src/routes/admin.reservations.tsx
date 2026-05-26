import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { PageHeader } from "@/components/admin/PageHeader";
import { ReservationStatsGrid } from "@/components/admin/reservations/ReservationStatsGrid";
import {
  ReservationFilters,
  type ReservationFiltersValue,
} from "@/components/admin/reservations/ReservationFilters";
import { ReservationsTable } from "@/components/admin/reservations/ReservationsTable";
import { ReservationsPagination } from "@/components/admin/reservations/ReservationsPagination";
import { BulkDeleteBar } from "@/components/admin/reservations/BulkDeleteBar";
import { useDebounced } from "@/hooks/use-debounced";
import {
  fetchReservationList,
  fetchReservationStats,
} from "@/repositories/reservations.repo";

export const Route = createFileRoute("/admin/reservations")({
  component: ReservationsPage,
});

const PAGE_SIZE = 20;

const INITIAL_FILTERS: ReservationFiltersValue = {
  search: "",
  reservationType: "all",
  paymentMethod: "all",
  status: "all",
};

function ReservationsPage() {
  const [filters, setFilters] = useState<ReservationFiltersValue>(INITIAL_FILTERS);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounced(filters.search, 300);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [debouncedSearch, filters.reservationType, filters.paymentMethod, filters.status]);

  const stats = useQuery({
    queryKey: ["admin", "reservations", "stats"],
    queryFn: fetchReservationStats,
    staleTime: 30_000,
  });

  const list = useQuery({
    queryKey: [
      "admin",
      "reservations",
      "list",
      {
        debouncedSearch,
        reservationType: filters.reservationType,
        paymentMethod: filters.paymentMethod,
        status: filters.status,
        page,
      },
    ],
    queryFn: () =>
      fetchReservationList({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        reservationType: filters.reservationType,
        paymentMethod: filters.paymentMethod,
        status: filters.status,
      }),
    placeholderData: keepPreviousData,
  });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((list.data?.count ?? 0) / PAGE_SIZE)),
    [list.data?.count],
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const toggleAll = useCallback((ids: string[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) ids.forEach((i) => next.add(i));
      else ids.forEach((i) => next.delete(i));
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação"
        title="Reservas"
        description="Acompanhe todas as reservas, participantes e pagamentos em tempo real."
      />

      <ReservationStatsGrid stats={stats.data} loading={stats.isLoading} />

      <ReservationFilters
        value={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
      />

      <BulkDeleteBar selectedIds={Array.from(selected)} onClear={clearSelection} />

      <div className="admin-card overflow-hidden">
        <ReservationsTable
          rows={list.data?.rows ?? []}
          loading={list.isLoading}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
        <ReservationsPagination
          page={page}
          totalPages={totalPages}
          count={list.data?.count ?? 0}
          fetching={list.isFetching}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() =>
            setPage((p) => (p + 1 < totalPages ? p + 1 : p))
          }
        />
      </div>
    </div>
  );
}