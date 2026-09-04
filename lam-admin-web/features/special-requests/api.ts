import { fetchJson } from "@/lib/api/fetch-json";

import type { SpecialRequest } from "./model";

const SPECIAL_REQUESTS_PATH = "/api/admin/special-requests";

export function fetchSpecialRequests(): Promise<SpecialRequest[]> {
  return fetchJson<SpecialRequest[]>(SPECIAL_REQUESTS_PATH, { method: "GET" });
}

/**
 * `lam-api`'s `DELETE /api/v1/admin/special-requests/{id}` (proxied here as
 * `/api/admin/special-requests/{id}`) returns the full, refreshed list in
 * the same response — so callers can write that straight into the
 * `specialRequestKeys.all` cache entry instead of a second round trip.
 */
export function deleteSpecialRequest(id: string): Promise<SpecialRequest[]> {
  return fetchJson<SpecialRequest[]>(`${SPECIAL_REQUESTS_PATH}/${id}`, {
    method: "DELETE",
  });
}
