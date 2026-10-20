import { COUNTRY_CODE_DIGITS } from "./countryCodes";

/**
 * Canonicalizes a phone number: digits only, then normalizes international /
 * local Saudi formats so "+966 50 123 4567", "00966501234567", "050 123 4567"
 * and "501234567" all resolve to "0501234567". Landlines canonicalize the same
 * way, so "0112345678", "+966112345678" and "00966112345678" all resolve to
 * "0112345678".
 *
 * Numbers that declare a non-Saudi country code (via "+" or "00") are kept
 * verbatim with their country code — they are never shaped as Saudi — and their
 * national trunk "0" is dropped, so "+971 0501234567" matches "+971501234567".
 * Unprefixed numbers are assumed Saudi, but only 9-10 digit cores are shaped;
 * anything else passes through untouched.
 */
export function normalizePhone(value: string | null | undefined): string {
  const raw = (value ?? "").replace(/\s+/g, "");
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return "";

  const declaredInternational = raw.startsWith("+") || digits.startsWith("00");
  const saudi = digits.startsWith("00966") || digits.startsWith("966");

  let core = digits;
  if (core.startsWith("00966")) core = core.slice(5);
  else if (core.startsWith("966")) core = core.slice(3);
  else if (core.startsWith("00")) core = core.slice(2);

  if (declaredInternational && !saudi) {
    const code = COUNTRY_CODE_DIGITS.find((c) => core.startsWith(c));
    if (code) {
      const national = core.slice(code.length);
      if (national.startsWith("0")) return `${core.slice(0, code.length)}${national.slice(1)}`;
    }
    return core;
  }

  if (core.length !== 9 && core.length !== 10) return core;

  if (core.startsWith("5") && core.length === 9) return `0${core}`;
  core = core.replace(/^0+/, "");
  if (core.length === 9) return `0${core}`;
  return core;
}

/** Canonical phone tokens shorter than this are treated as junk, not identifiers. */
export const MIN_PHONE_DIGITS = 7;

/**
 * True when any of the given phone values matches the query, regardless of the
 * format each side happens to use ("+966 551620530" vs "0551620530" vs
 * "551620530"). Both sides are canonicalized first, so a query in one format
 * still finds a record stored in another.
 *
 * Only used for phone-ish tokens - a query that is not a phone number never
 * matches here, and the caller is expected to fall back to a normal text search.
 */
export function matchesPhoneQuery(
  values: ReadonlyArray<string | null | undefined>,
  query: string | null | undefined,
): boolean {
  const target = normalizePhone(query);
  if (!target || target.length < MIN_PHONE_DIGITS) return false;
  return values.some((value) => {
    const phone = normalizePhone(value);
    if (!phone || phone.length < MIN_PHONE_DIGITS) return false;
    return phone === target || phone.includes(target) || target.includes(phone);
  });
}
