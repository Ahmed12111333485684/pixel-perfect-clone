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
};

export function ComboboxField({
    id,
    label,
    options,
    defaultValue = "",
    readOnly = false,
}: Props) {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState(defaultValue);

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>

            {/* Hidden input so FormData works */}
            <input type="hidden" name={id} value={value} />

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild disabled={readOnly}>
                    <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
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
                                    value={option.label}
                                    onSelect={() => {
                                        setValue(option.value);
                                        setOpen(false);
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