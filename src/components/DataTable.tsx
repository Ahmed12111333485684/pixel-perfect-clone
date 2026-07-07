import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmptyState, LoadingBlock, ErrorBlock } from "./PageHeader";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows?: T[];
  loading?: boolean;
  error?: unknown;
  rowKey: (row: T) => string | number;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  error,
  rowKey,
  onEdit,
  onDelete,
  onRowClick,
  sortKey,
  sortDir,
  onSort,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={(error as Error)?.message} />;
  if (!rows || rows.length === 0) return <EmptyState />;

  const showActions = !!onEdit || !!onDelete;

  if (isMobile) {
    return (
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            className={`rounded-xl border border-border bg-card p-4 shadow-sm ${onRowClick ? "cursor-pointer" : ""}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            <div className="space-y-2">
              {columns.map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground shrink-0 min-w-[80px]">
                    {c.header}
                  </span>
                  <span className="text-sm text-right">{c.cell(row)}</span>
                </div>
              ))}
            </div>
            {showActions && (
              <div className="mt-3 flex justify-end gap-1 border-t border-border pt-3" onClick={(e) => e.stopPropagation()}>
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(row)}>
                    <Pencil className="me-1 h-3.5 w-3.5" />
                    {t("common.edit")}
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(row)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="me-1 h-3.5 w-3.5" />
                    {t("common.delete")}
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={`${c.className ?? ""} ${c.sortable && onSort ? "cursor-pointer select-none hover:bg-muted" : ""}`}
                  onClick={c.sortable && onSort ? () => onSort(c.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {c.header}
                    {c.sortable && onSort && (
                      <span className="text-muted-foreground/50">
                        {sortKey === c.key ? (
                          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
              {showActions && (
                <TableHead className="w-24 text-end">{t("common.actions")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={rowKey(row)}
                className={onRowClick ? "cursor-pointer" : ""}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.className}>
                    {c.cell(row)}
                  </TableCell>
                ))}
                {showActions && (
                  <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {onEdit && (
                        <Button variant="ghost" size="icon" onClick={() => onEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(row)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
