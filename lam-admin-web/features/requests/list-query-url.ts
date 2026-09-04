import type {
  CustomerRequestKind,
  CustomerRequestListQuery,
  CustomerRequestSort,
  CustomerRequestStatus,
  SortOrder,
} from "./model";

/**
 * URL <-> `CustomerRequestListQuery` codec for the general/song request
 * screens (`/requests`, `/song-requests`). Kept URL-syncable per this
 * repo's list-paging plan section 4.5 — unlike `special-requests`, these
 * lists carry no personal data in their search field, so it is safe to put
 * in the address bar and browser history.
 *
 * `kind` is not part of the URL: it is fixed per-route by the `kind` prop
 * `RequestListPage` already receives, not a condition the operator toggles.
 */
const DEFAULT_PAGE_SIZE = 20;

const VALID_STATUSES: CustomerRequestStatus[] = ["pending", "checked", "completed"];
const VALID_SORTS: CustomerRequestSort[] = ["status", "createdAt", "tableNumber"];

function isValidStatus(value: string | null): value is CustomerRequestStatus {
  return VALID_STATUSES.includes(value as CustomerRequestStatus);
}

function isValidSort(value: string | null): value is CustomerRequestSort {
  return VALID_SORTS.includes(value as CustomerRequestSort);
}

function defaultOrderFor(sort: CustomerRequestSort): SortOrder {
  return sort === "status" ? "asc" : "desc";
}

export function parseRequestListQuery(
  searchParams: URLSearchParams,
  kind: CustomerRequestKind,
): CustomerRequestListQuery {
  const pageRaw = Number(searchParams.get("page"));
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const statusRaw = searchParams.get("status");
  const status = isValidStatus(statusRaw) ? statusRaw : undefined;

  const sortRaw = searchParams.get("sort");
  const sort = isValidSort(sortRaw) ? sortRaw : "status";

  const orderRaw = searchParams.get("order");
  const order: SortOrder = orderRaw === "asc" || orderRaw === "desc" ? orderRaw : defaultOrderFor(sort);

  return {
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    status,
    kind,
    search: searchParams.get("q") ?? "",
    sort,
    order,
  };
}

/**
 * Serializes only what departs from the default, so the URL for the
 * first/default view of a list stays a bare pathname.
 */
export function buildRequestListSearchParams(query: CustomerRequestListQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.page !== 1) {
    params.set("page", String(query.page));
  }
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.search) {
    params.set("q", query.search);
  }
  if (query.sort !== "status") {
    params.set("sort", query.sort);
  }
  if (query.order !== defaultOrderFor(query.sort)) {
    params.set("order", query.order);
  }

  return params;
}
