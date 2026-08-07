import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CITIES, getDistricts } from "@/lib/locations";
import { FacetSelect, type FacetOption } from "@/components/search/FacetSelect";

export interface FilterFacet {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<FacetOption>;
  allowAll?: boolean;
  disabled?: boolean;
}

interface FilterBarProps {
  /** Always-visible search control(s) rendered next to the Filters button. */
  search?: ReactNode;
  /** Facet selects shown inside the Filters popover. */
  facets?: ReadonlyArray<FilterFacet>;
  /** Selected city value ("" or "all" = no filter). */
  city?: string;
  /** Selected district value ("" or "all" = no filter). */
  district?: string;
  onCityChange?: (city: string) => void;
  onDistrictChange?: (district: string) => void;
  /** Clears every filter on the screen. */
  onReset: () => void;
  /** Number of active filters (drives the button badge). */
  activeCount: number;
  /** Hide the city/district cascade (used by screens without those columns). */
  showLocation?: boolean;
}

export function FilterBar({
  search,
  facets = [],
  city = "",
  district = "",
  onCityChange,
  onDistrictChange,
  onReset,
  activeCount,
  showLocation = true,
}: FilterBarProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const districts = useMemo(() => (city ? getDistricts(city) : []), [city]);
  const cityValue = city || "all";
  const districtValue = district || "all";

  const runReset = () => {
    onReset();
    setOpen(false);
  };

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
      {search && (
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">{search}</div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 gap-1.5">
            <SlidersHorizontal className="h-4 w-4" />
            {t("common.filters")}
            {activeCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(92vw,44rem)]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {facets.map((facet) => (
              <FacetSelect
                key={facet.label}
                label={facet.label}
                value={facet.value}
                onValueChange={facet.onValueChange}
                options={facet.options}
                allowAll={facet.allowAll}
                disabled={facet.disabled}
              />
            ))}

            {showLocation && (
              <>
                <FacetSelect
                  label={t("common.city")}
                  value={cityValue}
                  onValueChange={(value) => {
                    onCityChange?.(value);
                    onDistrictChange?.("");
                  }}
                  options={CITIES.map((c) => ({ value: c, label: c }))}
                />
                <FacetSelect
                  label={t("common.district")}
                  value={districtValue}
                  onValueChange={onDistrictChange}
                  disabled={!city}
                  options={districts.map((d) => ({ value: d, label: d }))}
                />
              </>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">
              {activeCount > 0
                ? t("common.filterActive", { count: activeCount })
                : ""}
            </span>
            <Button size="sm" variant="outline" onClick={runReset}>
              <X className="me-1 h-3 w-3" />
              {t("common.reset")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
