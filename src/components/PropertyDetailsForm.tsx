import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { localizePropertyType } from "@/lib/property-types";

export default function PropertyDetailsForm({ type, value, onChange }: { type: string; value: Record<string, any>; onChange: (v: Record<string, any>) => void }) {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ["property-templates", type], queryFn: () => api(`/api/propertytemplates?type=${encodeURIComponent(type)}`) });

  const BUILTIN_TEMPLATES: any[] = [
    { type: "Apartment", fields: [{ key: "rooms", label: "Rooms", dataType: "number", required: true }, { key: "area", label: "Area (sqm)", dataType: "number", required: true }, { key: "floor", label: "Floor", dataType: "number" }, { key: "furnished", label: "Furnished", dataType: "boolean" }] },
    { type: "Villa", fields: [{ key: "bedrooms", label: "Bedrooms", dataType: "number", required: true }, { key: "area", label: "Lot area (sqm)", dataType: "number", required: true }, { key: "has_garage", label: "Garage", dataType: "boolean" }] },
    { type: "Office", fields: [{ key: "floor", label: "Floor", dataType: "number" }, { key: "area", label: "Area (sqm)", dataType: "number", required: true }, { key: "meeting_rooms", label: "Meeting rooms", dataType: "number" }, { key: "parking_spots", label: "Parking spots", dataType: "number" }, { key: "open_plan", label: "Open plan", dataType: "boolean" }] },
    { type: "Land", fields: [{ key: "area", label: "Lot area (sqm)", dataType: "number", required: true }, { key: "zoning", label: "Zoning", dataType: "string" }, { key: "buildable", label: "Buildable", dataType: "boolean" }, { key: "frontage_m", label: "Frontage (m)", dataType: "number" }] },
    { type: "Shop", fields: [{ key: "area", label: "Area (sqm)", dataType: "number", required: true }, { key: "street_facing", label: "Street facing", dataType: "boolean" }, { key: "storefront_width_m", label: "Storefront width (m)", dataType: "number" }, { key: "has_storage", label: "Has storage", dataType: "boolean" }] },
    { type: "Warehouse", fields: [{ key: "area", label: "Area (sqm)", dataType: "number", required: true }, { key: "ceiling_height_m", label: "Ceiling height (m)", dataType: "number" }, { key: "loading_docks", label: "Loading docks", dataType: "number" }, { key: "climate_control", label: "Climate control", dataType: "boolean" }, { key: "yard_area", label: "Yard area (sqm)", dataType: "number" }] }
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

  const templates = (q.data && Array.isArray(q.data) && q.data.length > 0) ? q.data : BUILTIN_TEMPLATES;
  const template = templates.find((t: any) => t.type && t.type.toLowerCase() === type.toLowerCase()) ?? templates[0] ?? null;

  if (!template) return null;

  return (
    <div className="space-y-2">
      <Label>{`${t("common.type")}: ${localizePropertyType(t, template.type)}`}</Label>
      <div className="grid gap-3 sm:grid-cols-2">
        {template.fields.map((f: any) => {
          const key = f.key;
          const val = readValue(key);
          if (f.dataType === "number") {
            return (
              <div key={key} className="space-y-2">
                <Label>{f.label}</Label>
                <Input
                  type="number"
                  value={val ?? ""}
                  onChange={(e) => {
                    const next = { ...value };
                    const nextValue = e.target.value === "" ? null : Number(e.target.value);
                    next[key] = nextValue;
                    for (const alias of legacyKeyAliases[key] ?? []) delete next[alias];
                    onChange(next);
                  }}
                />
              </div>
            );
          }
          if (f.dataType === "boolean") {
            return (
              <div key={key} className="flex items-center gap-2">
                <Checkbox checked={!!val} onCheckedChange={(c) => onChange({ ...value, [key]: c === true })} />
                <span>{f.label}</span>
              </div>
            );
          }
          return (
            <div key={key} className="space-y-2">
              <Label>{f.label}</Label>
              <Input
                value={val ?? ""}
                onChange={(e) => {
                  const next = { ...value };
                  next[key] = e.target.value;
                  for (const alias of legacyKeyAliases[key] ?? []) delete next[alias];
                  onChange(next);
                }}
              />
            </div>
          );
        })}
      </div>
      {/* Render any extra custom fields not part of the template */}
      {Object.keys(value ?? {}).filter((k) => !(template.fields || []).some((f: any) => f.key === k)).length > 0 && (
        <div className="space-y-2">
          <Label>{t("common.additionalFields")}</Label>
          <div className="space-y-2 rounded-md border border-border p-3">
            {Object.entries(value).filter(([k]) => !(template.fields || []).some((f: any) => f.key === k)).map(([key, val]) => (
              <div key={key} className="flex gap-2">
                <Input
                  placeholder={t("common.name")}
                  value={key}
                  onChange={(e) => {
                    const newKey = e.target.value;
                    if (!newKey) return;
                    const next = { ...value };
                    delete next[key];
                    next[newKey] = val;
                    onChange(next);
                  }}
                  className="flex-1"
                />
                <Input
                  placeholder={t("common.value")}
                  value={String(val ?? "")}
                  onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...value };
                    delete next[key];
                    onChange(next);
                  }}
                  className="text-xs text-destructive hover:underline px-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
