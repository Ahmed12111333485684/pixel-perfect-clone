export interface CountryCode {
  code: string;
  flag: string;
  country: string;
}

/** Callable dialing codes offered in phone entry forms. */
export const COUNTRY_CODES: CountryCode[] = [
  { code: "+966", flag: "🇸🇦", country: "SA" },
  { code: "+965", flag: "🇰🇼", country: "KW" },
  { code: "+971", flag: "🇦🇪", country: "AE" },
  { code: "+974", flag: "🇶🇦", country: "QA" },
  { code: "+973", flag: "🇧🇭", country: "BH" },
  { code: "+968", flag: "🇴🇲", country: "OM" },
  { code: "+20", flag: "🇪🇬", country: "EG" },
  { code: "+1", flag: "🇺🇸", country: "US" },
];

/** Country-code digits without the "+", longest first for prefix matching. */
export const COUNTRY_CODE_DIGITS = COUNTRY_CODES.map((c) => c.code.slice(1)).sort(
  (a, b) => b.length - a.length,
);
