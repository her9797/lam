import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppData } from "@/features/bootstrap/model";
import type { CustomerRequest } from "@/features/requests/model";
import type { SpecialRequest } from "@/features/special-requests/model";

const useBootstrapQueryMock = vi.fn();
const useCustomerRequestsQueryMock = vi.fn();
const useSpecialRequestsQueryMock = vi.fn();
const bootstrapRefetchMock = vi.fn();
const requestsRefetchMock = vi.fn();
const specialRequestsRefetchMock = vi.fn();

vi.mock("@/features/bootstrap/queries", () => ({
  useBootstrapQuery: () => useBootstrapQueryMock(),
}));
vi.mock("@/features/requests/queries", () => ({
  useCustomerRequestsQuery: () => useCustomerRequestsQueryMock(),
}));
vi.mock("@/features/special-requests/queries", () => ({
  useSpecialRequestsQuery: () => useSpecialRequestsQueryMock(),
}));

import { DashboardPage } from "./DashboardPage";

// Non-empty fixture: one pending general request, one menu item, one notice
// — enough for every card to show a non-zero count, so this fixture must
// never be mistaken for the empty state.
const NON_EMPTY_APP_DATA: AppData = {
  store: {
    name: "LAM",
    subtitle: "",
    address: "",
    songRequestCopy: "",
    requestCopy: "",
    eventCopy: "",
  },
  categories: [],
  items: [{ id: "m1", categoryId: "c1", name: "모히토", description: "", price: "10000", isVisible: true }],
  requestGuides: [],
  notices: [{ id: "n1", text: "이벤트 안내", isVisible: true }],
};

const NON_EMPTY_REQUESTS: CustomerRequest[] = [
  {
    id: "r1",
    tableNumber: "1",
    text: "물 좀 주세요",
    status: "pending",
    createdAt: "2026-09-03T10:00:00Z",
  },
];

const NON_EMPTY_SPECIAL_REQUESTS: SpecialRequest[] = [
  {
    id: "s1",
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

const EMPTY_APP_DATA: AppData = {
  ...NON_EMPTY_APP_DATA,
  items: [],
  notices: [],
};

function mockBootstrap(overrides: Partial<ReturnType<typeof defaultBootstrapResult>> = {}) {
  useBootstrapQueryMock.mockReturnValue({ ...defaultBootstrapResult(), ...overrides });
}

function defaultBootstrapResult() {
  return {
    data: NON_EMPTY_APP_DATA,
    isLoading: false,
    isError: false,
    error: null as unknown,
    refetch: bootstrapRefetchMock,
  };
}

function mockRequests(overrides: Partial<ReturnType<typeof defaultRequestsResult>> = {}) {
  useCustomerRequestsQueryMock.mockReturnValue({ ...defaultRequestsResult(), ...overrides });
}

function defaultRequestsResult() {
  return {
    data: NON_EMPTY_REQUESTS,
    isLoading: false,
    isError: false,
    error: null as unknown,
    refetch: requestsRefetchMock,
  };
}

function mockSpecialRequests(
  overrides: Partial<ReturnType<typeof defaultSpecialRequestsResult>> = {},
) {
  useSpecialRequestsQueryMock.mockReturnValue({ ...defaultSpecialRequestsResult(), ...overrides });
}

function defaultSpecialRequestsResult() {
  return {
    data: NON_EMPTY_SPECIAL_REQUESTS,
    isLoading: false,
    isError: false,
    error: null as unknown,
    refetch: specialRequestsRefetchMock,
  };
}

describe("DashboardPage", () => {
  beforeEach(() => {
    bootstrapRefetchMock.mockClear();
    requestsRefetchMock.mockClear();
    specialRequestsRefetchMock.mockClear();
    mockBootstrap();
    mockRequests();
    mockSpecialRequests();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a loading state while any of the three queries is loading", () => {
    mockBootstrap({ data: undefined, isLoading: true });

    render(<DashboardPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows an error state and retries only the failed query", () => {
    mockRequests({ data: undefined, isError: true, error: new Error("요청이 실패했습니다. (500)") });

    render(<DashboardPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("요청이 실패했습니다. (500)");

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(requestsRefetchMock).toHaveBeenCalledTimes(1);
    expect(bootstrapRefetchMock).not.toHaveBeenCalled();
    expect(specialRequestsRefetchMock).not.toHaveBeenCalled();
  });

  it("shows the empty state when every aggregate count is genuinely zero", () => {
    mockBootstrap({ data: EMPTY_APP_DATA });
    mockRequests({ data: [] });
    mockSpecialRequests({ data: [] });

    render(<DashboardPage />);

    expect(screen.getByText("표시할 데이터가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByText("손님 요청")).not.toBeInTheDocument();
  });

  it("renders the shortcut cards with their counts when at least one count is non-zero", () => {
    render(<DashboardPage />);

    expect(screen.getByText("손님 요청")).toBeInTheDocument();
    expect(screen.queryByText("표시할 데이터가 없습니다.")).not.toBeInTheDocument();
    // 1 pending general request, 0 pending song requests, 1 special request,
    // 1 menu item, 1 notice — matches the non-empty fixtures above.
    expect(screen.getAllByText("1")).toHaveLength(4);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
