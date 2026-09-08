import { PAGE_SIZE_OPTIONS } from "@/components/list/Pagination";

import type { DatePreset } from "./business-day";
import type {
  OrderListQuery,
  PaymentOrderPosSyncStatus,
  PaymentOrderSort,
  PaymentOrderStatus,
  SortOrder,
} from "./model";

/**
 * URL <-> `OrderListQuery` codec for the `/orders` screen. This list carries
 * no personal customer data (see `SpecialRequestPage`'s doc comment for the
 * contrasting case that keeps its search out of the URL on purpose), so
 * it's safe to sync to the address bar/browser history the same way
 * `features/requests/list-query-url.ts` does.
 *
 * `datePreset` — not an absolute `from`/`to` bound — is what's stored in
 * the URL. The preset is resolved to an absolute range at fetch time
 * (`features/orders/api.ts`), so a bookmarked/shared "today" link always
 * means "today" whenever it's opened, not the calendar day it was created.
 */
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_STATUS: PaymentOrderStatus = "DONE";
const DEFAULT_DATE_PRESET: DatePreset = "all";
const DEFAULT_SORT: PaymentOrderSort = "createdAt";

const VALID_STATUSES: PaymentOrderStatus[] = ["READY", "DONE"];
const VALID_POS_SYNC_STATUSES: PaymentOrderPosSyncStatus[] = [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "NOT_CONFIGURED",
];
const VALID_DATE_PRESETS: DatePreset[] = ["today", "last7", "last30", "all"];
const VALID_SORTS: PaymentOrderSort[] = ["createdAt", "amount"];

function isValidStatus(value: string | null): value is PaymentOrderStatus {
  return VALID_STATUSES.includes(value as PaymentOrderStatus);
}

function isValidPosSyncStatus(value: string | null): value is PaymentOrderPosSyncStatus {
  return VALID_POS_SYNC_STATUSES.includes(value as PaymentOrderPosSyncStatus);
}

function isValidDatePreset(value: string | null): value is DatePreset {
  return VALID_DATE_PRESETS.includes(value as DatePreset);
}

function isValidSort(value: string | null): value is PaymentOrderSort {
  return VALID_SORTS.includes(value as PaymentOrderSort);
}

function parsePageSize(value: string | null): number {
  const parsed = Number(value);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])
    ? parsed
    : DEFAULT_PAGE_SIZE;
}

export function parseOrderListQuery(searchParams: URLSearchParams): OrderListQuery {
  const pageRaw = Number(searchParams.get("page"));
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const statusRaw = searchParams.get("status");
  const status = statusRaw === "all" ? undefined : isValidStatus(statusRaw) ? statusRaw : DEFAULT_STATUS;

  const posSyncRaw = searchParams.get("posSync");
  const posSyncStatus = isValidPosSyncStatus(posSyncRaw) ? posSyncRaw : undefined;

  const datePresetRaw = searchParams.get("datePreset");
  const datePreset = isValidDatePreset(datePresetRaw) ? datePresetRaw : DEFAULT_DATE_PRESET;

  const sortRaw = searchParams.get("sort");
  const sort = isValidSort(sortRaw) ? sortRaw : DEFAULT_SORT;

  const orderRaw = searchParams.get("order");
  const order: SortOrder = orderRaw === "asc" || orderRaw === "desc" ? orderRaw : "desc";

  return {
    page,
    pageSize: parsePageSize(searchParams.get("pageSize")),
    status,
    posSyncStatus,
    search: searchParams.get("q") ?? "",
    datePreset,
    sort,
    order,
  };
}

/**
 * Serializes only what departs from the default, so the URL for the
 * default view of the list stays a bare pathname. "No status filter" is
 * the one exception: it must be written explicitly as `status=all` (not
 * omitted), since an absent `status` param means the *default* filter
 * (`DONE`), not "all statuses".
 */
export function buildOrderListSearchParams(query: OrderListQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.page !== 1) {
    params.set("page", String(query.page));
  }
  if (query.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(query.pageSize));
  }
  if (query.status !== DEFAULT_STATUS) {
    params.set("status", query.status ?? "all");
  }
  if (query.posSyncStatus) {
    params.set("posSync", query.posSyncStatus);
  }
  if (query.search) {
    params.set("q", query.search);
  }
  if (query.datePreset !== DEFAULT_DATE_PRESET) {
    params.set("datePreset", query.datePreset);
  }
  if (query.sort !== DEFAULT_SORT) {
    params.set("sort", query.sort);
  }
  if (query.order !== "desc") {
    params.set("order", query.order);
  }

  return params;
}
