import { describe, expect, it } from "vitest";

import { buildRequestListSearchParams, parseRequestListQuery } from "./list-query-url";

describe("parseRequestListQuery", () => {
  it("defaults to page 1, no status filter, empty search, status-sort ascending", () => {
    const query = parseRequestListQuery(new URLSearchParams(), "general");

    expect(query).toEqual({
      page: 1,
      pageSize: 20,
      status: undefined,
      kind: "general",
      search: "",
      sort: "status",
      order: "asc",
    });
  });

  it("reads page/status/q/sort/order from the given search params", () => {
    const query = parseRequestListQuery(
      new URLSearchParams("page=3&status=checked&q=napkin&sort=createdAt&order=asc"),
      "song",
    );

    expect(query).toEqual({
      page: 3,
      pageSize: 20,
      status: "checked",
      kind: "song",
      search: "napkin",
      sort: "createdAt",
      order: "asc",
    });
  });

  it("falls back to page 1 for a non-numeric or non-positive page", () => {
    expect(parseRequestListQuery(new URLSearchParams("page=abc"), "general").page).toBe(1);
    expect(parseRequestListQuery(new URLSearchParams("page=0"), "general").page).toBe(1);
    expect(parseRequestListQuery(new URLSearchParams("page=-3"), "general").page).toBe(1);
  });

  it("ignores an unrecognized status instead of passing it through", () => {
    const query = parseRequestListQuery(new URLSearchParams("status=archived"), "general");
    expect(query.status).toBeUndefined();
  });

  it("ignores an unrecognized sort and falls back to the status default", () => {
    const query = parseRequestListQuery(new URLSearchParams("sort=id"), "general");
    expect(query.sort).toBe("status");
    expect(query.order).toBe("asc");
  });

  it("defaults order to desc when sort is createdAt or tableNumber without an explicit order", () => {
    expect(parseRequestListQuery(new URLSearchParams("sort=createdAt"), "general").order).toBe("desc");
    expect(parseRequestListQuery(new URLSearchParams("sort=tableNumber"), "general").order).toBe("desc");
  });
});

describe("buildRequestListSearchParams", () => {
  it("round-trips through parseRequestListQuery", () => {
    const original = parseRequestListQuery(
      new URLSearchParams("page=2&status=pending&q=hello&sort=tableNumber&order=asc"),
      "general",
    );

    const rebuilt = parseRequestListQuery(buildRequestListSearchParams(original), "general");

    expect(rebuilt).toEqual(original);
  });

  it("omits page when it is 1, so the URL stays clean on the first page", () => {
    const params = buildRequestListSearchParams({
      page: 1,
      pageSize: 20,
      status: undefined,
      kind: "general",
      search: "",
      sort: "status",
      order: "asc",
    });

    expect(params.has("page")).toBe(false);
    expect(params.has("status")).toBe(false);
    expect(params.has("q")).toBe(false);
  });
});
