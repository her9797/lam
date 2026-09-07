import { useQuery } from "@tanstack/react-query";

import { fetchSalesStats } from "./api";

/** Cache key for the sales-stats screen, keyed by the resolved instant range. */
export const salesStatsKeys = {
  range: (from: Date, to: Date) => ["orders", "stats", from.toISOString(), to.toISOString()] as const,
};

export function useSalesStatsQuery(from: Date, to: Date) {
  return useQuery({
    queryKey: salesStatsKeys.range(from, to),
    queryFn: () => fetchSalesStats(from, to),
  });
}
