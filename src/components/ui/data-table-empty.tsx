import type { ReactNode } from "react";
import { TableCell, TableRow } from "@/components/ui/table";

/** Empty state row spanning the whole table. */
export function DataTableEmpty({
  colSpan,
  icon,
  title,
  description,
}: {
  colSpan: number;
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-16 text-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          {icon}
          <div className="text-sm font-medium">{title}</div>
          {description && <div className="text-xs">{description}</div>}
        </div>
      </TableCell>
    </TableRow>
  );
}