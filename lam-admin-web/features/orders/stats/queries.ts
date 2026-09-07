import { useQuery } from "@tanstack/react-query";

import { fetchSalesStats } from "./api";

/** Cache key for the sales-stats screen, keyed by the resolved instant range. */
export const salesStatsKeys = {
  range: (from: Date, to: Date) => ["orders", "stats", from.toISOString(), to.toISOString()] as const,
};

/**
 * `enabled` defaults to true for direct callers, but `SalesStatsPage` passes
 * `false` until it has replaced its SSR/hydration-safe placeholder range
 * (see that component's mount effect) with the real default — without this,
 * the query would fire once with the placeholder and again with the real
 * range, and briefly render the placeholder range's (empty) result.
 */
export function useSalesStatsQuery(from: Date, to: Date, enabled: boolean = true) {
  return useQuery({
    queryKey: salesStatsKeys.range(from, to),
    queryFn: () => fetchSalesStats(from, to),
    enabled,
  });
}
