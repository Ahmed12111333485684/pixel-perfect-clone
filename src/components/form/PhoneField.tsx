import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// A small list of common country codes (expand this as needed)
const COUNTRY_CODES = [
    { code: "+966", flag: "🇸🇦", country: "SA" },
    { code: "+965", flag: "🇰🇼", country: "KW" },
    { code: "+971", flag: "🇦🇪", country: "AE" },
    { code: "+974", flag: "🇶🇦", country: "QA" },
    { code: "+973", flag: "🇧🇭", country: "BH" },
    { code: "+968", flag: "🇴🇲", country: "OM" },
    { code: "+20", flag: "🇪🇬", country: "EG" },
    { code: "+1", flag: "🇺🇸", country: "US" },
];

interface PhoneFieldProps {
    id: string; // e.g., "mobile"
    label: string;
    defaultValue?: string | null;
    readOnly: boolean;
}

export function PhoneField({ id, label, defaultValue, readOnly }: PhoneFieldProps) {
    // Parse existing value if it contains a country code (e.g., "+966 512345678")
    const parseDefault = () => {
        if (!defaultValue) return { countryCode: "+966", number: "" };

        const matched = COUNTRY_CODES.find(c => defaultValue.startsWith(c.code));
        if (matched) {
            return {
                countryCode: matched.code,
                number: defaultValue.replace(matched.code, "").trim()
            };
        }
        return { countryCode: "+966", number: defaultValue.trim() };
    };

    const initial = parseDefault();
    const [countryCode, setCountryCode] = useState(initial.countryCode);

    return (
        <div className="space-y-2">
            <Label htmlFor={id} className="text-xs font-medium">
                {label}
            </Label>

            {/* Hidden input combines both parts so native FormData picks it up perfectly */}
            <input
                type="hidden"
                name={id}
                value={`${countryCode} ${initial.number}`}
            />

            <div className="flex mt-1 rounded-md shadow-sm border border-border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                {/* Country Code Dropdown */}
                <Select
                    value={countryCode}
                    onValueChange={setCountryCode}
                    disabled={readOnly}
                >
                    <SelectTrigger className="w-[100px] border-0 bg-transparent focus:ring-0 focus:ring-offset-0 rounded-e-none border-e border-border">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {COUNTRY_CODES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                                <span className="me-2">{c.flag}</span>
                                <span className="font-mono text-xs">{c.code}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Free text field for the remaining phone number digits */}
                <Input
                    id={`${id}-local`}
                    defaultValue={initial.number}
                    disabled={readOnly}
                    readOnly={readOnly}
                    type="tel"
                    maxLength={15}
                    placeholder="500000000"
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-s-none flex-1"
                    onChange={(e) => {
                        // Dynamically update the hidden field's value whenever the user types
                        const hiddenInput = e.target.form?.elements.namedItem(id) as HTMLInputElement;
                        if (hiddenInput) {
                            hiddenInput.value = `${countryCode} ${e.target.value.trim()}`;
                        }
                    }}
                />
            </div>
        </div>
    );
}