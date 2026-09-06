import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OrderPageResult, PaymentOrder } from "./model";

const replaceMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/orders",
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => currentSearchParams,
}));

const useOrdersPageQueryMock = vi.fn();
const refetchMock = vi.fn();

vi.mock("./queries", () => ({
  useOrdersPageQuery: (query: unknown) => useOrdersPageQueryMock(query),
}));

import { OrderListPage } from "./OrderListPage";

const ORDERS: PaymentOrder[] = [
  {
    orderId: "order-1",
    menuItemId: "menu-1",
    menuItemName: "Beer",
    categoryName: "Drinks",
    tableNumber: "5",
    amount: 8000,
    vat: 727,
    suppliedAmount: 7273,
    taxFreeAmount: 0,
    status: "DONE",
    paymentMethod: "카드",
    paymentKey: "pk_123",
    approvedAt: "2026-01-10T12:10:00Z",
    posSyncStatus: "SUCCEEDED",
    posOrderId: "pos-1",
    createdAt: "2026-01-10T12:00:00Z",
  },
  {
    orderId: "order-2",
    menuItemName: "Cider",
    categoryName: "Drinks",
    tableNumber: "6",
    amount: 5000,
    vat: 0,
    suppliedAmount: 5000,
    taxFreeAmount: 0,
    status: "READY",
    posSyncStatus: "PENDING",
    createdAt: "2026-01-10T13:00:00Z",
  },
];

function pageFixture(items: PaymentOrder[], overrides: Partial<OrderPageResult> = {}): OrderPageResult {
  return { items, page: 1, pageSize: 20, total: items.length, ...overrides };
}

function mockQuery(overrides: Partial<ReturnType<typeof defaultQueryResult>> = {}) {
  useOrdersPageQueryMock.mockReturnValue({ ...defaultQueryResult(), ...overrides });
}

function defaultQueryResult() {
  return {
    data: pageFixture(ORDERS),
    isLoading: false,
    isError: false,
    error: null as unknown,
    refetch: refetchMock,
  };
}

describe("OrderListPage", () => {
  beforeEach(() => {
    refetchMock.mockClear();
    replaceMock.mockClear();
    useOrdersPageQueryMock.mockClear();
    currentSearchParams = new URLSearchParams();
    mockQuery();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a loading state while the order page is loading", () => {
    mockQuery({ data: undefined, isLoading: true });

    render(<OrderListPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows an error state with a working retry action when the query fails", () => {
    mockQuery({ data: undefined, isError: true, error: new Error("요청이 실패했습니다. (500)") });

    render(<OrderListPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("요청이 실패했습니다. (500)");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state when the result is empty with no active filter", () => {
    mockQuery({ data: pageFixture([], { total: 0 }) });

    render(<OrderListPage />);

    expect(screen.getByText("주문 내역이 없습니다.")).toBeInTheDocument();
  });

  it("renders order rows with table number, menu item, amount, status, and POS sync state", () => {
    render(<OrderListPage />);

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Beer")).toBeInTheDocument();
    expect(screen.getByText("₩8,000")).toBeInTheDocument();
    // "결제완료" also appears in the status-filter Select's own current
    // value (default filter is DONE), so this only asserts the row's cell
    // exists somewhere on the page, not uniqueness.
    expect(screen.getAllByText("결제완료").length).toBeGreaterThan(0);
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("Cider")).toBeInTheDocument();
    expect(screen.getByText("미결제")).toBeInTheDocument();
  });

  it("defaults to requesting status=DONE (via the URL query parser's own default)", () => {
    render(<OrderListPage />);
    expect(useOrdersPageQueryMock).toHaveBeenCalledWith(expect.objectContaining({ status: "DONE" }));
  });

  it("opens a detail dialog with payment/POS fields when a row's detail button is clicked", () => {
    render(<OrderListPage />);

    fireEvent.click(screen.getAllByRole("button", { name: "상세보기" })[0]);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("pk_123")).toBeInTheDocument();
    expect(within(dialog).getByText("pos-1")).toBeInTheDocument();
    expect(within(dialog).getByText("카드")).toBeInTheDocument();
  });
});
