import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppData } from "@/features/bootstrap/model";

import { computeFocusPoint, createInitialCropTransform } from "./crop";
import { validateCategoryForm, validateImageFile, validateMenuItemForm } from "./model";

const useBootstrapQueryMock = vi.fn();

vi.mock("@/features/bootstrap/queries", () => ({
  useBootstrapQuery: () => useBootstrapQueryMock(),
}));

const createCategoryMutate = vi.fn();
const updateCategoryVisibilityMutate = vi.fn();
const deleteCategoryMutate = vi.fn();
const createMenuItemMutate = vi.fn();
const updateMenuItemVisibilityMutate = vi.fn();
const deleteMenuItemMutate = vi.fn();
const uploadMenuItemImageMutate = vi.fn();

function idleMutation(mutate: ReturnType<typeof vi.fn>) {
  return { mutate, isPending: false, isError: false, error: null as unknown, variables: undefined as unknown };
}

const createCategoryMutationState = { current: idleMutation(createCategoryMutate) };
const updateCategoryVisibilityMutationState = { current: idleMutation(updateCategoryVisibilityMutate) };
const deleteCategoryMutationState = { current: idleMutation(deleteCategoryMutate) };
const createMenuItemMutationState = { current: idleMutation(createMenuItemMutate) };
const updateMenuItemVisibilityMutationState = { current: idleMutation(updateMenuItemVisibilityMutate) };
const deleteMenuItemMutationState = { current: idleMutation(deleteMenuItemMutate) };
const uploadMenuItemImageMutationState = { current: idleMutation(uploadMenuItemImageMutate) };

vi.mock("./queries", () => ({
  useCreateCategoryMutation: () => createCategoryMutationState.current,
  useUpdateCategoryVisibilityMutation: () => updateCategoryVisibilityMutationState.current,
  useDeleteCategoryMutation: () => deleteCategoryMutationState.current,
  useCreateMenuItemMutation: () => createMenuItemMutationState.current,
  useUpdateMenuItemVisibilityMutation: () => updateMenuItemVisibilityMutationState.current,
  useDeleteMenuItemMutation: () => deleteMenuItemMutationState.current,
  useUploadMenuItemImageMutation: () => uploadMenuItemImageMutationState.current,
}));

const loadImageNaturalSizeMock = vi.fn();

vi.mock("./crop", async () => {
  const actual = await vi.importActual<typeof import("./crop")>("./crop");
  return {
    ...actual,
    loadImageNaturalSize: (url: string) => loadImageNaturalSizeMock(url),
  };
});

import { MenuManagementPage } from "./MenuManagementPage";

const FIXTURE: AppData = {
  store: {
    name: "가게",
    subtitle: "",
    address: "",
    songRequestCopy: "",
    requestCopy: "",
    eventCopy: "",
  },
  categories: [{ id: "drinks", label: "음료", isVisible: true }],
  items: [
    {
      id: "menu-1",
      categoryId: "drinks",
      name: "아메리카노",
      description: "시원한 아메리카노",
      price: "4000",
      isVisible: true,
    },
  ],
  requestGuides: [],
  notices: [],
};

function defaultBootstrapResult() {
  return {
    data: FIXTURE,
    isLoading: false,
    isError: false,
    error: null as unknown,
    refetch: refetchMock,
  };
}

const refetchMock = vi.fn();

function mockBootstrap(overrides: Partial<ReturnType<typeof defaultBootstrapResult>> = {}) {
  useBootstrapQueryMock.mockReturnValue({ ...defaultBootstrapResult(), ...overrides });
}

