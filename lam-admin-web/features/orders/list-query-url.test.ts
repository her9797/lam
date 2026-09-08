import { describe, expect, it } from "vitest";

import { buildOrderListSearchParams, parseOrderListQuery } from "./list-query-url";
import type { OrderListQuery } from "./model";

describe("parseOrderListQuery", () => {
  it("defaults to page 1, pageSize 10, status DONE, no posSync filter, no search, datePreset all, sort createdAt desc", () => {
    const query = parseOrderListQuery(new URLSearchParams());
    expect(query).toEqual({
      page: 1,
      pageSize: 10,
      status: "DONE",
      posSyncStatus: undefined,
      search: "",
      datePreset: "all",
      sort: "createdAt",
      order: "desc",
    });
  });

  it("reads every recognized param from the URL", () => {
    const query = parseOrderListQuery(
      new URLSearchParams(
        "page=2&pageSize=30&status=READY&posSync=FAILED&q=T-01&datePreset=last7&sort=amount&order=asc",
      ),
    );
    expect(query).toEqual({
      page: 2,
      pageSize: 30,
      status: "READY",
      posSyncStatus: "FAILED",
      search: "T-01",
      datePreset: "last7",
      sort: "amount",
      order: "asc",
    });
  });

  it("treats status=all as no status filter", () => {
    const query = parseOrderListQuery(new URLSearchParams("status=all"));
    expect(query.status).toBeUndefined();
  });

  it("falls back to defaults for unrecognized enum values", () => {
    const query = parseOrderListQuery(
      new URLSearchParams("status=CANCELED&posSync=UNKNOWN&datePreset=yesterday&sort=tableNumber&order=random"),
    );
    expect(query.status).toBe("DONE");
    expect(query.posSyncStatus).toBeUndefined();
    expect(query.datePreset).toBe("all");
    expect(query.sort).toBe("createdAt");
    expect(query.order).toBe("desc");
  });

  it("falls back to page 1 / pageSize 10 for invalid paging params", () => {
    const query = parseOrderListQuery(new URLSearchParams("page=0&pageSize=999"));
    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(10);
  });
});

describe("buildOrderListSearchParams", () => {
  const DEFAULT_QUERY: OrderListQuery = {
    page: 1,
    pageSize: 10,
    status: "DONE",
    posSyncStatus: undefined,
    search: "",
    datePreset: "all",
    sort: "createdAt",
    order: "desc",
  };

  it("serializes to an empty string for the default query", () => {
    expect(buildOrderListSearchParams(DEFAULT_QUERY).toString()).toBe("");
  });

  it("round-trips a non-default query through the URL", () => {
    const query: OrderListQuery = {
      page: 2,
      pageSize: 30,
      status: "READY",
      posSyncStatus: "FAILED",
      search: "T-01",
      datePreset: "last7",
      sort: "amount",
      order: "asc",
    };
    const params = buildOrderListSearchParams(query);
    expect(parseOrderListQuery(params)).toEqual(query);
  });

  it("serializes an explicit 'no status filter' as status=all", () => {
    const params = buildOrderListSearchParams({ ...DEFAULT_QUERY, status: undefined });
    expect(params.get("status")).toBe("all");
  });
});
