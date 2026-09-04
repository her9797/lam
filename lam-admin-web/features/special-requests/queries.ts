import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteSpecialRequest, fetchSpecialRequests } from "./api";

/**
 * Single cache key for the special request list (`special_requests`). Kept
 * separate from `bootstrapKeys` and `requestsKeys` — deleting a special
 * request must only ever touch `specialRequestKeys.all`.
 */
export const specialRequestKeys = {
  all: ["special-requests"] as const,
};

export function useSpecialRequestsQuery() {
  return useQuery({
    queryKey: specialRequestKeys.all,
    queryFn: fetchSpecialRequests,
  });
}

export function useDeleteSpecialRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSpecialRequest(id),
    onSuccess: (refreshedRequests) => {
      queryClient.setQueryData(specialRequestKeys.all, refreshedRequests);
    },
  });
}
