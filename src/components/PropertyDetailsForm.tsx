import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { localizePropertyType } from "@/lib/property-types";

type TemplateField = { key: string; label?: string; dataType?: string; required?: boolean };
type Template = { type: string; fields: TemplateField[] };

export default function PropertyDetailsForm({
  type,
  value,
  onChange,
  mode = "create",
}: {
  type: string;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  mode?: "create" | "edit";
}) {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ["property-templates", type],
    queryFn: () => api(`/api/propertytemplates?type=${encodeURIComponent(type)}`),
  });

  const BUILTIN_TEMPLATES: Template[] = [
    {
      type: "Apartment",
      fields: [
        { key: "rooms", label: "عدد الغرف", dataType: "number", required: true },
        { key: "area", label: "Area (sqm)", dataType: "number", required: true },
        { key: "floor", label: "Floor", dataType: "number" },
        { key: "furnished", label: "Furnished", dataType: "boolean" },
      ],
    },
    {
      type: "Villa",
      fields: [
        { key: "rooms", label: "Number of rooms", dataType: "number", required: true },
        { key: "area", label: "Lot area (sqm)", dataType: "number", required: true },
        { key: "has_garage", label: "Garage", dataType: "boolean" },
      ],
    },
    {
      type: "Office",
      fields: [
        { key: "floor", label: "Floor", dataType: "number" },
        { key: "area", label: "Area (sqm)", dataType: "number", required: true },
        { key: "meeting_rooms", label: "Meeting rooms", dataType: "number" },
        { key: "parking_spots", label: "Parking spots", dataType: "number" },
        { key: "open_plan", label: "Open plan", dataType: "boolean" },
      ],
    },
    {
      type: "Land",
      fields: [
        { key: "facade", label: "الواجهة", dataType: "string" },
        { key: "street_width", label: "عرض الشارع", dataType: "string" },
        { key: "area", label: "المساحة", dataType: "number", required: true },
        { key: "price_per_meter", label: "سعر المتر", dataType: "number" },
      ],
    },
    {
      type: "Shop",
      fields: [
        { key: "area", label: "Area (sqm)", dataType: "number", required: true },
        { key: "street_facing", label: "Street facing", dataType: "boolean" },
        { key: "storefront_width_m", label: "Storefront width (m)", dataType: "number" },
        { key: "has_storage", label: "Has storage", dataType: "boolean" },
      ],
    },
    {
      type: "Warehouse",
      fields: [
        { key: "area", label: "Area (sqm)", dataType: "number", required: true },
        { key: "ceiling_height_m", label: "Ceiling height (m)", dataType: "number" },
        { key: "loading_docks", label: "Loading docks", dataType: "number" },
        { key: "climate_control", label: "Climate control", dataType: "boolean" },
        { key: "yard_area", label: "Yard area (sqm)", dataType: "number" },
      ],
    },
  ];

  const legacyKeyAliases: Record<string, string[]> = {
    area: ["area_sqm", "lot_area_sqm", "yard_area_sqm"],
  };

  const readValue = (fieldKey: string) => {
    if (value?.[fieldKey] !== undefined) return value[fieldKey];
    const aliases = legacyKeyAliases[fieldKey] ?? [];
    for (const alias of aliases) {
      if (value?.[alias] !== undefined) return value[alias];
    }
    return undefined;
  };

  const templates: Template[] =
    q.data && Array.isArray(q.data) && q.data.length > 0
      ? (q.data as Template[])
      : BUILTIN_TEMPLATES;
  const template: Template | null =
    templates.find(
      (tpl) => typeof tpl.type === "string" && tpl.type.toLowerCase() === type.toLowerCase(),
    ) ??
    templates[0] ??
    null;

  if (!template) return null;

  const editableFields =
    mode === "edit"
      ? Object.entries(value ?? {})
          .filter(
            ([, fieldValue]) =>
              fieldValue !== null && fieldValue !== undefined && fieldValue !== "",
          )
          .map(([key, fieldValue]) => {
            const templateField = (template.fields || []).find((f: TemplateField) => f.key === key);
            return {
              key,
              value: fieldValue,
              label: templateField?.label ?? key,
              dataType:
                templateField?.dataType ??
                (typeof fieldValue === "number"
                  ? "number"
                  : typeof fieldValue === "boolean"
                    ? "boolean"
                    : "string"),
            };
          })
      : template.fields;

  return (
    <div className="space-y-2">
      <Label>{`${t("common.type")}: ${localizePropertyType(t, template.type)}`}</Label>
      <div className="grid gap-3 sm:grid-cols-2">
        {editableFields.map(
          (f: TemplateField & { key: string; value?: unknown; label?: string }) => {
            const key = f.key;
            const val = mode === "edit" ? f.value : readValue(key);
            if (f.dataType === "number") {
              return (
                <div key={key} className="space-y-2">
                  <Label>{f.label}</Label>
                  <Input
                    type="number"
                    value={(val ?? "") as string | number}
                    onChange={(e) => {
                      const next = { ...value };
                      const nextValue = e.target.value === "" ? null : Number(e.target.value);
                      next[key] = nextValue;
                      if (mode === "create") {
                        for (const alias of legacyKeyAliases[key] ?? []) delete next[alias];
                      }
                      onChange(next);
                    }}
                  />
                </div>
              );
            }
            if (f.dataType === "boolean") {
              return (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    checked={!!val}
                    onCheckedChange={(c) => onChange({ ...value, [key]: c === true })}
                  />
                  <span>{f.label}</span>
                </div>
              );
            }
            return (
              <div key={key} className="space-y-2">
                <Label>{f.label}</Label>
                <Input
                  value={(val ?? "") as string | number}
                  onChange={(e) => {
                    const next = { ...value };
                    next[key] = e.target.value;
                    if (mode === "create") {
                      for (const alias of legacyKeyAliases[key] ?? []) delete next[alias];
                    }
                    onChange(next);
                  }}
                />
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}
