import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppData } from "@/features/bootstrap/model";

import { UPLOAD_FOCUS_CENTER, createInitialCropTransform, type CropTransform } from "./crop";
import { filterItemsByCategory, validateImageFile, validateMenuItemForm } from "./model";

const replaceMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/menu",
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => currentSearchParams,
}));

const useBootstrapQueryMock = vi.fn();

vi.mock("@/features/bootstrap/queries", () => ({
  useBootstrapQuery: () => useBootstrapQueryMock(),
}));

const createMenuItemMutate = vi.fn();
const updateMenuItemVisibilityMutate = vi.fn();
const uploadMenuItemImageMutate = vi.fn();

function idleMutation(mutate: ReturnType<typeof vi.fn>) {
  return { mutate, isPending: false, isError: false, error: null as unknown, variables: undefined as unknown };
}

const createMenuItemMutationState = { current: idleMutation(createMenuItemMutate) };
const updateMenuItemVisibilityMutationState = { current: idleMutation(updateMenuItemVisibilityMutate) };
const uploadMenuItemImageMutationState = { current: idleMutation(uploadMenuItemImageMutate) };
// CatalogResyncButton reads this too — not under test here, just needs a
// non-throwing default so this page's own tests keep exercising menu item
// create/update/upload only.
const resyncCatalogMutate = vi.fn();
const resyncCatalogMutationState = { current: idleMutation(resyncCatalogMutate) };

vi.mock("./queries", () => ({
  useCreateMenuItemMutation: () => createMenuItemMutationState.current,
  useUpdateMenuItemVisibilityMutation: () => updateMenuItemVisibilityMutationState.current,
  useUploadMenuItemImageMutation: () => uploadMenuItemImageMutationState.current,
  useResyncCatalogMutation: () => resyncCatalogMutationState.current,
}));

const loadImageNaturalSizeMock = vi.fn();
// jsdom implements neither image decoding nor a 2D canvas context, so the
// two I/O helpers in `./crop` are mocked while every pure geometry helper
// (including `computeCropDrawRects`, covered directly in `crop.test.ts`)
// stays real.
const cropImageFileToSquareMock = vi.fn();

/** The bitmap `cropImageFileToSquare` stands in for — what must be uploaded. */
const CROPPED_FILE = new File([new Uint8Array(4)], "cropped.jpg", { type: "image/jpeg" });

vi.mock("./crop", async () => {
  const actual = await vi.importActual<typeof import("./crop")>("./crop");
  return {
    ...actual,
    loadImageNaturalSize: (url: string) => loadImageNaturalSizeMock(url),
    cropImageFileToSquare: (file: File, transform: unknown) =>
      cropImageFileToSquareMock(file, transform),
  };
});

/** The transform the crop editor handed to the cropper on the Nth call. */
function croppedTransform(callIndex = 0): CropTransform {
  return cropImageFileToSquareMock.mock.calls[callIndex][1] as CropTransform;
}

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
  createMenuItemMutate.mockClear();
  updateMenuItemVisibilityMutate.mockClear();
  uploadMenuItemImageMutate.mockClear();
  refetchMock.mockClear();
  replaceMock.mockClear();
  currentSearchParams = new URLSearchParams();
  loadImageNaturalSizeMock.mockReset();
  loadImageNaturalSizeMock.mockResolvedValue({ naturalWidth: 400, naturalHeight: 200 });
  cropImageFileToSquareMock.mockReset();
  cropImageFileToSquareMock.mockResolvedValue(CROPPED_FILE);

  createMenuItemMutationState.current = idleMutation(createMenuItemMutate);
  updateMenuItemVisibilityMutationState.current = idleMutation(updateMenuItemVisibilityMutate);
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

