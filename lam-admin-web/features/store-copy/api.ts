import { useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/fetch-json";
import type { AppData } from "@/features/bootstrap/model";
import { bootstrapKeys } from "@/features/bootstrap/queries";

const STORE_PROFILE_PATH = "/api/admin/store-profile";

/**
 * Field names and the "always send all three" constraint are grounded in
 * `lam-api/internal/httpapi/menu.go`'s `updateStoreCopiesRequest` struct and
 * its handler in `router.go`: `PATCH /api/v1/admin/store-profile` decodes
 * exactly these three fields with no partial-update support — a field left
 * out of the JSON body decodes to `""` and overwrites the existing value on
 * the server. So every caller must submit the current value of all three
 * fields, not just the one the operator changed.
 */
export type StoreCopiesInput = {
  songRequestCopy: string;
  requestCopy: string;
  eventCopy: string;
};

export function updateStoreCopies(input: StoreCopiesInput): Promise<AppData> {
  return fetchJson<AppData>(STORE_PROFILE_PATH, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function useUpdateStoreCopiesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StoreCopiesInput) => updateStoreCopies(input),
    onSuccess: (appData: AppData) => {
      queryClient.setQueryData(bootstrapKeys.all, appData);
    },
  });
}
