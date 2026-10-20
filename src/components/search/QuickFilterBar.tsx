import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface QuickFilterGroup {
  /** Identifies the facet this group drives. */
  key: string;
  /** The facet's current value ("all" or "" means unfiltered). */
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  /** Applies a value to the facet. */
  onSelect: (value: string) => void;
}

interface QuickFilterBarProps {
  /**
   * The facets these shortcuts drive. Each one is a shortcut for a facet that
   * already exists in the Filters menu - the bar holds no state of its own and
   * simply writes the same values the menu would.
   */
  groups: ReadonlyArray<QuickFilterGroup>;
  className?: string;
}

/**
 * A row of buttons that quickly applies the filters from the Filters menu.
 *
 * Clicking an active shortcut clears it, so a single "All" button is not
 * needed per group; the leading "All" clears every group at once.
 */
export function QuickFilterBar({ groups, className }: QuickFilterBarProps) {
  const { t } = useTranslation();

  const isUnfiltered = (value: string) => !value || value === "all";
  const clearActive = groups.every((group) => isUnfiltered(group.value));

  const clearAll = () => {
    groups.forEach((group) => {
      if (!isUnfiltered(group.value)) group.onSelect("all");
    });
  };

  return (
    <div className={cn("mb-3 flex flex-wrap items-center gap-2", className)}>
      <Button
        type="button"
        size="sm"
        variant={clearActive ? "default" : "outline"}
        onClick={clearAll}
      >
        {t("common.all")}
      </Button>

      {groups.map((group, groupIndex) => (
        <Fragment key={group.key}>
          {groupIndex > 0 && <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />}
          {group.options.map((option) => {
            const active = group.value === option.value;
            return (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => group.onSelect(active ? "all" : option.value)}
              >
                {option.label}
              </Button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
