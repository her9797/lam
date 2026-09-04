import { fetchJson } from "@/lib/api/fetch-json";

import type { CustomerRequest, CustomerRequestStatus } from "./model";

const CUSTOMER_REQUESTS_PATH = "/api/admin/customer-requests";

export function fetchCustomerRequests(): Promise<CustomerRequest[]> {
  return fetchJson<CustomerRequest[]>(CUSTOMER_REQUESTS_PATH, { method: "GET" });
}

/**
 * `lam-api`'s `PATCH /api/v1/admin/customer-requests/{id}/status` (proxied
 * here as `/api/admin/customer-requests/{id}/status`) returns the full,
 * refreshed request list in the same response — so callers can write that
 * straight into the `requestsKeys.all` cache entry instead of triggering a
 * second round trip.
 */
export function updateCustomerRequestStatus(
  id: string,
  status: CustomerRequestStatus,
): Promise<CustomerRequest[]> {
  return fetchJson<CustomerRequest[]>(`${CUSTOMER_REQUESTS_PATH}/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}
