import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SpecialRequest, SpecialRequestPageResult } from "./model";

const useSpecialRequestsPageQueryMock = vi.fn();
const useDeleteSpecialRequestMutationMock = vi.fn();
const mutateMock = vi.fn();
const refetchMock = vi.fn();

vi.mock("./queries", () => ({
  useSpecialRequestsPageQuery: (query: unknown) => useSpecialRequestsPageQueryMock(query),
  useDeleteSpecialRequestMutation: () => useDeleteSpecialRequestMutationMock(),
}));

import { SpecialRequestPage } from "./SpecialRequestPage";

const ITEMS: SpecialRequest[] = [
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

function pageFixture(
  items: SpecialRequest[],
  overrides: Partial<SpecialRequestPageResult> = {},
): SpecialRequestPageResult {
  return { items, page: 1, pageSize: 20, total: items.length, ...overrides };
}

function mockQuery(overrides: Partial<ReturnType<typeof defaultQueryResult>> = {}) {
  useSpecialRequestsPageQueryMock.mockReturnValue({ ...defaultQueryResult(), ...overrides });
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
    useSpecialRequestsPageQueryMock.mockClear();
    mockQuery();
    mockMutation();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a loading state while the special request page is loading", () => {
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

  it("requests the default query (no gender, empty search, createdAt desc, page 1) on first render", () => {
    render(<SpecialRequestPage />);

    expect(useSpecialRequestsPageQueryMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      gender: undefined,
      search: "",
      sort: "createdAt",
      order: "desc",
    });
  });

  it("shows the original empty state when the result is empty with no active filter", () => {
    mockQuery({ data: pageFixture([], { total: 0 }) });

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

  it("never puts the typed search text into the page URL", async () => {
    vi.useFakeTimers();
    const pushStateSpy = vi.spyOn(window.history, "pushState");
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    render(<SpecialRequestPage />);

    fireEvent.change(screen.getByPlaceholderText("테이블 번호, 이름, 연락처로 검색"), {
      target: { value: "홍길동" },
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(useSpecialRequestsPageQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "홍길동", page: 1 }),
    );
    expect(window.location.search).not.toContain("홍길동");
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalled();

    pushStateSpy.mockRestore();
    replaceStateSpy.mockRestore();
    vi.useRealTimers();
  });

  it("shows a distinct 'no results' state when a filter/search yields nothing", async () => {
    vi.useFakeTimers();
    mockQuery({ data: pageFixture([], { total: 0 }) });

    render(<SpecialRequestPage />);

    fireEvent.change(screen.getByPlaceholderText("테이블 번호, 이름, 연락처로 검색"), {
      target: { value: "no-such-name" },
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("검색 결과가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByText("접수된 특별 요청이 없습니다.")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("moves to the next page via Pagination", () => {
    mockQuery({ data: pageFixture(ITEMS, { page: 1, total: 45 }) });

    render(<SpecialRequestPage />);

    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(useSpecialRequestsPageQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });
});
