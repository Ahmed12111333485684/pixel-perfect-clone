import { useCallback, useEffect, useRef, useState } from "react";

/** How many suggestions are shown before the rest move into the shuffle reserve. */
const DEFAULT_VISIBLE_COUNT = 5;

/** How long the "just switched" feedback stays on a card. */
export const SWITCH_FEEDBACK_MS = 1400;

/**
 * Splits a suggestion list into the visible top-N and a reserve, and swaps a
 * visible card with a random reserve entry.
 *
 * `suggestions` may be undefined while the query is loading. Passing the raw
 * query data (instead of `data ?? []`) keeps the reference stable, so the
 * reset effect below does not fire on every render.
 *
 * `switchedIndex` is the position that was just swapped, so the caller can
 * highlight that card as feedback. It resets to null on its own after
 * SWITCH_FEEDBACK_MS.
 */
export function useSuggestionShuffle<T>(
  suggestions: T[] | undefined,
  visibleCount = DEFAULT_VISIBLE_COUNT,
) {
  const [visible, setVisible] = useState<T[]>(() => (suggestions ?? []).slice(0, visibleCount));
  const [reserve, setReserve] = useState<T[]>(() => (suggestions ?? []).slice(visibleCount));
  const [switchedIndex, setSwitchedIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset whenever the source list changes (new query result, different record).
  useEffect(() => {
    const list = suggestions ?? [];
    setVisible(list.slice(0, visibleCount));
    setReserve(list.slice(visibleCount));
  }, [suggestions, visibleCount]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const shuffle = useCallback(
    (index: number) => {
      if (reserve.length === 0) return;

      const pickIndex = Math.floor(Math.random() * reserve.length);
      const replacement = reserve[pickIndex];
      const removed = visible[index];
      if (!replacement || !removed) return;

      const nextVisible = [...visible];
      nextVisible[index] = replacement;
      setVisible(nextVisible);
      setReserve([...reserve.filter((_, i) => i !== pickIndex), removed]);

      setSwitchedIndex(index);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSwitchedIndex(null), SWITCH_FEEDBACK_MS);
    },
    [reserve, visible],
  );

  return {
    visible,
    reserve,
    shuffle,
    switchedIndex,
    canShuffle: reserve.length > 0,
  };
}
