import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CustomerRequest, CustomerRequestPageResult } from "./model";

const replaceMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/requests",
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => currentSearchParams,
}));

const useCustomerRequestsPageQueryMock = vi.fn();
const useUpdateCustomerRequestStatusMutationMock = vi.fn();
const mutateMock = vi.fn();
const refetchMock = vi.fn();

vi.mock("./queries", () => ({
  useCustomerRequestsPageQuery: (query: unknown) => useCustomerRequestsPageQueryMock(query),
  useUpdateCustomerRequestStatusMutation: () => useUpdateCustomerRequestStatusMutationMock(),
}));

import { RequestListPage } from "./RequestListPage";

const ITEMS: CustomerRequest[] = [
  {
    id: "r1",
    tableNumber: "1",
    text: "물 좀 주세요",
    status: "pending",
    createdAt: "2026-09-03T10:00:00Z",
  },
  {
    id: "r2",
    tableNumber: "2",
    text: "check please",
    status: "checked",
    createdAt: "2026-09-03T10:05:00Z",
  },
];

const SONG_ITEMS: CustomerRequest[] = [
  {
    id: "r3",
    tableNumber: "3",
    text: "[노래 신청] Dynamite - BTS",
    status: "pending",
    createdAt: "2026-09-03T10:10:00Z",
  },
];

function pageFixture(items: CustomerRequest[], overrides: Partial<CustomerRequestPageResult> = {}): CustomerRequestPageResult {
  return { items, page: 1, pageSize: 20, total: items.length, ...overrides };
}

function mockQuery(overrides: Partial<ReturnType<typeof defaultQueryResult>> = {}) {
  useCustomerRequestsPageQueryMock.mockReturnValue({ ...defaultQueryResult(), ...overrides });
}

function defaultQueryResult() {
  return {
    data: pageFixture(ITEMS),
    isLoading: false,
    isError: false,
    error: null as unknown,
    refetch: refetchMock,
  };
}

function mockMutation(overrides: Partial<ReturnType<typeof defaultMutationResult>> = {}) {
  useUpdateCustomerRequestStatusMutationMock.mockReturnValue({
    ...defaultMutationResult(),
    ...overrides,
  });
}

function defaultMutationResult() {
  return {
    mutate: mutateMock,
    isPending: false,
    isError: false,
    error: null as unknown,
    variables: undefined as { id: string; status: string } | undefined,
  };
}

describe("RequestListPage", () => {
  beforeEach(() => {
    mutateMock.mockClear();
    refetchMock.mockClear();
    replaceMock.mockClear();
    useCustomerRequestsPageQueryMock.mockClear();
    currentSearchParams = new URLSearchParams();
    mockQuery();
    mockMutation();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a loading state while the request page is loading", () => {
    mockQuery({ data: undefined, isLoading: true });

    render(<RequestListPage kind="general" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows an error state with a working retry action when the query fails", () => {
    mockQuery({
      data: undefined,
      isError: true,
      error: new Error("요청이 실패했습니다. (500)"),
    });

    render(<RequestListPage kind="general" />);

    expect(screen.getByRole("alert")).toHaveTextContent("요청이 실패했습니다. (500)");

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it("requests kind=general for the general screen and kind=song for the song screen", () => {
    render(<RequestListPage kind="general" />);
    expect(useCustomerRequestsPageQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "general" }),
    );

    cleanup();
    render(<RequestListPage kind="song" />);
    expect(useCustomerRequestsPageQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "song" }),
    );
  });

  it("shows the original empty state when the result is empty with no active filter", () => {
    mockQuery({ data: pageFixture([], { total: 0 }) });

    render(<RequestListPage kind="general" />);

    expect(screen.getByText("대기 중인 손님 요청이 없습니다.")).toBeInTheDocument();
  });

  it("shows a distinct 'no results' state when a filter/search yields nothing", () => {
    currentSearchParams = new URLSearchParams("q=nomatch");
    mockQuery({ data: pageFixture([], { total: 0 }) });

    render(<RequestListPage kind="general" />);

    expect(screen.getByText("검색 결과가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByText("대기 중인 손님 요청이 없습니다.")).not.toBeInTheDocument();
  });

  it("renders rows from the server response, stripping the song-request prefix for display", () => {
    currentSearchParams = new URLSearchParams("sort=createdAt&order=desc");
    mockQuery({ data: pageFixture(SONG_ITEMS) });

    render(<RequestListPage kind="song" />);

    expect(screen.getByText("Dynamite - BTS")).toBeInTheDocument();
    expect(screen.queryByText("[노래 신청] Dynamite - BTS")).not.toBeInTheDocument();
  });

  it("advances a pending request to checked when its action button is clicked", () => {
    render(<RequestListPage kind="general" />);

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    expect(mutateMock).toHaveBeenCalledWith({ id: "r1", status: "checked" });
  });

  it("advances a checked request to completed when its action button is clicked", () => {
    render(<RequestListPage kind="general" />);

    fireEvent.click(screen.getByRole("button", { name: "처리완료" }));

    expect(mutateMock).toHaveBeenCalledWith({ id: "r2", status: "completed" });
  });

  it("disables only the row whose own mutation is in flight, preventing duplicate submission", () => {
    mockMutation({ isPending: true, variables: { id: "r1", status: "checked" } });

    render(<RequestListPage kind="general" />);

    const buttons = screen.getAllByRole("button", { name: "확인" });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toBeDisabled();
  });

  it("navigates to the next page via Pagination, keeping the other query params", () => {
    currentSearchParams = new URLSearchParams("status=pending");
    mockQuery({ data: pageFixture(ITEMS, { page: 1, total: 45 }) });

    render(<RequestListPage kind="general" />);

    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(replaceMock).toHaveBeenCalledWith("/requests?page=2&status=pending");
  });

  it("debounces a typed search into the URL and resets to page 1", async () => {
    vi.useFakeTimers();
    currentSearchParams = new URLSearchParams("page=3");
    mockQuery({ data: pageFixture(ITEMS, { page: 3, total: 45 }) });

    render(<RequestListPage kind="general" />);

    fireEvent.change(screen.getByPlaceholderText("테이블 번호, 내용으로 검색"), {
      target: { value: "napkin" },
    });

    expect(replaceMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(replaceMock).toHaveBeenCalledWith("/requests?q=napkin");
    vi.useRealTimers();
  });
});
