import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SpecialRequest } from "./model";

const useSpecialRequestsQueryMock = vi.fn();
const useDeleteSpecialRequestMutationMock = vi.fn();
const mutateMock = vi.fn();
const refetchMock = vi.fn();

vi.mock("./queries", () => ({
  useSpecialRequestsQuery: () => useSpecialRequestsQueryMock(),
  useDeleteSpecialRequestMutation: () => useDeleteSpecialRequestMutationMock(),
}));

import { SpecialRequestPage } from "./SpecialRequestPage";

const FIXTURE: SpecialRequest[] = [
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

function mockQuery(overrides: Partial<ReturnType<typeof defaultQueryResult>> = {}) {
  useSpecialRequestsQueryMock.mockReturnValue({ ...defaultQueryResult(), ...overrides });
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
  useDeleteSpecialRequestMutationMock.mockReturnValue({
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
    variables: undefined as string | undefined,
  };
}

describe("SpecialRequestPage", () => {
  beforeEach(() => {
    mutateMock.mockClear();
    refetchMock.mockClear();
    mockQuery();
    mockMutation();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a loading state while the special request list is loading", () => {
    mockQuery({ data: undefined, isLoading: true });

    render(<SpecialRequestPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows an error state with a working retry action when the query fails", () => {
    mockQuery({
      data: undefined,
      isError: true,
      error: new Error("요청이 실패했습니다. (500)"),
    });

    render(<SpecialRequestPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("요청이 실패했습니다. (500)");

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state when there are no special requests", () => {
    mockQuery({ data: [] });

    render(<SpecialRequestPage />);

    expect(screen.getByText("접수된 특별 요청이 없습니다.")).toBeInTheDocument();
  });

  it("opens a detail dialog showing every field when '상세보기' is clicked", () => {
    render(<SpecialRequestPage />);

    fireEvent.click(screen.getByRole("button", { name: "상세보기" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("5")).toBeInTheDocument();
    expect(within(dialog).getByText("홍길동")).toBeInTheDocument();
    expect(within(dialog).getByText("20대")).toBeInTheDocument();
    expect(within(dialog).getByText("서울")).toBeInTheDocument();
    expect(within(dialog).getByText("@handle")).toBeInTheDocument();
    expect(within(dialog).getByText("친절한 사람")).toBeInTheDocument();
    expect(within(dialog).getByText("소개해주세요")).toBeInTheDocument();
  });

  it("asks for confirmation before deleting, and does not mutate on cancel", () => {
    render(<SpecialRequestPage />);

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    const confirmDialog = screen.getByRole("alertdialog");
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "취소" }));

    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("deletes the special request after confirming in the AlertDialog", () => {
    render(<SpecialRequestPage />);

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    const confirmDialog = screen.getByRole("alertdialog");
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "삭제" }));

    expect(mutateMock).toHaveBeenCalledWith("s1", expect.anything());
  });

  it("keeps the confirm dialog open while the delete mutation is pending, and closes it only after onSuccess fires", () => {
    render(<SpecialRequestPage />);

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    const confirmDialog = screen.getByRole("alertdialog");
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "삭제" }));

    // The mutation was invoked, but `mutateMock` never resolved it — the
    // dialog must not auto-close just because the action button was
    // clicked; only the mutation's own `onSuccess` should close it.
    expect(mutateMock).toHaveBeenCalledWith("s1", expect.anything());
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    const onSuccess = mutateMock.mock.calls[0][1].onSuccess as () => void;
    act(() => {
      onSuccess();
    });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("disables the delete action while its own mutation is in flight, preventing duplicate submission", () => {
    mockMutation({ isPending: true, variables: "s1" });

    render(<SpecialRequestPage />);

    expect(screen.getByRole("button", { name: "삭제" })).toBeDisabled();
  });

  it("never logs the special request's personal fields to the console", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<SpecialRequestPage />);
    fireEvent.click(screen.getByRole("button", { name: "상세보기" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Close the detail dialog (base-ui makes the rest of the page inert
    // while it's open) before exercising the separate delete-confirm flow.
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    const allLoggedText = [...logSpy.mock.calls, ...errorSpy.mock.calls]
      .flat()
      .map((value) => (typeof value === "string" ? value : JSON.stringify(value)))
      .join(" ");

    expect(allLoggedText).not.toContain("홍길동");
    expect(allLoggedText).not.toContain("@handle");

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
