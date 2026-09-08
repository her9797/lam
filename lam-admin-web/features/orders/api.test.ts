import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchJson } from "@/lib/api/fetch-json";

import { fetchOrdersPage } from "./api";
import type { OrderListQuery } from "./model";

vi.mock("@/lib/api/fetch-json", () => ({ fetchJson: vi.fn() }));

const BASE_QUERY: OrderListQuery = {
  page: 1,
  pageSize: 10,
  status: "DONE",
  posSyncStatus: undefined,
  search: "",
  datePreset: "all",
  sort: "createdAt",
  order: "desc",
};

describe("fetchOrdersPage", () => {
  beforeEach(() => {
    vi.mocked(fetchJson).mockReset().mockResolvedValue({ items: [], page: 1, pageSize: 10, total: 0 });
  });

  it("always sends page/pageSize/sort/order, and status when set", async () => {
    await fetchOrdersPage(BASE_QUERY);

    const [path] = vi.mocked(fetchJson).mock.calls[0];
    const url = new URL(String(path), "http://localhost");
    expect(url.pathname).toBe("/api/admin/payment-orders");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("pageSize")).toBe("10");
    expect(url.searchParams.get("sort")).toBe("createdAt");
    expect(url.searchParams.get("order")).toBe("desc");
    expect(url.searchParams.get("status")).toBe("DONE");
  });

  it("omits status when there is no status filter", async () => {
    await fetchOrdersPage({ ...BASE_QUERY, status: undefined });

    const [path] = vi.mocked(fetchJson).mock.calls[0];
    const url = new URL(String(path), "http://localhost");
    expect(url.searchParams.has("status")).toBe(false);
  });

  it("sends posSync only when set", async () => {
    await fetchOrdersPage({ ...BASE_QUERY, posSyncStatus: "FAILED" });

    const [path] = vi.mocked(fetchJson).mock.calls[0];
    const url = new URL(String(path), "http://localhost");
    expect(url.searchParams.get("posSync")).toBe("FAILED");
  });

  it("omits q when search is blank, sends it trimmed otherwise", async () => {
    await fetchOrdersPage({ ...BASE_QUERY, search: "  T-01  " });

    const [path] = vi.mocked(fetchJson).mock.calls[0];
    const url = new URL(String(path), "http://localhost");
    expect(url.searchParams.get("q")).toBe("T-01");
  });

  it("resolves a 'today' datePreset to concrete from/to bounds", async () => {
    await fetchOrdersPage({ ...BASE_QUERY, datePreset: "today" });

    const [path] = vi.mocked(fetchJson).mock.calls[0];
    const url = new URL(String(path), "http://localhost");
    expect(url.searchParams.get("from")).toBeTruthy();
    expect(url.searchParams.get("to")).toBeTruthy();
  });

  it("sends no from/to for the 'all' datePreset", async () => {
    await fetchOrdersPage({ ...BASE_QUERY, datePreset: "all" });

    const [path] = vi.mocked(fetchJson).mock.calls[0];
    const url = new URL(String(path), "http://localhost");
    expect(url.searchParams.has("from")).toBe(false);
    expect(url.searchParams.has("to")).toBe(false);
  });
});
