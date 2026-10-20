import { normalizeForSearch } from "@/lib/search";

export const PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "Office",
  "Land",
  "Shop",
  "Warehouse",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPES_BY_CATEGORY: Record<string, string[]> = {
  سكني: ["فيلا", "شقة", "دوبليكس", "دور", "تاون هاوس", "عمارة سكنية", "ارض سكنية", "قصر"],
  تجاري: [
    "مكتب",
    "عمارة تجارية",
    "ارض تجارية",
    "ارض صناعية",
    "مستودع",
    "محطة",
    "استراحة",
    "محل تجاري",
    "أرض مستودع",
    "أرض عليها تصريح محطة",
  ],
};

export const PROPERTY_CATEGORIES = Object.keys(PROPERTY_TYPES_BY_CATEGORY);

export function getPropertyTypesByCategory(category: string): string[] {
  return PROPERTY_TYPES_BY_CATEGORY[category] ?? [];
}

export function localizePropertyType(
  t: (key: string, options?: Record<string, unknown>) => string,
  type: string | null | undefined,
) {
  if (!type) return t("common.notProvided");
  return t(`propertyType.${type}`, { defaultValue: type });
}

/**
 * Spelling variants of the same property type. `normalizeForSearch` already
 * bridges the alef/hamza and ta-marbuta differences ("أرض" / "ارض"), but a
 * couple of types are also written with a different vowel letter.
 */
const PROPERTY_TYPE_VARIANTS: Record<string, string> = {
  دوبلكس: "دوبليكس",
};

/**
 * Canonical form of a property type, used to compare a stored value against a
 * filter selection. Returns "" for a missing value.
 */
export function canonicalPropertyType(value: string | null | undefined): string {
  // ى (alef maqsura) and ي (yeh) are both used for the same word - "تجاري" /
  // "تجارى" - so they are folded together here as well.
  const normalized = normalizeForSearch(value).replace(/ى/g, "ي");
  if (!normalized) return "";
  return PROPERTY_TYPE_VARIANTS[normalized] ?? normalized;
}

/**
 * Property type options for the filter, scoped to a category. An empty
 * category returns the types of both categories.
 */
export function getPropertyTypeFilterOptions(category?: string | null): string[] {
  if (!category || category === "all") {
    return Array.from(
      new Set([
        ...(PROPERTY_TYPES_BY_CATEGORY["سكني"] ?? []),
        ...(PROPERTY_TYPES_BY_CATEGORY["تجاري"] ?? []),
      ]),
    );
  }
  return getPropertyTypesByCategory(category) ?? [];
}

/**
 * True when a record's stored property type matches the selected filter
 * value. An empty selection means "no filter".
 */
export function matchesPropertyType(value: string | null | undefined, selected: string): boolean {
  if (!selected || selected === "all") return true;
  return canonicalPropertyType(value) === canonicalPropertyType(selected);
}
