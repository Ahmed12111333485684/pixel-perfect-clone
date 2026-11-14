import { describe, expect, it } from "vitest";

import { buildSheetData, type ExcelColumn } from "./excelExport";

interface Row {
  name?: string | null;
  amount?: number | null;
  phone?: string | null;
  active?: boolean | null;
}

const border = {
  borderColor: "#E2E8F0",
  borderStyle: "thin",
};

const columns: ExcelColumn<Row>[] = [
  { header: "Name", value: (row) => row.name },
  { header: "Amount", value: (row) => row.amount },
  { header: "Phone", value: (row) => row.phone, text: true },
  { header: "Active", value: (row) => row.active },
];

describe("buildSheetData", () => {
  it("builds a styled header row followed by bordered data rows", () => {
    const sheet = buildSheetData(columns, [{ name: "Ali", amount: 1200, phone: "0501234567", active: true }]);

    expect(sheet).toHaveLength(2);
    expect(sheet[0][0]).toEqual({
      value: "Name",
      type: String,
      fontWeight: "bold",
      backgroundColor: "#1F2A44",
      textColor: "#FFFFFF",
      align: "center",
      alignVertical: "center",
      height: 24,
      borderColor: "#CBD5E1",
      borderStyle: "thin",
    });
    expect(sheet[1]).toEqual([
      { value: "Ali", type: String, format: "@", align: "left", ...border },
      { value: 1200, ...border },
      { value: "0501234567", type: String, format: "@", align: "left", ...border },
      { value: true, ...border },
    ]);
  });

  it("keeps identifier columns as text and styles empty cells", () => {
    const sheet = buildSheetData(columns, [{ name: "", amount: null, phone: "0012345", active: null }]);

    expect(sheet[1]).toEqual([
      { ...border },
      { ...border },
      { value: "0012345", type: String, format: "@", align: "left", ...border },
      { ...border },
    ]);
  });

  it("applies number formats", () => {
    const moneyColumns: ExcelColumn<Row>[] = [
      { header: "Amount", value: (row) => row.amount, numberFormat: "#,##0.00" },
    ];
    const sheet = buildSheetData(moneyColumns, [{ amount: 1200.5 }]);

    expect(sheet[1]).toEqual([{ value: 1200.5, format: "#,##0.00", ...border }]);
  });

  it("centers headers and aligns text data to the sheet direction", () => {
    const sheet = buildSheetData(columns, [{ name: "Ali" }], true);

    expect(sheet[0][0]).toMatchObject({ align: "center" });
    expect(sheet[1][0]).toMatchObject({ align: "right" });
  });
});
