import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { OrderListQuery, OrderPageResult } from "@/features/orders/model";

vi.mock("@/features/orders/api", () => ({
  fetchOrdersPage: vi.fn(),
}));

import { fetchOrdersPage } from "@/features/orders/api";

import { useOrderNotifications } from "./useOrderNotifications";

const fixture: OrderPageResult = {
  items: [
    {
      orderId: "o1",
      menuItemName: "하우스 하이볼",
      categoryName: "하이볼",
      tableNumber: "7",
      amount: 10000,
      vat: 909,
      suppliedAmount: 9091,
      taxFreeAmount: 0,
      status: "DONE",
      posSyncStatus: "SUCCEEDED",
      approvedAt: "2026-09-04T10:00:30Z",
      createdAt: "2026-09-04T10:00:00Z",
    },
  ],
  page: 1,
  pageSize: 20,
  total: 1,
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe("useOrderNotifications", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("derives the completed-sale alarm list from the orders query", async () => {
    vi.mocked(fetchOrdersPage).mockResolvedValue(fixture);

    const { result } = renderHook(() => useOrderNotifications(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications.map((item) => item.id)).toEqual(["o1"]);
  });

  it("asks the server only for paid orders, newest first, without a date bound", async () => {
    vi.mocked(fetchOrdersPage).mockResolvedValue(fixture);

    const { result } = renderHook(() => useOrderNotifications(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const query = vi.mocked(fetchOrdersPage).mock.calls[0]?.[0] as OrderListQuery;
    expect(query.status).toBe("DONE");
    expect(query.sort).toBe("createdAt");
    expect(query.order).toBe("desc");
    // "all", not "today": the bell must not depend on the business-day
    // window, or a sale rung up outside business hours never alarms.
    expect(query.datePreset).toBe("all");
    expect(query.page).toBe(1);
  });

  it("returns an empty list while loading", () => {
    vi.mocked(fetchOrdersPage).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useOrderNotifications(), { wrapper: createWrapper() });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });
});
