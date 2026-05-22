export const PROPERTY_TYPES = ["Apartment", "Villa", "Office", "Land", "Shop", "Warehouse"] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export function localizePropertyType(
  t: (key: string, options?: Record<string, unknown>) => string,
  type: string | null | undefined,
) {
  if (!type) return t("common.notProvided");
  return t(`propertyType.${type}`, { defaultValue: type });
}
