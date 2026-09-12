import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PaymentOrder } from "./model";

const backMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: backMock }),
}));

const useOrderQueryMock = vi.fn();
const refetchMock = vi.fn();

vi.mock("./queries", () => ({
  useOrderQuery: (orderId: string) => useOrderQueryMock(orderId),
}));

import { OrderDetailPage } from "./OrderDetailPage";

const ORDER: PaymentOrder = {
  orderId: "order-1",
  menuItemId: "menu-1",
  menuItemName: "Beer",
  categoryName: "Drinks",
  tableNumber: "5",
  requestNote: "얼음은 적게 주세요",
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
};

function mockQuery(overrides: Partial<ReturnType<typeof defaultQueryResult>> = {}) {
  useOrderQueryMock.mockReturnValue({ ...defaultQueryResult(), ...overrides });
}

function defaultQueryResult() {
  return {
    data: ORDER,
    isLoading: false,
    isError: false,
    error: null as unknown,
    refetch: refetchMock,
  };
}

describe("OrderDetailPage", () => {
  beforeEach(() => {
    refetchMock.mockClear();
    backMock.mockClear();
    useOrderQueryMock.mockClear();
    mockQuery();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a loading state while the order is loading", () => {
    mockQuery({ data: undefined, isLoading: true });

    render(<OrderDetailPage orderId="order-1" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows an error state with a working retry action when the query fails", () => {
    mockQuery({ data: undefined, isError: true, error: new Error("요청이 실패했습니다. (500)") });

    render(<OrderDetailPage orderId="order-1" />);

    expect(screen.getByRole("alert")).toHaveTextContent("요청이 실패했습니다. (500)");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a not-found state when the order doesn't exist", () => {
    mockQuery({ data: undefined });

    render(<OrderDetailPage orderId="does-not-exist" />);

    expect(screen.getByText("주문을 찾을 수 없습니다.")).toBeInTheDocument();
  });

  it("requests the order by id", () => {
    render(<OrderDetailPage orderId="order-1" />);
    expect(useOrderQueryMock).toHaveBeenCalledWith("order-1");
  });

  it("renders payment/POS fields including the sensitive payment key", () => {
    render(<OrderDetailPage orderId="order-1" />);

    expect(screen.getByText("pk_123")).toBeInTheDocument();
    expect(screen.getByText("pos-1")).toBeInTheDocument();
    expect(screen.getByText("카드")).toBeInTheDocument();
    expect(screen.getByText("요청사항")).toBeInTheDocument();
    expect(screen.getByText("얼음은 적게 주세요")).toBeInTheDocument();
  });

  it("renders a CANCELLED order's status label", () => {
    mockQuery({ data: { ...ORDER, status: "CANCELLED" } });

    render(<OrderDetailPage orderId="order-1" />);

    expect(screen.getByText("취소됨")).toBeInTheDocument();
  });

  it("navigates back via router history when the back link is clicked", () => {
    render(<OrderDetailPage orderId="order-1" />);

    fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
    expect(backMock).toHaveBeenCalledTimes(1);
  });
});
