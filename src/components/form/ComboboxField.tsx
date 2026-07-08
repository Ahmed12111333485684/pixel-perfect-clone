import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    defaultValue?: string;
    readOnly?: boolean;
    disabled?: boolean;
    onValueChange?: (value: string) => void;
};

export function ComboboxField({
    id,
    label,
    options,
    defaultValue = "",
    readOnly = false,
    disabled = false,
    onValueChange,
}: Props) {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState(defaultValue);

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>

            {/* Hidden input so FormData works */}
            <input type="hidden" name={id} value={value} />

            <Popover open={open && !disabled} onOpenChange={setOpen}>
                <PopoverTrigger asChild disabled={readOnly || disabled}>
                    <Button
                        variant="outline"
                        role="combobox"
                        className={cn("w-full justify-between", disabled && "opacity-50 cursor-not-allowed")}
                    >
                        {value
                            ? options.find((o) => o.value === value)?.label
                            : "اختر..."}

                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
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
                                    onSelect={() => {
                                        setValue(option.value);
                                        setOpen(false);
                                        onValueChange?.(option.value);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.value
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