import { fetchJson } from "@/lib/api/fetch-json";

import { getDatePresetRange } from "./business-day";
import type { OrderListQuery, OrderPageResult } from "./model";

const PAYMENT_ORDERS_PATH = "/api/admin/payment-orders";

/**
 * Fetches a server-filtered/sorted/paginated page of orders. Mirrors
 * `features/requests/api.ts`'s `fetchCustomerRequestsPage` doc comment,
 * except this endpoint has no legacy unpaginated-array response to
 * preserve — it's new, so it always returns the envelope.
 *
 * `datePreset` is resolved to absolute `from`/`to` bounds here, at fetch
 * time (see `business-day.ts`), rather than when the URL was parsed — so a
 * "today" query re-evaluates to the actual current business day on every
 * fetch (a refetch an hour later, or reopening a bookmarked link, means
 * "today" *then*, not whatever it meant when the link was created).
 */
export function fetchOrdersPage(query: OrderListQuery): Promise<OrderPageResult> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    sort: query.sort,
    order: query.order,
  });
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.posSyncStatus) {
    params.set("posSync", query.posSyncStatus);
  }
  if (query.search.trim()) {
    params.set("q", query.search.trim());
  }

  const { from, to } = getDatePresetRange(query.datePreset);
  if (from) {
    params.set("from", from.toISOString());
  }
  if (to) {
    params.set("to", to.toISOString());
  }

  return fetchJson<OrderPageResult>(`${PAYMENT_ORDERS_PATH}?${params.toString()}`, {
    method: "GET",
  });
}
