import { describe, expect, it } from "vitest";
import {
  canonicalPropertyType,
  getPropertyTypeFilterOptions,
  matchesPropertyType,
  PROPERTY_TYPES_BY_CATEGORY,
} from "./property-types";

describe("canonicalPropertyType", () => {
  it("normalizes alef/hamza and ta-marbuta spelling variants", () => {
    expect(canonicalPropertyType("أرض سكنية")).toBe(canonicalPropertyType("ارض سكنية"));
    expect(canonicalPropertyType("محل تجاري")).toBe(canonicalPropertyType("محل تجارى"));
  });
  it("normalizes whitespace", () => {
    expect(canonicalPropertyType("تاون  هاوس")).toBe(canonicalPropertyType("تاون هاوس"));
  });

  it("bridges the duplex spelling variant", () => {
    expect(canonicalPropertyType("دوبلكس")).toBe(canonicalPropertyType("دوبليكس"));
  });

  it("returns an empty string for a missing value", () => {
    expect(canonicalPropertyType(null)).toBe("");
    expect(canonicalPropertyType(undefined)).toBe("");
    expect(canonicalPropertyType("")).toBe("");
  });

  it("keeps residential and commercial variants apart", () => {
    expect(canonicalPropertyType("عمارة سكنية")).not.toBe(canonicalPropertyType("عمارة تجارية"));
    expect(canonicalPropertyType("ارض سكنية")).not.toBe(canonicalPropertyType("ارض تجارية"));
  });
});

describe("getPropertyTypeFilterOptions", () => {
  it("returns the types of the given category", () => {
    expect(getPropertyTypeFilterOptions("سكني")).toEqual(PROPERTY_TYPES_BY_CATEGORY["سكني"]);
    expect(getPropertyTypeFilterOptions("تجاري")).toEqual(PROPERTY_TYPES_BY_CATEGORY["تجاري"]);
  });

  it("returns every type when no category is selected", () => {
    const all = getPropertyTypeFilterOptions();
    expect(all).toHaveLength(
      PROPERTY_TYPES_BY_CATEGORY["سكني"].length + PROPERTY_TYPES_BY_CATEGORY["تجاري"].length,
    );
    expect(all).toContain("شقة");
    expect(all).toContain("مكتب");
  });

  it("treats the 'all' sentinel as no category", () => {
    expect(getPropertyTypeFilterOptions("all")).toEqual(getPropertyTypeFilterOptions());
  });

  it("returns an empty list for an unknown category", () => {
    expect(getPropertyTypeFilterOptions("nonsense")).toEqual([]);
  });
});

describe("matchesPropertyType", () => {
  it("every property type the form offers is matchable by its own option", () => {
    for (const options of Object.values(PROPERTY_TYPES_BY_CATEGORY)) {
      for (const type of options) {
        expect(matchesPropertyType(type, type)).toBe(true);
      }
    }
  });

  it("matches the exact stored value", () => {
    expect(matchesPropertyType("شقة", "شقة")).toBe(true);
    expect(matchesPropertyType("فيلا", "شقة")).toBe(false);
  });

  it("matches across spelling variants", () => {
    expect(matchesPropertyType("أرض سكنية", "ارض سكنية")).toBe(true);
    expect(matchesPropertyType("دوبلكس", "دوبليكس")).toBe(true);
  });

  it("treats an empty or 'all' selection as no filter", () => {
    expect(matchesPropertyType("شقة", "")).toBe(true);
    expect(matchesPropertyType("شقة", "all")).toBe(true);
    expect(matchesPropertyType(null, "")).toBe(true);
  });

  it("does not match a record with no property type", () => {
    expect(matchesPropertyType(null, "شقة")).toBe(false);
    expect(matchesPropertyType("", "شقة")).toBe(false);
  });
});
