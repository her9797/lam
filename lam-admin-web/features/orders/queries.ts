import { useQuery } from "@tanstack/react-query";

import { fetchOrdersPage } from "./api";
import type { OrderListQuery } from "./model";

/**
 * Cache key for the order-history list (`payment_orders`). Kept separate
 * from every other feature's keys — this screen never mutates orders, so
 * there is no invalidation strategy to coordinate, only per-query caching.
 */
export const orderKeys = {
  list: (query: OrderListQuery) => ["orders", "list", query] as const,
};

export function useOrdersPageQuery(query: OrderListQuery) {
  return useQuery({
    queryKey: orderKeys.list(query),
    queryFn: () => fetchOrdersPage(query),
  });
}
