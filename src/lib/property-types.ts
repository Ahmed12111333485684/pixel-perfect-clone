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
  "سكني": ["فيلا", "شقة", "دوبليكس", "دور", "تاون هاوس", "عمارة سكنية", "ارض سكنية", "قصر"],
  "تجاري": ["مكتب", "عمارة تجارية", "ارض تجارية", "ارض صناعية", "مستودع", "محطة", "استراحة", "محل تجاري", "أرض مستودع", "أرض عليها تصريح محطة"],
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