beforeEach(() => {
  createCategoryMutate.mockClear();
  updateCategoryVisibilityMutate.mockClear();
  deleteCategoryMutate.mockClear();
  createMenuItemMutate.mockClear();
  updateMenuItemVisibilityMutate.mockClear();
  deleteMenuItemMutate.mockClear();
  uploadMenuItemImageMutate.mockClear();
  refetchMock.mockClear();
  loadImageNaturalSizeMock.mockReset();
  loadImageNaturalSizeMock.mockResolvedValue({ naturalWidth: 400, naturalHeight: 200 });

  createCategoryMutationState.current = idleMutation(createCategoryMutate);
  updateCategoryVisibilityMutationState.current = idleMutation(updateCategoryVisibilityMutate);
  deleteCategoryMutationState.current = idleMutation(deleteCategoryMutate);
  createMenuItemMutationState.current = idleMutation(createMenuItemMutate);
  updateMenuItemVisibilityMutationState.current = idleMutation(updateMenuItemVisibilityMutate);
  deleteMenuItemMutationState.current = idleMutation(deleteMenuItemMutate);
  uploadMenuItemImageMutationState.current = idleMutation(uploadMenuItemImageMutate);

  mockBootstrap();

  // jsdom doesn't implement the Blob-URL registry at all.
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("pure validators", () => {
  it("rejects an empty category id and label", () => {
    const errors = validateCategoryForm({ id: "", label: "" }, []);
    expect(errors.id).toBeTruthy();
    expect(errors.label).toBeTruthy();
  });

  it("rejects a category id that already exists", () => {
    const errors = validateCategoryForm({ id: "drinks", label: "새 이름" }, ["drinks"]);
    expect(errors.id).toBeTruthy();
  });

  it("rejects an empty menu item name and price", () => {
    const errors = validateMenuItemForm({ categoryId: "drinks", name: "", price: "" }, ["drinks"]);
    expect(errors.name).toBeTruthy();
    expect(errors.price).toBeTruthy();
  });

  it("rejects a menu item referencing a category that doesn't exist", () => {
    const errors = validateMenuItemForm(
      { categoryId: "ghost-category", name: "아메리카노", price: "4000" },
      ["drinks"],
    );
    expect(errors.categoryId).toBeTruthy();
  });

  it("accepts a valid menu item form", () => {
    const errors = validateMenuItemForm(
      { categoryId: "drinks", name: "아메리카노", price: "4000" },
      ["drinks"],
    );
    expect(errors).toEqual({});
  });

  it("rejects an image file with a disallowed MIME type", () => {
    const file = new File(["x"], "a.gif", { type: "image/gif" });
    expect(validateImageFile(file)).toBeTruthy();
  });

  it("rejects an image file larger than the size cap", () => {
    const bytes = new Uint8Array(9 * 1024 * 1024);
    const file = new File([bytes], "a.jpg", { type: "image/jpeg" });
    expect(validateImageFile(file)).toBeTruthy();
  });

  it("accepts an allowed, appropriately sized image file", () => {
    const file = new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" });
    expect(validateImageFile(file)).toBeUndefined();
  });
});

describe("MenuManagementPage", () => {
  it("shows a loading state while bootstrap data is loading", () => {
    mockBootstrap({ data: undefined, isLoading: true });

    render(<MenuManagementPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows an error state with a working retry action when the query fails", () => {
    mockBootstrap({
      data: undefined,
      isError: true,
      error: new Error("요청이 실패했습니다. (500)"),
    });

    render(<MenuManagementPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("요청이 실패했습니다. (500)");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows empty states when there are no categories or menu items", () => {
    mockBootstrap({
      data: { ...FIXTURE, categories: [], items: [] },
    });

    render(<MenuManagementPage />);

    expect(screen.getByText("등록된 카테고리가 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("등록된 메뉴가 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("먼저 카테고리를 추가하세요.")).toBeInTheDocument();
  });

  it("shows a field error and does not submit when the category form is left empty", () => {
    render(<MenuManagementPage />);

    fireEvent.click(screen.getByRole("button", { name: "카테고리 추가" }));

    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(createCategoryMutate).not.toHaveBeenCalled();
  });

  it("creates a category with the entered fields", () => {
    render(<MenuManagementPage />);

    fireEvent.change(screen.getByLabelText("카테고리 ID"), { target: { value: "food" } });
    fireEvent.change(screen.getByLabelText("카테고리 이름"), { target: { value: "음식" } });
    fireEvent.click(screen.getByRole("button", { name: "카테고리 추가" }));

    expect(createCategoryMutate).toHaveBeenCalledWith(
      { id: "food", label: "음식", isVisible: true },
      expect.anything(),
    );
  });

  it("rejects a category id that already exists", () => {
    render(<MenuManagementPage />);

    fireEvent.change(screen.getByLabelText("카테고리 ID"), { target: { value: "drinks" } });
    fireEvent.change(screen.getByLabelText("카테고리 이름"), { target: { value: "음료 2" } });
    fireEvent.click(screen.getByRole("button", { name: "카테고리 추가" }));

    expect(screen.getByText("이미 존재하는 카테고리 ID입니다.")).toBeInTheDocument();
    expect(createCategoryMutate).not.toHaveBeenCalled();
  });

  it("toggles category visibility", () => {
    render(<MenuManagementPage />);

    const categoryRow = screen.getByText("drinks").closest("tr");
    if (!categoryRow) {
      throw new Error("category row not found");
    }
    fireEvent.click(within(categoryRow).getByRole("button", { name: "공개" }));

    expect(updateCategoryVisibilityMutate).toHaveBeenCalledWith({ id: "drinks", isVisible: false });
  });

  it("asks for confirmation before deleting a category, and only mutates after confirming", () => {
    render(<MenuManagementPage />);

    const categoryRow = screen.getByText("drinks").closest("tr");
    if (!categoryRow) {
      throw new Error("category row not found");
    }

    fireEvent.click(within(categoryRow).getByRole("button", { name: "삭제" }));
    const confirmDialog = screen.getByRole("alertdialog");
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "취소" }));
    expect(deleteCategoryMutate).not.toHaveBeenCalled();

    fireEvent.click(within(categoryRow).getByRole("button", { name: "삭제" }));
    const reopenedDialog = screen.getByRole("alertdialog");
    fireEvent.click(within(reopenedDialog).getByRole("button", { name: "삭제" }));

    expect(deleteCategoryMutate).toHaveBeenCalledWith("drinks", expect.anything());
    // Stays open until the mutation's own onSuccess fires.
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    const onSuccess = deleteCategoryMutate.mock.calls[0][1].onSuccess as () => void;
    act(() => onSuccess());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows a field error and does not submit when the menu item form is left empty", () => {
    render(<MenuManagementPage />);

    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));

    expect(createMenuItemMutate).not.toHaveBeenCalled();
    expect(screen.getByText("메뉴 이름을 입력하세요.")).toBeInTheDocument();
    expect(screen.getByText("가격을 입력하세요.")).toBeInTheDocument();
  });

  it("creates a menu item with the entered fields", () => {
    render(<MenuManagementPage />);

    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "라떼" } });
    fireEvent.change(screen.getByLabelText("가격"), { target: { value: "4500" } });
    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));

    expect(createMenuItemMutate).toHaveBeenCalledWith(
      {
        categoryId: "drinks",
        badge: "",
        badgeColor: "",
        name: "라떼",
        description: "",
        price: "4500",
        isVisible: true,
      },
      expect.anything(),
    );
    expect(uploadMenuItemImageMutate).not.toHaveBeenCalled();
  });

  it("uploads an image attached to the create form to the newly-created item, found by diffing item ids (id-diff chaining)", async () => {
    render(<MenuManagementPage />);

    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "라떼" } });
    fireEvent.change(screen.getByLabelText("가격"), { target: { value: "4500" } });

    const file = new File([new Uint8Array(10)], "new-item.jpg", { type: "image/jpeg" });
    const imageInput = screen.getByLabelText("새 메뉴 이미지 선택");
    fireEvent.change(imageInput, { target: { files: [file] } });

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "확인" }));

    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));

    expect(createMenuItemMutate).toHaveBeenCalledTimes(1);
    expect(uploadMenuItemImageMutate).not.toHaveBeenCalled();

    // Simulate the create mutation resolving with the refreshed bootstrap
    // tree: the pre-existing "menu-1" plus one new item the server assigned
    // its own id to. The new item's id isn't known ahead of time — it must
    // be recovered by diffing against the item ids that existed before this
    // create (the pattern from `lam-web`'s admin screen).
    const onSuccess = createMenuItemMutate.mock.calls[0][1].onSuccess as (data: AppData) => void;
    const nextData: AppData = {
      ...FIXTURE,
      items: [
        ...FIXTURE.items,
        {
          id: "menu-999",
          categoryId: "drinks",
          name: "라떼",
          description: "",
          price: "4500",
          isVisible: true,
        },
      ],
    };
    act(() => onSuccess(nextData));

    const expectedFocus = computeFocusPoint(createInitialCropTransform(400, 200));
    expect(uploadMenuItemImageMutate).toHaveBeenCalledTimes(1);
    expect(uploadMenuItemImageMutate).toHaveBeenCalledWith({
      menuItemId: "menu-999",
      image: file,
      isPrimary: true,
      displayArea: "menu",
      focusX: expectedFocus.focusX,
      focusY: expectedFocus.focusY,
    });
  });

  it("toggles menu item visibility", () => {
    render(<MenuManagementPage />);

    const menuRow = screen.getByText("아메리카노").closest("tr");
    if (!menuRow) {
      throw new Error("menu row not found");
    }

    fireEvent.click(within(menuRow).getByRole("button", { name: "공개" }));

    expect(updateMenuItemVisibilityMutate).toHaveBeenCalledWith({ id: "menu-1", isVisible: false });
  });

  it("disables a row's own visibility toggle while its mutation is in flight, without disabling other rows", () => {
    updateMenuItemVisibilityMutationState.current = {
      ...idleMutation(updateMenuItemVisibilityMutate),
      isPending: true,
      variables: { id: "menu-1", isVisible: false },
    };

    render(<MenuManagementPage />);

    const menuRow = screen.getByText("아메리카노").closest("tr");
    if (!menuRow) {
      throw new Error("menu row not found");
    }
    expect(within(menuRow).getByRole("button", { name: "공개" })).toBeDisabled();
  });

  it("asks for confirmation before deleting a menu item, and only mutates after confirming", () => {
    render(<MenuManagementPage />);

    const menuRow = screen.getByText("아메리카노").closest("tr");
    if (!menuRow) {
      throw new Error("menu row not found");
    }

    fireEvent.click(within(menuRow).getByRole("button", { name: "삭제" }));
    const confirmDialog = screen.getByRole("alertdialog");
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "삭제" }));

    expect(deleteMenuItemMutate).toHaveBeenCalledWith("menu-1", expect.anything());
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    const onSuccess = deleteMenuItemMutate.mock.calls[0][1].onSuccess as () => void;
    act(() => onSuccess());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("rejects a disallowed image type without opening the crop editor", async () => {
    render(<MenuManagementPage />);

    const file = new File(["x"], "a.gif", { type: "image/gif" });
    const input = screen.getByLabelText("아메리카노 이미지 선택");
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByRole("alert")).toHaveTextContent("지원하지 않는 이미지 형식");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(loadImageNaturalSizeMock).not.toHaveBeenCalled();
  });

  it("opens the crop editor for a valid image and uploads with a centered focus point on save", async () => {
    render(<MenuManagementPage />);

    const file = new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText("아메리카노 이미지 선택");
    fireEvent.change(input, { target: { files: [file] } });

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("slider", { name: "이미지 확대/축소" })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    const expectedTransform = createInitialCropTransform(400, 200);
    const expectedFocus = computeFocusPoint(expectedTransform);
    expect(uploadMenuItemImageMutate).toHaveBeenCalledWith(
      {
        menuItemId: "menu-1",
        image: file,
        isPrimary: true,
        displayArea: "menu",
        focusX: expectedFocus.focusX,
        focusY: expectedFocus.focusY,
      },
      expect.anything(),
    );
  });

  it("recomputes the focus point after panning the image with the pointer before saving", async () => {
    render(<MenuManagementPage />);

    const file = new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText("아메리카노 이미지 선택");
    fireEvent.change(input, { target: { files: [file] } });

    const dialog = await screen.findByRole("dialog");
    const frame = within(dialog).getByRole("application");

    fireEvent.pointerDown(frame, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(frame, { clientX: -80, clientY: 0 });
    fireEvent.pointerUp(frame);

    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    expect(uploadMenuItemImageMutate).toHaveBeenCalledTimes(1);
    const uploadedPayload = uploadMenuItemImageMutate.mock.calls[0][0] as { focusX: number };
    const centeredFocus = computeFocusPoint(createInitialCropTransform(400, 200));
    expect(uploadedPayload.focusX).not.toBe(centeredFocus.focusX);
  });

  it("pans the image with arrow keys, keeping the frame fully covered (keyboard operable)", async () => {
    render(<MenuManagementPage />);

    const file = new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText("아메리카노 이미지 선택");
    fireEvent.change(input, { target: { files: [file] } });

    const dialog = await screen.findByRole("dialog");
    const frame = within(dialog).getByRole("application");

    for (let i = 0; i < 30; i += 1) {
      fireEvent.keyDown(frame, { key: "ArrowLeft" });
    }

    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    const uploadedPayload = uploadMenuItemImageMutate.mock.calls[0][0] as {
      focusX: number;
      focusY: number;
    };
    expect(uploadedPayload.focusX).toBeGreaterThanOrEqual(0);
    expect(uploadedPayload.focusX).toBeLessThanOrEqual(100);
  });

  it("zooms via the range input (keyboard-operable control) and keeps a valid focus point on save", async () => {
    render(<MenuManagementPage />);

    const file = new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText("아메리카노 이미지 선택");
    fireEvent.change(input, { target: { files: [file] } });

    const dialog = await screen.findByRole("dialog");
    const zoomSlider = within(dialog).getByRole("slider", { name: "이미지 확대/축소" });
    fireEvent.change(zoomSlider, { target: { value: "3" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    const uploadedPayload = uploadMenuItemImageMutate.mock.calls[0][0] as {
      focusX: number;
      focusY: number;
    };
    expect(uploadedPayload.focusX).toBeGreaterThanOrEqual(0);
    expect(uploadedPayload.focusX).toBeLessThanOrEqual(100);
    expect(uploadedPayload.focusY).toBeGreaterThanOrEqual(0);
    expect(uploadedPayload.focusY).toBeLessThanOrEqual(100);
  });

  it("closes the crop dialog on cancel without uploading", async () => {
    render(<MenuManagementPage />);

    const file = new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText("아메리카노 이미지 선택");
    fireEvent.change(input, { target: { files: [file] } });

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(uploadMenuItemImageMutate).not.toHaveBeenCalled();
  });
});
