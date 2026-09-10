import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppData } from "@/features/bootstrap/model";
import type { MenuItemRecipe } from "./model";

const useBootstrapQueryMock = vi.fn();

vi.mock("@/features/bootstrap/queries", () => ({
  useBootstrapQuery: () => useBootstrapQueryMock(),
}));

const useMenuItemRecipeQueryMock = vi.fn();
const updateMenuItemRecipeMutate = vi.fn();

function idleMutation(mutate: ReturnType<typeof vi.fn>) {
  return { mutate, isPending: false, isError: false, error: null as unknown };
}

const updateMenuItemRecipeMutationState = { current: idleMutation(updateMenuItemRecipeMutate) };

vi.mock("./queries", () => ({
  useMenuItemRecipeQuery: (id: string) => useMenuItemRecipeQueryMock(id),
  useUpdateMenuItemRecipeMutation: () => updateMenuItemRecipeMutationState.current,
}));

import { MenuItemDetailPage } from "./MenuItemDetailPage";

const FIXTURE: AppData = {
  store: { name: "가게", subtitle: "", address: "", songRequestCopy: "", requestCopy: "", eventCopy: "" },
  categories: [{ id: "food", label: "안주", isVisible: true }],
  items: [
    {
      id: "menu-1",
      categoryId: "food",
      name: "감자튀김",
      description: "바삭한 감자튀김",
      price: "5000",
      isVisible: true,
    },
  ],
  requestGuides: [],
  notices: [],
};

const RECIPE_FIXTURE: MenuItemRecipe = {
  menuItemId: "menu-1",
  ingredients: "감자 200g, 소금",
  instructions: "180도에서 5분 튀긴다",
};

const bootstrapRefetchMock = vi.fn();
const recipeRefetchMock = vi.fn();

function defaultBootstrapResult() {
  return { data: FIXTURE, isLoading: false, isError: false, error: null as unknown, refetch: bootstrapRefetchMock };
}

function defaultRecipeResult() {
  return {
    data: RECIPE_FIXTURE,
    isLoading: false,
    isError: false,
    error: null as unknown,
    refetch: recipeRefetchMock,
  };
}

function mockBootstrap(overrides: Partial<ReturnType<typeof defaultBootstrapResult>> = {}) {
  useBootstrapQueryMock.mockReturnValue({ ...defaultBootstrapResult(), ...overrides });
}

function mockRecipe(overrides: Partial<ReturnType<typeof defaultRecipeResult>> = {}) {
  useMenuItemRecipeQueryMock.mockReturnValue({ ...defaultRecipeResult(), ...overrides });
}

beforeEach(() => {
  updateMenuItemRecipeMutate.mockClear();
  bootstrapRefetchMock.mockClear();
  recipeRefetchMock.mockClear();
  updateMenuItemRecipeMutationState.current = idleMutation(updateMenuItemRecipeMutate);
  mockBootstrap();
  mockRecipe();
});

afterEach(() => {
  cleanup();
});

describe("MenuItemDetailPage", () => {
  it("shows a loading state while bootstrap data is loading", () => {
    mockBootstrap({ data: undefined, isLoading: true });

    render(<MenuItemDetailPage menuItemId="menu-1" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows an error state with a working retry action when bootstrap fails", () => {
    mockBootstrap({ data: undefined, isError: true, error: new Error("요청이 실패했습니다. (500)") });

    render(<MenuItemDetailPage menuItemId="menu-1" />);

    expect(screen.getByRole("alert")).toHaveTextContent("요청이 실패했습니다. (500)");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(bootstrapRefetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a not-found state when no item matches the id", () => {
    render(<MenuItemDetailPage menuItemId="does-not-exist" />);

    expect(screen.getByText("메뉴를 찾을 수 없습니다.")).toBeInTheDocument();
  });

  it("shows the item's read-only basic info", () => {
    render(<MenuItemDetailPage menuItemId="menu-1" />);

    expect(screen.getByText("감자튀김")).toBeInTheDocument();
    expect(screen.getByText("안주")).toBeInTheDocument();
    expect(screen.getByText("5000")).toBeInTheDocument();
    expect(screen.getByText("바삭한 감자튀김")).toBeInTheDocument();
  });

  it("shows a loading state while the recipe is loading", () => {
    mockRecipe({ data: undefined, isLoading: true });

    render(<MenuItemDetailPage menuItemId="menu-1" />);

    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });

  it("shows an error state with a working retry action when the recipe fails to load", () => {
    mockRecipe({ data: undefined, isError: true, error: new Error("레시피 오류") });

    render(<MenuItemDetailPage menuItemId="menu-1" />);

    expect(screen.getByRole("alert")).toHaveTextContent("레시피 오류");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(recipeRefetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the loaded recipe's ingredients and instructions", () => {
    render(<MenuItemDetailPage menuItemId="menu-1" />);

    expect(screen.getByLabelText("재료")).toHaveValue("감자 200g, 소금");
    expect(screen.getByLabelText("조리법")).toHaveValue("180도에서 5분 튀긴다");
  });

  it("saves edited ingredients and instructions", () => {
    render(<MenuItemDetailPage menuItemId="menu-1" />);

    fireEvent.change(screen.getByLabelText("재료"), { target: { value: "새 재료" } });
    fireEvent.change(screen.getByLabelText("조리법"), { target: { value: "새 조리법" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(updateMenuItemRecipeMutate).toHaveBeenCalledWith(
      { ingredients: "새 재료", instructions: "새 조리법" },
      expect.anything(),
    );
  });

  it("shows a success message once the save succeeds", () => {
    render(<MenuItemDetailPage menuItemId="menu-1" />);

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    const onSuccess = updateMenuItemRecipeMutate.mock.calls[0][1].onSuccess as (
      recipe: MenuItemRecipe,
    ) => void;
    act(() => onSuccess(RECIPE_FIXTURE));

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("disables the save button while the mutation is pending", () => {
    updateMenuItemRecipeMutationState.current = { ...idleMutation(updateMenuItemRecipeMutate), isPending: true };

    render(<MenuItemDetailPage menuItemId="menu-1" />);

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });
});
