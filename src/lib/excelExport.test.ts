import { describe, expect, it } from "vitest";

import { buildSheetData, type ExcelColumn } from "./excelExport";

interface Row {
  name?: string | null;
  amount?: number | null;
  phone?: string | null;
  active?: boolean | null;
}

const columns: ExcelColumn<Row>[] = [
  { header: "Name", value: (row) => row.name },
  { header: "Amount", value: (row) => row.amount },
  { header: "Phone", value: (row) => row.phone, text: true },
  { header: "Active", value: (row) => row.active },
];

describe("buildSheetData", () => {
  it("builds a styled header row followed by data rows", () => {
    const sheet = buildSheetData(columns, [{ name: "Ali", amount: 1200, phone: "0501234567", active: true }]);

    expect(sheet).toHaveLength(2);
    expect(sheet[0][0]).toEqual({
      value: "Name",
      type: String,
      fontWeight: "bold",
      backgroundColor: "#F1F5F9",
      align: "left",
      wrap: true,
    });
    expect(sheet[1]).toEqual([
      { value: "Ali", type: String, format: "@" },
      1200,
      { value: "0501234567", type: String, format: "@" },
      true,
    ]);
  });

  it("keeps identifier columns as text and turns empty values into blank cells", () => {
    const sheet = buildSheetData(columns, [{ name: "", amount: null, phone: "0012345", active: null }]);

    expect(sheet[1]).toEqual([
      null,
      null,
      { value: "0012345", type: String, format: "@" },
      null,
    ]);
  });

  it("aligns headers to the right for RTL sheets", () => {
    const sheet = buildSheetData(columns, [], true);

    expect(sheet[0][0]).toMatchObject({ align: "right" });
  });
});
