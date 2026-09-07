import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchJson } from "@/lib/api/fetch-json";

import { resyncCatalog } from "./api";

vi.mock("@/lib/api/fetch-json", () => ({ fetchJson: vi.fn() }));

describe("resyncCatalog", () => {
  beforeEach(() => {
    vi.mocked(fetchJson).mockReset().mockResolvedValue({
      created: 0,
      linked: 0,
      updated: 0,
      data: { store: {}, categories: [], items: [], requestGuides: [], notices: [] },
    });
  });

  it("POSTs to the admin catalog-sync endpoint", async () => {
    await resyncCatalog();

    expect(fetchJson).toHaveBeenCalledWith("/api/admin/catalog-sync", { method: "POST" });
  });
});
