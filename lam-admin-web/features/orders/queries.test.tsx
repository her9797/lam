import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { OrderPageResult } from "./model";
import { useOrderCountQuery } from "./queries";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return { ...actual, fetchOrdersPage: vi.fn() };
});

import { fetchOrdersPage } from "./api";

const fixture: OrderPageResult = { items: [], page: 1, pageSize: 1, total: 3 };

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper };
}

describe("useOrderCountQuery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The dashboard card now counts unpaid orders, so this asserts the fixed
  // query object it hands to `fetchOrdersPage` filters on `READY` (미결제)
  // rather than `DONE`.
  it("fetches the count filtered to READY (unpaid) orders", async () => {
    vi.mocked(fetchOrdersPage).mockResolvedValue(fixture);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useOrderCountQuery(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchOrdersPage).toHaveBeenCalledWith(
      expect.objectContaining({ status: "READY" }),
    );
  });
});
