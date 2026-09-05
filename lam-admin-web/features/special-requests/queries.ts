import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteSpecialRequest, fetchSpecialRequests, fetchSpecialRequestsPage } from "./api";
import type { SpecialRequestListQuery } from "./model";

/**
 * Cache keys for the special request list (`special_requests`). Kept
 * separate from `bootstrapKeys` and `requestsKeys` — a mutation here must
 * only ever touch keys under `specialRequestKeys.all`.
 */
export const specialRequestKeys = {
  all: ["special-requests"] as const,
  list: (query: SpecialRequestListQuery) => ["special-requests", "list", query] as const,
};

export function useSpecialRequestsQuery() {
  return useQuery({
    queryKey: specialRequestKeys.all,
    queryFn: fetchSpecialRequests,
  });
}

export function useSpecialRequestsPageQuery(query: SpecialRequestListQuery) {
  return useQuery({
    queryKey: specialRequestKeys.list(query),
    queryFn: () => fetchSpecialRequestsPage(query),
  });
}

export function useDeleteSpecialRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSpecialRequest(id),
    // See `features/requests/queries.ts`'s equivalent mutation for why this
    // invalidates rather than writes the response body into the cache: the
    // endpoint still returns the full, unpaginated list, which no longer
    // matches a filtered/sorted/paginated `specialRequestKeys.list(query)`
    // entry.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: specialRequestKeys.all });
    },
  });
}
