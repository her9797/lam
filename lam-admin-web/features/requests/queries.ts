import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchCustomerRequests, fetchCustomerRequestsPage, updateCustomerRequestStatus } from "./api";
import type { CustomerRequestListQuery, CustomerRequestStatus } from "./model";

/**
 * Cache keys for the general/song request list (`customer_requests`). Kept
 * separate from `bootstrapKeys` and `specialRequestKeys` — a status change
 * here must only ever touch keys under `requestsKeys.all`.
 *
 * `all` (no params) backs the dashboard's aggregate counts, which need
 * every request regardless of any list screen's current filter/page.
 * `list(query)` backs the paginated `/requests` and `/song-requests`
 * screens — one cache entry per distinct filter/sort/page combination.
 */
export const requestsKeys = {
  all: ["requests"] as const,
  list: (query: CustomerRequestListQuery) => ["requests", "list", query] as const,
};

export function useCustomerRequestsQuery() {
  return useQuery({
    queryKey: requestsKeys.all,
    queryFn: fetchCustomerRequests,
  });
}

export function useCustomerRequestsPageQuery(query: CustomerRequestListQuery) {
  return useQuery({
    queryKey: requestsKeys.list(query),
    queryFn: () => fetchCustomerRequestsPage(query),
  });
}

export function useUpdateCustomerRequestStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CustomerRequestStatus }) =>
      updateCustomerRequestStatus(id, status),
    // The endpoint still returns the full, unfiltered/unpaginated list (see
    // `updateCustomerRequestStatus`'s doc comment) — that shape no longer
    // matches every cache entry once list screens can be filtered, sorted,
    // and paginated, so every `requestsKeys.all`-prefixed entry (the plain
    // dashboard query and every `requestsKeys.list(query)` page) is
    // invalidated and refetched under its own current condition instead of
    // being overwritten with the response body.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestsKeys.all });
    },
  });
}
