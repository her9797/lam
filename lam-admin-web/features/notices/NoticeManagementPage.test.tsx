import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppData } from "@/features/bootstrap/model";

import { validateNoticeText } from "./api";

const useBootstrapQueryMock = vi.fn();

vi.mock("@/features/bootstrap/queries", () => ({
  useBootstrapQuery: () => useBootstrapQueryMock(),
}));

const createNoticeMutate = vi.fn();
const updateNoticeMutate = vi.fn();
const updateNoticeVisibilityMutate = vi.fn();
const deleteNoticeMutate = vi.fn();

function idleMutation(mutate: ReturnType<typeof vi.fn>) {
  return { mutate, isPending: false, isError: false, error: null as unknown, variables: undefined as unknown };
}

const createNoticeMutationState = { current: idleMutation(createNoticeMutate) };
const updateNoticeMutationState = { current: idleMutation(updateNoticeMutate) };
const updateNoticeVisibilityMutationState = { current: idleMutation(updateNoticeVisibilityMutate) };
const deleteNoticeMutationState = { current: idleMutation(deleteNoticeMutate) };

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ...actual,
    useCreateNoticeMutation: () => createNoticeMutationState.current,
    useUpdateNoticeMutation: () => updateNoticeMutationState.current,
    useUpdateNoticeVisibilityMutation: () => updateNoticeVisibilityMutationState.current,
    useDeleteNoticeMutation: () => deleteNoticeMutationState.current,
  };
});

import { NoticeManagementPage } from "./NoticeManagementPage";

const FIXTURE: AppData = {
  store: {
    name: "가게",
    subtitle: "",
    address: "",
    songRequestCopy: "",
    requestCopy: "",
    eventCopy: "",
  },
  categories: [],
  items: [],
  requestGuides: [],
  notices: [
    { id: "notice-1", text: "매주 수요일 하이볼 1,000원 할인", isVisible: true },
    { id: "notice-2", text: "금요일 라이브 공연", isVisible: false },
  ],
};

const refetchMock = vi.fn();

function defaultBootstrapResult() {
  return {
    data: FIXTURE,
    isLoading: false,
    isError: false,
    error: null as unknown,
    refetch: refetchMock,
  };
}

function mockBootstrap(overrides: Partial<ReturnType<typeof defaultBootstrapResult>> = {}) {
  useBootstrapQueryMock.mockReturnValue({ ...defaultBootstrapResult(), ...overrides });
}

beforeEach(() => {
  createNoticeMutate.mockClear();
  updateNoticeMutate.mockClear();
  updateNoticeVisibilityMutate.mockClear();
  deleteNoticeMutate.mockClear();
  refetchMock.mockClear();

  createNoticeMutationState.current = idleMutation(createNoticeMutate);
  updateNoticeMutationState.current = idleMutation(updateNoticeMutate);
  updateNoticeVisibilityMutationState.current = idleMutation(updateNoticeVisibilityMutate);
  deleteNoticeMutationState.current = idleMutation(deleteNoticeMutate);

  mockBootstrap();
});

afterEach(() => {
  cleanup();
});

describe("validateNoticeText", () => {
  it("rejects empty text", () => {
    expect(validateNoticeText("")).toBeTruthy();
    expect(validateNoticeText("   ")).toBeTruthy();
  });

  it("accepts non-empty text", () => {
    expect(validateNoticeText("공지 문구")).toBeUndefined();
  });
});

