import type { Cell, SheetData } from "write-excel-file/browser";

export type ExcelCellValue = string | number | boolean | Date | null | undefined;

export interface ExcelColumn<T> {
  header: string;
  value: (row: T) => ExcelCellValue;
  width?: number;
  text?: boolean;
  numberFormat?: string;
}

const HEADER_STYLE = {
  fontWeight: "bold",
  backgroundColor: "#1F2A44",
  textColor: "#FFFFFF",
  align: "center",
  alignVertical: "center",
  height: 24,
  borderColor: "#CBD5E1",
  borderStyle: "thin",
} as const;

const DATA_BORDER = {
  borderColor: "#E2E8F0",
  borderStyle: "thin",
} as const;

export interface ExportToExcelOptions<T> {
  fileName: string;
  sheet: string;
  columns: ExcelColumn<T>[];
  rows: T[];
  rightToLeft?: boolean;
}

function toCell(
  value: ExcelCellValue,
  text = false,
  numberFormat?: string,
  align: "left" | "right" = "left",
): Cell {
  if (value === null || value === undefined || value === "") return { ...DATA_BORDER };
  if (text) {
    return { value: String(value), type: String, format: "@", align, ...DATA_BORDER };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { value: String(value), type: String, format: "@", align, ...DATA_BORDER };
    }
    return numberFormat
      ? { value, format: numberFormat, ...DATA_BORDER }
      : { value, ...DATA_BORDER };
  }
  if (typeof value === "boolean" || value instanceof Date) {
    return { value, ...DATA_BORDER };
  }
  return { value, type: String, format: "@", align, ...DATA_BORDER };
}

export function buildSheetData<T>(
  columns: ExcelColumn<T>[],
  rows: T[],
  rightToLeft = false,
): SheetData {
  const headerRow = columns.map((column) => ({
    value: column.header,
    type: String,
    ...HEADER_STYLE,
  }));
  const dataAlign = rightToLeft ? "right" : "left";

  return [
    headerRow,
    ...rows.map((row) => columns.map((column) => toCell(column.value(row), column.text, column.numberFormat, dataAlign))),
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
