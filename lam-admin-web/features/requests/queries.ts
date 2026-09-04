import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchCustomerRequests, updateCustomerRequestStatus } from "./api";
import type { CustomerRequestStatus } from "./model";

/**
 * Single cache key for the general/song request list (`customer_requests`).
 * Kept separate from `bootstrapKeys` and `specialRequestKeys` — a status
 * change here must only ever touch `requestsKeys.all`.
 */
export const requestsKeys = {
  all: ["requests"] as const,
};

export function useCustomerRequestsQuery() {
  return useQuery({
    queryKey: requestsKeys.all,
    queryFn: fetchCustomerRequests,
  });
}

export function useUpdateCustomerRequestStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CustomerRequestStatus }) =>
      updateCustomerRequestStatus(id, status),
    onSuccess: (refreshedRequests) => {
      queryClient.setQueryData(requestsKeys.all, refreshedRequests);
    },
  });
}
