import type { Cell, SheetData } from "write-excel-file/browser";

export type ExcelCellValue = string | number | boolean | Date | null | undefined;

export interface ExcelColumn<T> {
  header: string;
  value: (row: T) => ExcelCellValue;
  width?: number;
  text?: boolean;
}

export interface ExportToExcelOptions<T> {
  fileName: string;
  sheet: string;
  columns: ExcelColumn<T>[];
  rows: T[];
  rightToLeft?: boolean;
}

function toCell(value: ExcelCellValue, text = false): Cell {
  if (value === null || value === undefined || value === "") return null;
  if (text) {
    return { value: String(value), type: String, format: "@" };
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value);
  }
  if (typeof value === "boolean" || value instanceof Date) {
    return value;
  }
  return { value, type: String, format: "@" };
}

export function buildSheetData<T>(
  columns: ExcelColumn<T>[],
  rows: T[],
  rightToLeft = false,
): SheetData {
  const headerRow = columns.map((column) => ({
    value: column.header,
    type: String,
    fontWeight: "bold" as const,
    backgroundColor: "#F1F5F9",
    align: rightToLeft ? ("right" as const) : ("left" as const),
    wrap: true,
  }));

  return [
    headerRow,
    ...rows.map((row) => columns.map((column) => toCell(column.value(row), column.text))),
  ];
}

export async function exportToExcel<T>({
  fileName,
  sheet,
  columns,
  rows,
  rightToLeft = false,
}: ExportToExcelOptions<T>): Promise<void> {
  if (rows.length === 0) {
    throw new Error("No rows to export");
  }

  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const sheetData = buildSheetData(columns, rows, rightToLeft);

  await writeExcelFile(sheetData, {
    sheet,
    rightToLeft,
    stickyRowsCount: 1,
    columns: columns.map((column) => (column.width ? { width: column.width } : {})),
  }).toFile(fileName);
}
