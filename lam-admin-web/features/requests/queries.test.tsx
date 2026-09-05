import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return { ...actual, useQuery: vi.fn(actual.useQuery) };
});

import type { CustomerRequest } from "./model";
import { useCustomerRequestsQuery, useUpdateCustomerRequestStatusesMutation } from "./queries";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ...actual,
    fetchCustomerRequests: vi.fn(),
    updateCustomerRequestStatuses: vi.fn(),
  };
});

import { fetchCustomerRequests, updateCustomerRequestStatuses } from "./api";

const fixture: CustomerRequest[] = [
  { id: "r1", tableNumber: "1", text: "물", status: "pending", createdAt: "2026-09-04T10:00:00Z" },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper, queryClient };
}

describe("useCustomerRequestsQuery safety-net polling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The interval firing and TanStack Query's own focusManager/visibility
  // gating are the library's tested behavior, not ours. What this hook is
  // responsible for is passing the right config — so this asserts on the
  // options handed to the real `useQuery`, rather than re-simulating the
  // library's internal interval/focus scheduling with fake timers (which
  // proved flaky: setInterval callbacks and the focusManager's own
  // `visibilitychange` listener interact in ways this component doesn't
  // control).
  it("configures a 60s safety-net poll that stops while the tab is hidden", async () => {
    vi.mocked(fetchCustomerRequests).mockResolvedValue(fixture);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCustomerRequestsQuery(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchInterval: 60_000,
        refetchIntervalInBackground: false,
      }),
    );
  });
});

describe("useUpdateCustomerRequestStatusesMutation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the bulk API and invalidates every requestsKeys.all-prefixed cache entry", async () => {
    vi.mocked(updateCustomerRequestStatuses).mockResolvedValue(fixture);
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateCustomerRequestStatusesMutation(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ ids: ["r1"], status: "checked" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateCustomerRequestStatuses).toHaveBeenCalledWith(["r1"], "checked");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["requests"] });
  });
});