describe("NoticeManagementPage", () => {
  it("shows a loading state while bootstrap data is loading", () => {
    mockBootstrap({ data: undefined, isLoading: true });

    render(<NoticeManagementPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows an error state with a working retry action when the query fails", () => {
    mockBootstrap({
      data: undefined,
      isError: true,
      error: new Error("요청이 실패했습니다. (500)"),
    });

    render(<NoticeManagementPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("요청이 실패했습니다. (500)");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state when there are no notices", () => {
    mockBootstrap({ data: { ...FIXTURE, notices: [] } });

    render(<NoticeManagementPage />);

    expect(screen.getByText("등록된 공지/이벤트가 없습니다.")).toBeInTheDocument();
  });

  it("opens the create dialog from the trigger button, and closes it on cancel", () => {
    render(<NoticeManagementPage />);

    expect(screen.queryByRole("dialog", { name: "새 공지/이벤트 등록" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "공지 추가" }));
    const dialog = screen.getByRole("dialog", { name: "새 공지/이벤트 등록" });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog", { name: "새 공지/이벤트 등록" })).not.toBeInTheDocument();
  });

  it("rejects submitting an empty notice and does not call the mutation", () => {
    render(<NoticeManagementPage />);

    fireEvent.click(screen.getByRole("button", { name: "공지 추가" }));
    const dialog = screen.getByRole("dialog", { name: "새 공지/이벤트 등록" });
    fireEvent.click(within(dialog).getByRole("button", { name: "등록" }));

    expect(within(dialog).getByRole("alert")).toBeInTheDocument();
    expect(createNoticeMutate).not.toHaveBeenCalled();
  });

  it("creates a notice with the entered text and visibility", () => {
    render(<NoticeManagementPage />);

    fireEvent.click(screen.getByRole("button", { name: "공지 추가" }));
    const dialog = screen.getByRole("dialog", { name: "새 공지/이벤트 등록" });
    fireEvent.change(within(dialog).getByLabelText("공지 문구"), {
      target: { value: "새 이벤트 안내" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "등록" }));

    expect(createNoticeMutate).toHaveBeenCalledWith(
      { text: "새 이벤트 안내", isVisible: true },
      expect.anything(),
    );
  });

  it("closes the create dialog and shows a success message once the create mutation succeeds", () => {
    render(<NoticeManagementPage />);

    fireEvent.click(screen.getByRole("button", { name: "공지 추가" }));
    const dialog = screen.getByRole("dialog", { name: "새 공지/이벤트 등록" });
    fireEvent.change(within(dialog).getByLabelText("공지 문구"), {
      target: { value: "새 이벤트 안내" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "등록" }));

    const onSuccess = createNoticeMutate.mock.calls[0][1].onSuccess as () => void;
    act(() => onSuccess());

    expect(screen.queryByRole("dialog", { name: "새 공지/이벤트 등록" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("등록");
  });

  it("toggles notice visibility", () => {
    render(<NoticeManagementPage />);

    const row = screen.getByText("매주 수요일 하이볼 1,000원 할인").closest("tr");
    if (!row) {
      throw new Error("notice row not found");
    }

    fireEvent.click(within(row).getByRole("button", { name: "공개" }));

    expect(updateNoticeVisibilityMutate).toHaveBeenCalledWith(
      { id: "notice-1", isVisible: false },
      expect.anything(),
    );
  });

  it("disables a row's own visibility toggle while its mutation is in flight, without disabling other rows", () => {
    updateNoticeVisibilityMutationState.current = {
      ...idleMutation(updateNoticeVisibilityMutate),
      isPending: true,
      variables: { id: "notice-1", isVisible: false },
    };

    render(<NoticeManagementPage />);

    const row1 = screen.getByText("매주 수요일 하이볼 1,000원 할인").closest("tr");
    const row2 = screen.getByText("금요일 라이브 공연").closest("tr");
    if (!row1 || !row2) {
      throw new Error("notice rows not found");
    }

    expect(within(row1).getByRole("button", { name: "공개" })).toBeDisabled();
    expect(within(row2).getByRole("button", { name: "숨김" })).not.toBeDisabled();
  });

  it("edits a notice through the edit dialog and rejects clearing the text", () => {
    render(<NoticeManagementPage />);

    const row = screen.getByText("매주 수요일 하이볼 1,000원 할인").closest("tr");
    if (!row) {
      throw new Error("notice row not found");
    }

    fireEvent.click(within(row).getByRole("button", { name: "수정" }));

    const dialog = screen.getByRole("dialog", { name: "공지 수정" });
    const editField = within(dialog).getByLabelText("공지 문구 수정");
    expect(editField).toHaveValue("매주 수요일 하이볼 1,000원 할인");

    fireEvent.change(editField, { target: { value: "   " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    expect(within(dialog).getByRole("alert")).toBeInTheDocument();
    expect(updateNoticeMutate).not.toHaveBeenCalled();

    fireEvent.change(editField, { target: { value: "수정된 문구" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    expect(updateNoticeMutate).toHaveBeenCalledWith(
      { id: "notice-1", text: "수정된 문구" },
      expect.anything(),
    );

    const onSuccess = updateNoticeMutate.mock.calls[0][1].onSuccess as () => void;
    act(() => onSuccess());
    expect(screen.queryByRole("dialog", { name: "공지 수정" })).not.toBeInTheDocument();
  });

  it("asks for confirmation before deleting a notice, and only mutates after confirming", () => {
    render(<NoticeManagementPage />);

    const row = screen.getByText("매주 수요일 하이볼 1,000원 할인").closest("tr");
    if (!row) {
      throw new Error("notice row not found");
    }

    fireEvent.click(within(row).getByRole("button", { name: "삭제" }));
    const confirmDialog = screen.getByRole("alertdialog");
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "취소" }));
    expect(deleteNoticeMutate).not.toHaveBeenCalled();

    fireEvent.click(within(row).getByRole("button", { name: "삭제" }));
    const reopenedDialog = screen.getByRole("alertdialog");
    fireEvent.click(within(reopenedDialog).getByRole("button", { name: "삭제" }));

    expect(deleteNoticeMutate).toHaveBeenCalledWith("notice-1", expect.anything());
    // Stays open until the mutation's own onSuccess fires (the corrected
    // AlertDialog pattern — no auto-close on click).
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    const onSuccess = deleteNoticeMutate.mock.calls[0][1].onSuccess as () => void;
    act(() => onSuccess());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("disables a row's own delete button while its mutation is in flight, without disabling other rows", () => {
    deleteNoticeMutationState.current = {
      ...idleMutation(deleteNoticeMutate),
      isPending: true,
      variables: "notice-1",
    };

    render(<NoticeManagementPage />);

    const row1 = screen.getByText("매주 수요일 하이볼 1,000원 할인").closest("tr");
    const row2 = screen.getByText("금요일 라이브 공연").closest("tr");
    if (!row1 || !row2) {
      throw new Error("notice rows not found");
    }

    expect(within(row1).getByRole("button", { name: "삭제" })).toBeDisabled();
    expect(within(row2).getByRole("button", { name: "삭제" })).not.toBeDisabled();
  });
});
