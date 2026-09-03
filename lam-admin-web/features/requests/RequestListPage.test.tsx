import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CustomerRequest } from "./model";

const useCustomerRequestsQueryMock = vi.fn();
const useUpdateCustomerRequestStatusMutationMock = vi.fn();
const mutateMock = vi.fn();
const refetchMock = vi.fn();

vi.mock("./queries", () => ({
  useCustomerRequestsQuery: () => useCustomerRequestsQueryMock(),
  useUpdateCustomerRequestStatusMutation: () => useUpdateCustomerRequestStatusMutationMock(),
}));

import { RequestListPage } from "./RequestListPage";

const FIXTURE: CustomerRequest[] = [
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
    text: "[노래 신청] Dynamite - BTS",
    status: "pending",
    createdAt: "2026-09-03T10:05:00Z",
  },
  {
    id: "r3",
    tableNumber: "3",
    text: "[노래 신청] Butter",
    status: "checked",
    createdAt: "2026-09-03T10:10:00Z",
  },
];

function mockQuery(overrides: Partial<ReturnType<typeof defaultQueryResult>> = {}) {
  useCustomerRequestsQueryMock.mockReturnValue({ ...defaultQueryResult(), ...overrides });
}

function defaultQueryResult() {
  return {
    data: FIXTURE,
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
    mockQuery();
    mockMutation();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a loading state while the request list is loading", () => {
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

  it("shows the empty state when there are no general requests", () => {
    mockQuery({ data: [] });

    render(<RequestListPage kind="general" />);

    expect(screen.getByText("대기 중인 손님 요청이 없습니다.")).toBeInTheDocument();
  });

  it("renders only non-song requests for kind='general'", () => {
    render(<RequestListPage kind="general" />);

    expect(screen.getByText("물 좀 주세요")).toBeInTheDocument();
    expect(screen.queryByText(/Dynamite/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Butter/)).not.toBeInTheDocument();
  });

  it("renders only song requests for kind='song', with the classification prefix stripped for display", () => {
    render(<RequestListPage kind="song" />);

    expect(screen.getByText("Dynamite - BTS")).toBeInTheDocument();
    expect(screen.getByText("Butter")).toBeInTheDocument();
    expect(screen.queryByText("[노래 신청] Dynamite - BTS")).not.toBeInTheDocument();
    expect(screen.queryByText("물 좀 주세요")).not.toBeInTheDocument();
  });

  it("advances a pending request to checked when its action button is clicked", () => {
    render(<RequestListPage kind="general" />);

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    expect(mutateMock).toHaveBeenCalledWith({ id: "r1", status: "checked" });
  });

  it("advances a checked request to completed when its action button is clicked", () => {
    render(<RequestListPage kind="song" />);

    fireEvent.click(screen.getByRole("button", { name: "처리완료" }));

    expect(mutateMock).toHaveBeenCalledWith({ id: "r3", status: "completed" });
  });

  it("disables only the row whose own mutation is in flight, preventing duplicate submission", () => {
    mockMutation({ isPending: true, variables: { id: "r2", status: "checked" } });

    render(<RequestListPage kind="song" />);

    const buttons = screen.getAllByRole("button", { name: "확인" });
    // r2 (pending, mutating) vs r3 (checked, shows "처리완료" not "확인")
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toBeDisabled();
  });
});
