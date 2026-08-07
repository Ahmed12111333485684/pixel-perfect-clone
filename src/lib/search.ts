import { useCallback, useMemo } from "react";

/**
 * Client-side search helpers. Frontend-only, no backend or schema involved —
 * safe to revert by removing the imports and going back to the old inline logic.
 */

/**
 * Lowercases and strips ALL whitespace so "ابها   الجديدة" matches "ابهاالجديدة"
 * and "0505 123 4567" matches "05051234567". Arabic alef/hamza variants are
 * normalized to a single form for forgiving matching. Dashes are preserved so
 * offer codes like "RW-12" stay distinct from "RW12".
 */
export function normalizeForSearch(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * True when the query matches any of the given values.
 * Whole-phrase substring first (space-insensitive), then a token fallback so a
 * query like "rent villa" still matches "villa for rent" (a case that fails with
 * a plain substring check).
 */
export function matchesQuery(
  values: ReadonlyArray<string | null | undefined | readonly string[]>,
  query: string,
): boolean {
  const normQuery = normalizeForSearch(query);
  if (!normQuery) return true;

  const normJoined = normalizeForSearch(
    values.map((v) => (Array.isArray(v) ? v.join(" ") : (v ?? ""))).join(" "),
  );

  if (normJoined.includes(normQuery)) return true;

  const tokens = query
    .split(/\s+/)
    .map((token) => normalizeForSearch(token))
    .filter((token) => token.length >= 2);

  if (tokens.length === 0) return false;
  return tokens.every((token) => normJoined.includes(token));
}

/**
 * Parses a possibly-formatted amount string ("1,500,000", "5000", "5000 ر.س")
 * into a number, or null when unparseable. Prevents formatted prices from being
 * silently dropped by budget filters.
 */
export function parseAmount(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[^\d.,]/g, "").replace(/,/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

type SearchUpdater = (prev: Record<string, unknown>) => Record<string, unknown>;

/**
 * Binds component filter state to the URL search params of a file route.
 * `state` is derived from the current route search merged over `defaults`;
 * `update(patch)` navigates (replace, to avoid history spam) with the patch.
 */
export function useUrlSearchState<S>(
  route: {
    useSearch: () => S;
    useNavigate: () => (opts: { search: SearchUpdater; replace?: boolean }) => void;
  },
  defaults: S,
): readonly [S, (patch: Partial<S> | ((prev: S) => Partial<S>)) => void] {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const state = useMemo<S>(() => ({ ...defaults, ...search }), [JSON.stringify(search)]);
  const update = useCallback(
    (patch: Partial<S> | ((prev: S) => Partial<S>)) => {
      navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          ...(typeof patch === "function" ? patch(prev as S) : patch),
        }),
        replace: true,
      });
    },
    [navigate],
  );
  return [state, update];
}
