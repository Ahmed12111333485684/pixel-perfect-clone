import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FacetOption {
  value: string;
  label: string;
}

interface FacetSelectProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<FacetOption>;
  /** Inject an "All" option that maps to "" (the unset filter state). */
  allowAll?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Labeled single-select for filter facets. The "all"/"" value is treated as
 * "no filter" so screens can bind it straight to URL search state.
 */
export function FacetSelect({
  label,
  value,
  onValueChange,
  options,
  allowAll = true,
  disabled,
  className,
}: FacetSelectProps) {
  const { t } = useTranslation();
  const current = value || "all";

  return (
    <div className={className}>
      <Label className="text-xs font-medium">{label}</Label>
      <Select
        value={current}
        onValueChange={(next) => onValueChange(next === "all" ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger className="mt-1 w-full">
          <SelectValue placeholder={t("common.all")} />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value="all">{t("common.all")}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
