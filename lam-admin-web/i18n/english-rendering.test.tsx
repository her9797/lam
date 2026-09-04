import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import i18n from "./client";

/**
 * Proves the English locale reaches feature pages, not just the app shell —
 * the thing the whole-branch review found missing. `settings.spec.ts` (E2E)
 * covers the switcher and the sidebar; this covers a full page's own copy,
 * including a validation-style message and a locale-formatted timestamp.
 */

const useCustomerRequestsQueryMock = vi.fn();
const useUpdateCustomerRequestStatusMutationMock = vi.fn();

vi.mock("@/features/requests/queries", () => ({
  useCustomerRequestsQuery: () => useCustomerRequestsQueryMock(),
  useUpdateCustomerRequestStatusMutation: () => useUpdateCustomerRequestStatusMutationMock(),
}));

const useBootstrapQueryMock = vi.fn();

vi.mock("@/features/bootstrap/queries", () => ({
  useBootstrapQuery: () => useBootstrapQueryMock(),
  bootstrapKeys: { all: ["bootstrap"] },
}));

// Stubbed so these pages can render without a QueryClientProvider — this
// file is about rendered copy, not data flow.
vi.mock("@/features/store-copy/api", () => ({
  useUpdateStoreCopiesMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import { RequestListPage } from "@/features/requests/RequestListPage";
import { StoreCopyPage } from "@/features/store-copy/StoreCopyPage";

beforeAll(async () => {
  await act(async () => {
    await i18n.changeLanguage("en");
  });
});

afterEach(() => {
  cleanup();
});

describe("feature pages in English", () => {
  it("renders the guest-request list entirely in English", () => {
    useCustomerRequestsQueryMock.mockReturnValue({
      data: [
        {
          id: "r1",
          tableNumber: "4",
          text: "More water please",
          status: "pending",
          createdAt: "2026-09-03T10:00:00Z",
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useUpdateCustomerRequestStatusMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      variables: undefined,
    });

    render(<RequestListPage kind="general" />);

    expect(screen.getByRole("heading", { name: "Guest requests" })).toBeInTheDocument();
    const headerRow = screen.getAllByRole("row")[0];
    expect(within(headerRow).getByText("Received")).toBeInTheDocument();
    expect(within(headerRow).getByText("Table")).toBeInTheDocument();
    expect(within(headerRow).getByText("Message")).toBeInTheDocument();
    expect(within(headerRow).getByText("Status")).toBeInTheDocument();
    expect(within(headerRow).getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark checked" })).toBeInTheDocument();

    // Nothing Korean is left anywhere in the rendered page.
    expect(document.body.textContent ?? "").not.toMatch(/[가-힣]/);
  });

  it("formats timestamps with the English locale, not ko-KR", () => {
    useCustomerRequestsQueryMock.mockReturnValue({
      data: [
        {
          id: "r1",
          tableNumber: "4",
          text: "More water please",
          status: "completed",
          createdAt: "2026-09-03T10:00:00Z",
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useUpdateCustomerRequestStatusMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      variables: undefined,
    });

    render(<RequestListPage kind="general" />);

    // ko-KR renders "09. 03. 19:00"; en-US renders "09/03, 19:00". The exact
    // separators are the ICU data's business — the assertion is only that the
    // two locales differ and English is the one in use.
    const cell = screen.getAllByRole("cell")[0];
    expect(cell.textContent).toContain("/");
    expect(cell.textContent).not.toContain(". ");
  });

  it("renders the guide-text page's loading state in English", () => {
    useBootstrapQueryMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<StoreCopyPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading guide text");
  });

  it("renders the guide-text page's error state in English", () => {
    useBootstrapQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("boom"),
      refetch: vi.fn(),
    });

    render(<StoreCopyPage />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Could not load the guide text.");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
