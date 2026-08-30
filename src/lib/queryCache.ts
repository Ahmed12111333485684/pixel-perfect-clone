import type { QueryClient } from "@tanstack/react-query";

type Identifiable = { id: number };

function listCachedArrays<T extends Identifiable>(qc: QueryClient, prefix: string): Array<[unknown[], T[]]> {
  const matches = qc.getQueryCache().findAll({ queryKey: [prefix], exact: false });
  return matches
    .filter((q) => Array.isArray(q.state.data))
    .map((q) => [q.queryKey, q.state.data as T[]] as [unknown[], T[]]);
}

export function syncUpdated<T extends Identifiable>(qc: QueryClient, prefix: string, updated: T) {
  for (const [key, data] of listCachedArrays<T>(qc, prefix)) {
    qc.setQueryData(key, data.map((item) => (item.id === updated.id ? updated : item)));
  }
  qc.invalidateQueries({ queryKey: [prefix] });
}

export function syncCreated<T extends Identifiable>(qc: QueryClient, prefix: string, created: T, prepend = true) {
  for (const [key, data] of listCachedArrays<T>(qc, prefix)) {
    if (!data.some((item) => item.id === created.id)) {
      qc.setQueryData(key, prepend ? [created, ...data] : [...data, created]);
    }
  }
  qc.invalidateQueries({ queryKey: [prefix] });
}

export function syncRemoved(qc: QueryClient, prefix: string, id: number) {
  for (const [queryKey, data] of listCachedArrays<Identifiable>(qc, prefix)) {
    qc.setQueryData(queryKey, data.filter((item) => item.id !== id));
  }
  qc.invalidateQueries({ queryKey: [prefix] });
}
