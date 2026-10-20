import { describe, expect, it } from "vitest";
import { matchesQuery, matchesTextOrPhoneQuery } from "./search";

describe("matchesTextOrPhoneQuery", () => {
  const phones = ["+966 551620530"];

  it("finds a record whose phone is stored in another format", () => {
    expect(matchesTextOrPhoneQuery(["راكان"], phones, "0551620530")).toBe(true);
    expect(matchesTextOrPhoneQuery(["راكان"], phones, "+966 551620530")).toBe(true);
    expect(matchesTextOrPhoneQuery(["راكان"], phones, "551620530")).toBe(true);
    expect(matchesTextOrPhoneQuery(["راكان"], phones, "00966551620530")).toBe(true);
  });

  it("keeps the plain text behaviour - a short digit fragment still matches", () => {
    // This used to work (the phone was part of the searched values) and must
    // keep working: "1620" is a substring of the stored number.
    expect(matchesTextOrPhoneQuery(["راكان", "+966 551620530"], phones, "1620")).toBe(true);
    expect(matchesQuery(["راكان", "+966 551620530"], "1620")).toBe(true);
    expect(matchesTextOrPhoneQuery(["راكان", "+966 551620530"], phones, "6205")).toBe(true);
  });

  it("keeps matching names and other fields", () => {
    expect(matchesTextOrPhoneQuery(["راكان نايف"], phones, "راكان")).toBe(true);
    expect(matchesTextOrPhoneQuery(["", "RB12"], phones, "RB12")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(matchesTextOrPhoneQuery(["راكان"], phones, "xyz")).toBe(false);
    expect(matchesTextOrPhoneQuery(["راكان"], phones, "0509999999")).toBe(false);
  });

  it("matches everything for an empty query", () => {
    expect(matchesTextOrPhoneQuery(["راكان"], phones, "")).toBe(true);
    expect(matchesTextOrPhoneQuery(["راكان"], phones, "   ")).toBe(true);
  });

  it("is never stricter than the plain text search", () => {
    const values = ["راكان", "+966 551620530", "RB12"];
    const queries = [
      "562",
      "1620530",
      "0551620530",
      "+966 551620530",
      "551620530",
      "راكان",
      "RB12",
      "2024",
      "xyz",
      "",
    ];
    for (const query of queries) {
      const plain = matchesQuery(values, query);
      const combined = matchesTextOrPhoneQuery(values, phones, query);
      expect(combined, `query: ${query}`).toBe(plain || combined);
      if (plain) expect(combined, `query: ${query}`).toBe(true);
    }
  });
});
