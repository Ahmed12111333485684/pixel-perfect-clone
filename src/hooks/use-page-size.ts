import { useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const STORAGE_KEY = "ui:pageSize";

function readStoredPageSize(defaultSize: number): number {
  if (typeof window === "undefined") return defaultSize;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return defaultSize;
    const parsed = Number(raw);
    if (PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])) return parsed;
  } catch {
    // ignore storage errors and fall back to default
  }
  return defaultSize;
}

export function usePageSize(defaultSize = 25) {
  const [pageSize, setPageSizeState] = useState<number>(() => readStoredPageSize(defaultSize));

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(size));
    } catch {
      // ignore storage errors; setting still applies for this session
    }
  };

  return [pageSize, setPageSize] as const;
}