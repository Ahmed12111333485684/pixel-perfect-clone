import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRY_CODES, type CountryCode } from "@/lib/countryCodes";
import { cn } from "@/lib/utils";

function normalizeSearch(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "");
}

function searchTextFor(country: CountryCode): string {
  return normalizeSearch(`${country.code} ${country.country} ${country.name} ${country.nameAr}`);
}

interface PhoneFieldProps {
  id: string; // e.g., "mobile"
  label: string;
  defaultValue?: string | null;
  readOnly: boolean;
  required?: boolean;
}

export function PhoneField({ id, label, defaultValue, readOnly, required }: PhoneFieldProps) {
  // Parse existing value if it contains a country code (e.g., "+966 512345678")
  const parseDefault = () => {
    if (!defaultValue) return { countryCode: "+966", number: "" };

    const matched = COUNTRY_CODES.find((c) => defaultValue.startsWith(c.code));
    if (matched) {
      return {
        countryCode: matched.code,
        number: defaultValue.replace(matched.code, "").trim(),
      };
    }
    return { countryCode: "+966", number: defaultValue.trim() };
  };

  const initial = parseDefault();
  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [number, setNumber] = useState(initial.number);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const trimmed = number.trim();
  const combinedValue = trimmed ? `${countryCode} ${trimmed}` : "";
  const selected = COUNTRY_CODES.find((c) => c.code === countryCode);

  const matchingCodes = useMemo(() => {
    const normalizedQuery = normalizeSearch(query).replace(/^\+/, "");
    if (!normalizedQuery) return COUNTRY_CODES;
    return COUNTRY_CODES.filter((c) => searchTextFor(c).includes(normalizedQuery));
  }, [query]);

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-local`} className="text-xs font-medium">
        {label}
      </Label>

      {/* Hidden input combines both parts so native FormData picks it up perfectly */}
      <input type="hidden" name={id} value={combinedValue} />

      <div className="flex mt-1 rounded-md shadow-sm border border-border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {/* Searchable Country Code Dropdown */}
        <Popover open={open && !readOnly} onOpenChange={setOpen}>
          <PopoverTrigger asChild disabled={readOnly}>
            <Button
              type="button"
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              className="h-9 w-[100px] justify-between rounded-e-none border-e border-border px-2 font-normal"
            >
              <span className="me-1">{selected?.flag ?? "🇸🇦"}</span>
              <span className="font-mono text-xs">{selected?.code ?? "+966"}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-(--radix-popover-trigger-width) min-w-[240px] p-0"
            onWheel={(e) => e.stopPropagation()}
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="ابحث عن دولة / رمز..."
                value={query}
                onValueChange={setQuery}
              />
              <CommandEmpty>لا توجد نتائج</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {matchingCodes.map((c) => (
                  <CommandItem
                    key={c.code}
                    value={searchTextFor(c)}
                    onSelect={() => {
                      setCountryCode(c.code);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "me-2 h-4 w-4",
                        countryCode === c.code ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="me-2">{c.flag}</span>
                    <span className="font-mono text-xs">{c.code}</span>
                    <span className="ms-auto text-xs text-muted-foreground">{c.nameAr}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Free text field for the remaining phone number digits */}
        <Input
          id={`${id}-local`}
          value={number}
          disabled={readOnly}
          readOnly={readOnly}
          type="tel"
          maxLength={15}
          required={required}
          placeholder="500000000"
          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-s-none flex-1"
          onChange={(e) => setNumber(e.target.value)}
        />
      </div>
    </div>
  );
}
