import { afterEach, describe, expect, it, vi } from "vitest";

import { deleteSpecialRequest, fetchSpecialRequests } from "./api";
import type { SpecialRequest } from "./model";

describe("special-requests api", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("fetches the special request list from its own admin BFF resource", async () => {
    const fixture: SpecialRequest[] = [
      {
        id: "special-1",
        tableNumber: "5",
        gender: "female",
        name: "홍길동",
        age: "20대",
        residence: "서울",
        instagram: "@handle",
        idealType: "친절한 사람",
        text: "소개해주세요",
        createdAt: "2026-09-03T10:00:00Z",
      },
    ];
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const specialRequests = await fetchSpecialRequests();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/special-requests",
      expect.objectContaining({ method: "GET" }),
    );
    expect(specialRequests[0]).toHaveProperty("idealType");
  });

  it("sends delete to the resource path and returns the refreshed list", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const specialRequests = await deleteSpecialRequest("special-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/special-requests/special-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(specialRequests).toEqual([]);
  });

  it("rejects with the upstream status when the request fails", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "server error" }), { status: 500 }),
    ) as unknown as typeof fetch;

    await expect(fetchSpecialRequests()).rejects.toMatchObject({ status: 500 });
  });
});