describe("filterItemsByCategory", () => {
  const ITEMS = [
    { id: "menu-1", categoryId: "drinks", name: "아메리카노", description: "", price: "4000", isVisible: true },
    { id: "menu-2", categoryId: "food", name: "감자튀김", description: "", price: "5000", isVisible: true },
  ];

  it("returns only items matching the given category id", () => {
    expect(filterItemsByCategory(ITEMS, "food")).toEqual([ITEMS[1]]);
  });

  it("returns every item unfiltered when categoryId is blank", () => {
    expect(filterItemsByCategory(ITEMS, "")).toEqual(ITEMS);
  });

  it("returns an empty array for a category with no matching items", () => {
    expect(filterItemsByCategory(ITEMS, "does-not-exist")).toEqual([]);
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

  it("renders the catalog resync button alongside the menu item form trigger", () => {
    render(<MenuManagementPage />);

    expect(screen.getByRole("button", { name: "다시 동기화" })).toBeInTheDocument();
  });

  it("shows empty states when there are no categories or menu items", () => {
    mockBootstrap({
      data: { ...FIXTURE, categories: [], items: [] },
    });

    render(<MenuManagementPage />);

    expect(screen.getByText("등록된 메뉴가 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("먼저 카테고리를 추가하세요.")).toBeInTheDocument();
  });

  it("opens the menu item dialog from the trigger button, and closes it on cancel", () => {
    render(<MenuManagementPage />);

    expect(screen.queryByRole("dialog", { name: "메뉴 등록" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));
    const dialog = screen.getByRole("dialog", { name: "메뉴 등록" });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog", { name: "메뉴 등록" })).not.toBeInTheDocument();
  });

  it("shows a field error and does not submit when the menu item form is left empty", () => {
    render(<MenuManagementPage />);

    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));
    const dialog = screen.getByRole("dialog", { name: "메뉴 등록" });
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    expect(createMenuItemMutate).not.toHaveBeenCalled();
    expect(within(dialog).getByText("메뉴 이름을 입력하세요.")).toBeInTheDocument();
    expect(within(dialog).getByText("가격을 입력하세요.")).toBeInTheDocument();
  });

  it("creates a menu item with the entered fields and closes the dialog", () => {
    render(<MenuManagementPage />);

    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));
    const dialog = screen.getByRole("dialog", { name: "메뉴 등록" });
    fireEvent.change(within(dialog).getByLabelText("이름"), { target: { value: "라떼" } });
    fireEvent.change(within(dialog).getByLabelText("가격"), { target: { value: "4500" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

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

    const onSuccess = createMenuItemMutate.mock.calls[0][1].onSuccess as (data: AppData) => void;
    act(() => onSuccess(FIXTURE));
    expect(screen.queryByRole("dialog", { name: "메뉴 등록" })).not.toBeInTheDocument();
  });

  it("uploads an image attached to the create form to the newly-created item, found by diffing item ids (id-diff chaining)", async () => {
    render(<MenuManagementPage />);

    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));
    const createDialog = screen.getByRole("dialog", { name: "메뉴 등록" });
    fireEvent.change(within(createDialog).getByLabelText("이름"), { target: { value: "라떼" } });
    fireEvent.change(within(createDialog).getByLabelText("가격"), { target: { value: "4500" } });

    const file = new File([new Uint8Array(10)], "new-item.jpg", { type: "image/jpeg" });
    const imageInput = within(createDialog).getByLabelText("새 메뉴 이미지 선택");
    fireEvent.change(imageInput, { target: { files: [file] } });

    const cropDialog = await screen.findByRole("dialog", { name: "이미지 영역 선택" });
    fireEvent.click(within(cropDialog).getByRole("button", { name: "확인" }));

    fireEvent.click(within(createDialog).getByRole("button", { name: "저장" }));

    // The crop is rendered before the item is created, so the create call is
    // one microtask behind the click.
    await waitFor(() => expect(createMenuItemMutate).toHaveBeenCalledTimes(1));
    expect(cropImageFileToSquareMock).toHaveBeenCalledTimes(1);
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

    expect(uploadMenuItemImageMutate).toHaveBeenCalledTimes(1);
    // The CROPPED bitmap is uploaded, not the operator's original file.
    expect(uploadMenuItemImageMutate).toHaveBeenCalledWith({
      menuItemId: "menu-999",
      image: CROPPED_FILE,
      isPrimary: true,
      displayArea: "menu",
      focusX: UPLOAD_FOCUS_CENTER,
      focusY: UPLOAD_FOCUS_CENTER,
    });
    expect(cropImageFileToSquareMock).toHaveBeenCalledWith(file, expect.anything());
  });

  it("aborts the create submit without creating anything when the crop fails", async () => {
    cropImageFileToSquareMock.mockRejectedValue(new Error("canvas unavailable"));

    render(<MenuManagementPage />);

    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));
    const createDialog = screen.getByRole("dialog", { name: "메뉴 등록" });
    fireEvent.change(within(createDialog).getByLabelText("이름"), { target: { value: "라떼" } });
    fireEvent.change(within(createDialog).getByLabelText("가격"), { target: { value: "4500" } });

    const file = new File([new Uint8Array(10)], "new-item.jpg", { type: "image/jpeg" });
    fireEvent.change(within(createDialog).getByLabelText("새 메뉴 이미지 선택"), {
      target: { files: [file] },
    });

    const cropDialog = await screen.findByRole("dialog", { name: "이미지 영역 선택" });
    fireEvent.click(within(cropDialog).getByRole("button", { name: "확인" }));

    fireEvent.click(within(createDialog).getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(within(createDialog).getByText("이미지를 잘라내는 데 실패했습니다.")).toBeInTheDocument(),
    );
    expect(createMenuItemMutate).not.toHaveBeenCalled();
    expect(uploadMenuItemImageMutate).not.toHaveBeenCalled();
  });

  it("links the item name to its detail page, underlined by default so it reads as clickable", () => {
    render(<MenuManagementPage />);

    const nameLink = screen.getByRole("link", { name: "아메리카노" });
    expect(nameLink).toHaveAttribute("href", "/menu/menu-1");
    expect(nameLink).toHaveClass("underline");
    expect(nameLink).toHaveClass("hover:font-bold");
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

  it("does not show a delete action in the list (removed from this screen's UI)", () => {
    render(<MenuManagementPage />);

    expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
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

  it("opens the crop editor for a valid image and uploads the CROPPED bitmap on save", async () => {
    render(<MenuManagementPage />);

    const file = new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText("아메리카노 이미지 선택");
    fireEvent.change(input, { target: { files: [file] } });

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("slider", { name: "이미지 확대/축소" })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    await waitFor(() => expect(uploadMenuItemImageMutate).toHaveBeenCalledTimes(1));
    // The original file goes to the cropper; the cropper's output — not the
    // original — is what gets uploaded, with a no-op centred focus point.
    expect(cropImageFileToSquareMock).toHaveBeenCalledWith(file, expect.anything());
    expect(croppedTransform()).toEqual(createInitialCropTransform(400, 200));
    expect(uploadMenuItemImageMutate).toHaveBeenCalledWith(
      {
        menuItemId: "menu-1",
        image: CROPPED_FILE,
        isPrimary: true,
        displayArea: "menu",
        focusX: UPLOAD_FOCUS_CENTER,
        focusY: UPLOAD_FOCUS_CENTER,
      },
      expect.anything(),
    );
  });

  it("crops from the panned region after dragging the image with the pointer", async () => {
    render(<MenuManagementPage />);

    const file = new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText("아메리카노 이미지 선택");
    fireEvent.change(input, { target: { files: [file] } });

    const dialog = await screen.findByRole("dialog");
    const frame = within(dialog).getByRole("application");

    // jsdom has no `PointerEvent` constructor, so `fireEvent.pointerDown`'s
    // event init (including `clientX`) is silently dropped and the drag
    // reads `undefined` coordinates. Dispatching a real `MouseEvent` under
    // the `pointerdown`/`pointermove` type is what actually carries
    // coordinates into React's pointer handlers here.
    fireEvent(frame, new MouseEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0 }));
    fireEvent(frame, new MouseEvent("pointermove", { bubbles: true, clientX: -80, clientY: 0 }));
    fireEvent(frame, new MouseEvent("pointerup", { bubbles: true }));

    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    await waitFor(() => expect(cropImageFileToSquareMock).toHaveBeenCalledTimes(1));
    const centered = createInitialCropTransform(400, 200);
    expect(croppedTransform().offsetX).toBe(centered.offsetX - 80);
  });

  it("pans the image with arrow keys and crops from the panned region (keyboard operable)", async () => {
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

    await waitFor(() => expect(cropImageFileToSquareMock).toHaveBeenCalledTimes(1));
    const transform = croppedTransform();
    const centered = createInitialCropTransform(400, 200);
    // ArrowLeft pans the image right (positive offset), so 30 steps of 12px
    // from the centred -140 run into the left edge and clamp at 0 — the crop
    // that reaches the cropper is the left edge of the image, not the centre.
    expect(transform.offsetX).toBeGreaterThan(centered.offsetX);
    expect(transform.offsetX).toBe(0);
  });

  it("carries the selected zoom into the crop, so a zoomed crop differs from an unzoomed one", async () => {
    render(<MenuManagementPage />);

    const file = new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText("아메리카노 이미지 선택");
    fireEvent.change(input, { target: { files: [file] } });

    const dialog = await screen.findByRole("dialog");
    const zoomSlider = within(dialog).getByRole("slider", { name: "이미지 확대/축소" });
    fireEvent.change(zoomSlider, { target: { value: "3" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    await waitFor(() => expect(cropImageFileToSquareMock).toHaveBeenCalledTimes(1));
    // The regression the whole-branch review found: zoom used to be dropped
    // entirely, so this transform reached nothing that affected the upload.
    expect(croppedTransform().scale).toBe(3);
    expect(croppedTransform()).not.toEqual(createInitialCropTransform(400, 200));
  });

  it("reports a failed crop and uploads nothing", async () => {
    cropImageFileToSquareMock.mockRejectedValue(new Error("canvas unavailable"));

    render(<MenuManagementPage />);

    const file = new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("아메리카노 이미지 선택"), {
      target: { files: [file] },
    });

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(screen.getByText("이미지를 잘라내는 데 실패했습니다.")).toBeInTheDocument(),
    );
    expect(uploadMenuItemImageMutate).not.toHaveBeenCalled();
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

  describe("search, sort and pagination", () => {
    const TWO_ITEM_FIXTURE: AppData = {
      ...FIXTURE,
      items: [
        FIXTURE.items[0],
        {
          id: "menu-2",
          categoryId: "drinks",
          name: "카페라떼",
          description: "부드러운 라떼",
          price: "4500",
          isVisible: true,
        },
      ],
    };

    const TWO_CATEGORY_FIXTURE: AppData = {
      ...FIXTURE,
      categories: [
        { id: "drinks", label: "음료", isVisible: true },
        { id: "food", label: "안주", isVisible: true },
      ],
      items: [
        FIXTURE.items[0],
        {
          id: "menu-2",
          categoryId: "food",
          name: "감자튀김",
          description: "바삭한 감자튀김",
          price: "5000",
          isVisible: true,
        },
      ],
    };

    it("debounces a typed search into the URL and resets to page 1", async () => {
      vi.useFakeTimers();
      currentSearchParams = new URLSearchParams("page=3");
      mockBootstrap({ data: TWO_ITEM_FIXTURE });

      render(<MenuManagementPage />);

      fireEvent.change(screen.getByPlaceholderText("메뉴 이름, 설명으로 검색"), {
        target: { value: "라떼" },
      });
      expect(replaceMock).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      const [calledUrl] = replaceMock.mock.calls[0] as [string];
      const url = new URL(calledUrl, "http://localhost");
      expect(url.pathname).toBe("/menu");
      expect(url.searchParams.get("q")).toBe("라떼");
      expect(url.searchParams.has("page")).toBe(false);
      vi.useRealTimers();
    });

    it("shows only items matching a q param already in the URL, without touching the create form's category list", () => {
      currentSearchParams = new URLSearchParams("q=라떼");
      mockBootstrap({ data: TWO_ITEM_FIXTURE });

      render(<MenuManagementPage />);

      expect(screen.getByText("카페라떼")).toBeInTheDocument();
      expect(screen.queryByText("아메리카노")).not.toBeInTheDocument();
      // The create form's category <select> must still offer every
      // category regardless of the table's own search filter.
      expect(screen.getByText("음료")).toBeInTheDocument();
    });

    it("renders a category filter control in the toolbar, defaulting to every category", () => {
      mockBootstrap({ data: TWO_CATEGORY_FIXTURE });

      render(<MenuManagementPage />);

      // Both items show by default (no category filter applied yet). The
      // Select's own open/select interaction isn't exercised here — no
      // other filter Select in this suite is either, since this codebase's
      // custom (Base UI) Select popup isn't reliably driven via jsdom
      // `fireEvent`; behavior beyond the default state is a manual/E2E
      // concern instead.
      expect(screen.getByLabelText("카테고리")).toBeInTheDocument();
      expect(screen.getByText("아메리카노")).toBeInTheDocument();
      expect(screen.getByText("감자튀김")).toBeInTheDocument();
    });

    it("shows only items in the given category when a category param is already in the URL", () => {
      currentSearchParams = new URLSearchParams("category=food");
      mockBootstrap({ data: TWO_CATEGORY_FIXTURE });

      render(<MenuManagementPage />);

      expect(screen.getByText("감자튀김")).toBeInTheDocument();
      expect(screen.queryByText("아메리카노")).not.toBeInTheDocument();
    });

    it("shows every item, on one page, when there is no active search", () => {
      mockBootstrap({ data: TWO_ITEM_FIXTURE });

      render(<MenuManagementPage />);

      expect(screen.getByText("아메리카노")).toBeInTheDocument();
      expect(screen.getByText("카페라떼")).toBeInTheDocument();
      expect(screen.getByText("총 2건")).toBeInTheDocument();
    });

    it("shows the total count as 0 instead of hiding it when there are no items", () => {
      mockBootstrap({ data: { ...FIXTURE, items: [] } });

      render(<MenuManagementPage />);

      expect(screen.getByText("총 0건")).toBeInTheDocument();
    });

    it("keeps the total count out of the title row regardless of header action buttons", () => {
      render(<MenuManagementPage />);

      const heading = screen.getByRole("heading", { name: "메뉴 관리" });
      expect(within(heading.parentElement as HTMLElement).queryByText("총 1건")).not.toBeInTheDocument();
      expect(screen.getByText("총 1건")).toBeInTheDocument();
    });

    it("paginates when there are more items than one page, and navigates to page 2 via the URL", () => {
      const manyItems = Array.from({ length: 11 }, (_, index) => ({
        id: `menu-${index}`,
        categoryId: "drinks",
        name: `메뉴 ${String(index).padStart(2, "0")}`,
        description: "",
        price: "1000",
        isVisible: true,
      }));
      mockBootstrap({ data: { ...FIXTURE, items: manyItems } });

      render(<MenuManagementPage />);

      expect(screen.getByText("총 11건")).toBeInTheDocument();
      expect(screen.getByText("1 / 2")).toBeInTheDocument();
      expect(screen.getByText("메뉴 00")).toBeInTheDocument();
      expect(screen.queryByText("메뉴 10")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "다음" }));

      expect(replaceMock).toHaveBeenCalledWith("/menu?page=2");
    });

    it("renders page 2's items when a page param is already in the URL", () => {
      const manyItems = Array.from({ length: 11 }, (_, index) => ({
        id: `menu-${index}`,
        categoryId: "drinks",
        name: `메뉴 ${String(index).padStart(2, "0")}`,
        description: "",
        price: "1000",
        isVisible: true,
      }));
      currentSearchParams = new URLSearchParams("page=2");
      mockBootstrap({ data: { ...FIXTURE, items: manyItems } });

      render(<MenuManagementPage />);

      expect(screen.getByText("2 / 2")).toBeInTheDocument();
      expect(screen.getByText("메뉴 10")).toBeInTheDocument();
      expect(screen.queryByText("메뉴 00")).not.toBeInTheDocument();
    });

    it("requests 30 items per page via the URL after choosing the 30 page-size option", () => {
      const manyItems = Array.from({ length: 25 }, (_, index) => ({
        id: `menu-${index}`,
        categoryId: "drinks",
        name: `메뉴 ${String(index).padStart(2, "0")}`,
        description: "",
        price: "1000",
        isVisible: true,
      }));
      mockBootstrap({ data: { ...FIXTURE, items: manyItems } });

      render(<MenuManagementPage />);

      expect(screen.getByText("1 / 3")).toBeInTheDocument();

      fireEvent.change(screen.getByRole("combobox", { name: "페이지당 개수" }), {
        target: { value: "30" },
      });

      expect(replaceMock).toHaveBeenCalledWith("/menu?pageSize=30");
    });

    it("shows all 25 items on one page when a pageSize=30 param is already in the URL", () => {
      const manyItems = Array.from({ length: 25 }, (_, index) => ({
        id: `menu-${index}`,
        categoryId: "drinks",
        name: `메뉴 ${String(index).padStart(2, "0")}`,
        description: "",
        price: "1000",
        isVisible: true,
      }));
      currentSearchParams = new URLSearchParams("pageSize=30");
      mockBootstrap({ data: { ...FIXTURE, items: manyItems } });

      render(<MenuManagementPage />);

      expect(screen.getByText("1 / 1")).toBeInTheDocument();
      expect(screen.getByText("메뉴 00")).toBeInTheDocument();
      expect(screen.getByText("메뉴 24")).toBeInTheDocument();
    });
  });
});
