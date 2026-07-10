import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function normalizeSearch(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "");
}

type Option = {
    value: string;
    label: string;
};

type Props = {
    id: string;
    label: string;
    options: Option[];
    defaultValue?: string | string[] | null;
    readOnly?: boolean;
    disabled?: boolean;
    onValueChange?: (value: string[]) => void;
};

function parseDefault(value: string | string[] | null | undefined): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
    } catch {}
    return value ? [value] : [];
}

export function MultiComboboxField({
    id,
    label,
    options,
    defaultValue,
    readOnly = false,
    disabled = false,
    onValueChange,
}: Props) {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState<string[]>(() => parseDefault(defaultValue));

    const toggle = (optionValue: string) => {
        setValue((prev) => {
            const next = prev.includes(optionValue)
                ? prev.filter((v) => v !== optionValue)
                : [...prev, optionValue];
            onValueChange?.(next);
            return next;
        });
    };

    const remove = (optionValue: string) => {
        setValue((prev) => {
            const next = prev.filter((v) => v !== optionValue);
            onValueChange?.(next);
            return next;
        });
    };

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>

            <input type="hidden" name={id} value={JSON.stringify(value)} />

            <Popover open={open && !disabled} onOpenChange={setOpen}>
                <PopoverTrigger asChild disabled={readOnly || disabled}>
                    <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                            "h-auto min-h-10 w-full justify-between",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <div className="flex flex-wrap gap-1">
                            {value.length > 0 ? (
                                value.map((v) => {
                                    const option = options.find((o) => o.value === v);
                                    return (
                                        <Badge
                                            key={v}
                                            variant="secondary"
                                            className="gap-1 whitespace-nowrap"
                                        >
                                            {option?.label ?? v}
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        remove(v);
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            )}
                                        </Badge>
                                    );
                                })
                            ) : (
                                <span className="text-muted-foreground">اختر...</span>
                            )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" onWheel={(e) => e.stopPropagation()}>
                    <Command>
                        <CommandInput placeholder="ابحث..." />

                        <CommandEmpty>لا توجد نتائج</CommandEmpty>

                        <CommandGroup className="max-h-64 overflow-auto">
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={normalizeSearch(option.label)}
                                    onSelect={() => toggle(option.value)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value.includes(option.value)
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
