import { QueryClient } from "@tanstack/react-query";

/**
 * Shared react-query client for the CRM.
 *
 * The audit flagged that every navigation re-queried MySQL because the app had
 * no client cache and defaulted fetches to `cache:'no-store'`. react-query caches
 * resolved data in-memory, so re-visiting a page within `staleTime` serves
 * instantly with zero network — independent of the underlying fetch cache mode.
 *
 * Defaults chosen for an operations console (data changes, but not sub-second):
 *  · staleTime 30s   — re-navigating within 30s does NOT refetch.
 *  · gcTime 5m       — keep unused data around briefly for back/forward.
 *  · refetchOnWindowFocus false — no refetch storm when tabbing back in.
 *  · retry 1         — one quiet retry; the fetch layer already retries GETs.
 * Real-time views (live map, alarms) can opt into their own short staleTime or
 * refetchInterval per-query.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Transparent read-through cache for service-layer list methods. Wrapping a
 * service's list() in this makes EVERY page that calls it share one cached
 * result within `staleTime` — no page changes needed. Mutations must call
 * `invalidateEntity` so the next read refetches.
 *
 *   async list(f, p) { return cachedFetch(["clients", tid(), f, p], () => rawList(f, p)); }
 *   async create(x)  { const r = await rawCreate(x); invalidateEntity("clients"); return r; }
 */
export function cachedFetch<T>(queryKey: unknown[], queryFn: () => Promise<T>, staleTime = 20_000): Promise<T> {
  // retry:false so a wrapped read behaves exactly like the raw call on error
  // (the axios/fetch layer already handles transient retries + 401/402 redirects).
  return queryClient.fetchQuery({ queryKey, queryFn, staleTime, retry: false });
}

/** Invalidate every cached list for an entity (call after a create/update/delete). */
export function invalidateEntity(entity: string): void {
  queryClient.invalidateQueries({ queryKey: [entity] });
}
