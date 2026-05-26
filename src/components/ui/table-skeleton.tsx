import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

/** Renders N skeleton rows × M skeleton cells inside a <TableBody>. */
export function TableSkeleton({
  rows = 8,
  columns,
  cellMaxWidth = 160,
}: {
  rows?: number;
  columns: number;
  cellMaxWidth?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`sk-${i}`}>
          {Array.from({ length: columns }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" style={{ maxWidth: cellMaxWidth }} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}