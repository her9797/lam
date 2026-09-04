import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchCustomerRequests, updateCustomerRequestStatus } from "./api";
import type { CustomerRequest } from "./model";

describe("requests api", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("fetches the general/song request list from the admin BFF", async () => {
    const fixture: CustomerRequest[] = [
      {
        id: "req-1",
        tableNumber: "3",
        text: "물 좀 주세요",
        status: "pending",
        createdAt: "2026-09-03T10:00:00Z",
      },
    ];
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const requests = await fetchCustomerRequests();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/customer-requests",
      expect.objectContaining({ method: "GET" }),
    );
    expect(requests[0]).toMatchObject({ id: "req-1", status: "pending" });
  });

  it("sends a status update as a PATCH to the resource path and returns the refreshed list", async () => {
    const fixture: CustomerRequest[] = [
      {
        id: "req-1",
        tableNumber: "3",
        text: "물 좀 주세요",
        status: "checked",
        createdAt: "2026-09-03T10:00:00Z",
      },
    ];
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const requests = await updateCustomerRequestStatus("req-1", "checked");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/admin/customer-requests/req-1/status");
    expect(init.method).toBe("PATCH");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body as string)).toEqual({ status: "checked" });
    expect(requests[0]).toMatchObject({ id: "req-1", status: "checked" });
  });

  it("rejects with the upstream status when the request fails", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "server error" }), { status: 500 }),
    ) as unknown as typeof fetch;

    await expect(fetchCustomerRequests()).rejects.toMatchObject({ status: 500 });
  });
});
