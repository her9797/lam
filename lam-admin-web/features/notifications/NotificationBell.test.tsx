import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OrderNotification, RequestNotification } from "./model";

// The real `DropdownMenu` is a `@base-ui/react` menu built on floating-ui
// anchor positioning. Actually opening it triggers floating-ui's
// positioning/observer machinery, which jsdom's zero-size mock layout
// cannot satisfy and hangs the test worker indefinitely — see the same
// finding already documented in `features/settings/ThemeMenu.test.tsx`
// (verified again directly against the raw primitive while building this
// component). So, like that file, this replaces only the open/close/
// positioning chrome with plain always-rendered elements and keeps
// `NotificationBell`'s own real wiring under test. Real interaction
// (opening via click, closing on selection, positioning) is left to the
// Playwright e2e suite.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children?: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children, ...props }: ComponentProps<"button">) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  DropdownMenuContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const useRequestNotificationsMock = vi.fn();
vi.mock("./useRequestNotifications", () => ({
  useRequestNotifications: () => useRequestNotificationsMock(),
}));

// Covered on its own in useRequestBroadcast.test.tsx (Supabase client
// subscription, cache invalidation, cleanup) — mocked here as a no-op so
// this file doesn't need a real QueryClientProvider just to satisfy its
// internal useQueryClient() call.
vi.mock("./useRequestBroadcast", () => ({
  useRequestBroadcast: () => {},
}));

const useOrderNotificationsMock = vi.fn();
vi.mock("./useOrderNotifications", () => ({
  useOrderNotifications: () => useOrderNotificationsMock(),
}));

// Same reasoning as useRequestBroadcast above — covered on its own in
// useOrderBroadcast.test.tsx.
vi.mock("./useOrderBroadcast", () => ({
  useOrderBroadcast: () => {},
}));

const toastAddMock = vi.fn();
vi.mock("@/components/ui/toast", () => ({
  toast: { add: (...args: unknown[]) => toastAddMock(...args) },
}));

const playChimeMock = vi.fn();
const enableSoundMock = vi.fn();
const toggleMutedMock = vi.fn();
const useNotificationSoundMock = vi.fn();
vi.mock("./useNotificationSound", () => ({
  useNotificationSound: () => useNotificationSoundMock(),
}));

const singleMutateMock = vi.fn();
const bulkMutateMock = vi.fn();
vi.mock("@/features/requests/queries", () => ({
  useUpdateCustomerRequestStatusMutation: () => ({
    mutate: singleMutateMock,
    isPending: false,
    variables: undefined,
  }),
  useUpdateCustomerRequestStatusesMutation: () => ({
    mutate: bulkMutateMock,
    isPending: false,
  }),
}));

import "@/i18n/client";

import { NotificationBell } from "./NotificationBell";

const R1: RequestNotification = {
  id: "r1",
  kind: "general",
  tableNumber: "3",
  preview: "물 좀 주세요",
  createdAt: "2026-09-04T10:05:00Z",
};
const R2: RequestNotification = {
  id: "r2",
  kind: "song",
  tableNumber: "5",
  preview: "아무 노래",
  createdAt: "2026-09-04T10:01:00Z",
};
const NOTIFICATIONS: RequestNotification[] = [R1, R2];

const O1: OrderNotification = {
  id: "o1",
  tableNumber: "7",
  menuItemName: "하우스 하이볼",
  amount: 10000,
  approvedAt: "2026-09-04T10:00:30Z",
};
const O2: OrderNotification = {
  id: "o2",
  tableNumber: "2",
  menuItemName: "진토닉",
  amount: 9000,
  approvedAt: "2026-09-04T10:02:00Z",
};

function mockNotifications(notifications: RequestNotification[]) {
  useRequestNotificationsMock.mockReturnValue({
    notifications,
    count: notifications.length,
    isLoading: false,
    isError: false,
  });
}

const dismissOrderMock = vi.fn();
function mockOrderNotifications(notifications: OrderNotification[]) {
  useOrderNotificationsMock.mockReturnValue({
    notifications,
    count: notifications.length,
    isLoading: false,
    dismiss: dismissOrderMock,
  });
}

function mockSound(overrides: Partial<ReturnType<typeof useNotificationSoundMock>> = {}) {
  useNotificationSoundMock.mockReturnValue({
    isBlocked: false,
    isMuted: false,
    toggleMuted: toggleMutedMock,
    enableSound: enableSoundMock,
    playChime: playChimeMock,
    ...overrides,
  });
}

describe("NotificationBell", () => {
  beforeEach(() => {
    mockSound();
    mockOrderNotifications([]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the pending count as a badge and in the trigger's accessible name", () => {
    mockNotifications(NOTIFICATIONS);
    render(<NotificationBell />);

    expect(screen.getByRole("button", { name: /2/ })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows no numeric badge when there is nothing pending", () => {
    mockNotifications([]);
    render(<NotificationBell />);

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows the empty state when nothing is pending", () => {
    mockNotifications([]);
    render(<NotificationBell />);

    expect(screen.getByText("확인하지 않은 요청이 없습니다.")).toBeInTheDocument();
  });

  it("clicking a general notification marks it checked and navigates to /requests", () => {
    mockNotifications(NOTIFICATIONS);
    render(<NotificationBell />);

    fireEvent.click(screen.getByRole("button", { name: /물 좀 주세요/ }));

    expect(singleMutateMock).toHaveBeenCalledWith({ id: "r1", status: "checked" });
    expect(pushMock).toHaveBeenCalledWith("/requests");
  });

  it("clicking a song notification keeps it pending and navigates to explicit approval", () => {
    mockNotifications(NOTIFICATIONS);
    render(<NotificationBell />);

    fireEvent.click(screen.getByRole("button", { name: /아무 노래/ }));

    expect(singleMutateMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/song-requests");
  });

  it("'모두 확인' asks for confirmation and bulk-checks only general requests", async () => {
    mockNotifications(NOTIFICATIONS);
    render(<NotificationBell />);

    fireEvent.click(screen.getByRole("button", { name: "모두 확인" }));
    expect(bulkMutateMock).not.toHaveBeenCalled();

    expect(await screen.findByText("모두 확인 처리할까요?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    expect(bulkMutateMock).toHaveBeenCalledWith({ ids: ["r1"], status: "checked" });
  });

  it("does not show the bulk-check action when only song approvals are pending", () => {
    mockNotifications([R2]);
    render(<NotificationBell />);

    expect(screen.queryByRole("button", { name: "모두 확인" })).not.toBeInTheDocument();
  });

  it("shows an error message when the notifications query fails", () => {
    useRequestNotificationsMock.mockReturnValue({
      notifications: [],
      count: 0,
      isLoading: false,
      isError: true,
    });
    render(<NotificationBell />);

    expect(screen.getByRole("alert")).toHaveTextContent("알림을 불러오지 못했습니다.");
  });

  it("toasts once when a new request arrives after the initial load, but not for the initial baseline", () => {
    mockNotifications([R1]);
    const { rerender } = render(<NotificationBell />);
    expect(toastAddMock).not.toHaveBeenCalled();

    mockNotifications([R1, R2]);
    rerender(<NotificationBell />);

    expect(toastAddMock).toHaveBeenCalledTimes(1);
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: "5번 테이블 노래 신청: 아무 노래" }),
    );
  });

  it("does not toast again on a re-render that reports the same data", () => {
    mockNotifications([R1]);
    const { rerender } = render(<NotificationBell />);

    mockNotifications([R1, R2]);
    rerender(<NotificationBell />);
    expect(toastAddMock).toHaveBeenCalledTimes(1);

    rerender(<NotificationBell />);

    expect(toastAddMock).toHaveBeenCalledTimes(1);
  });

  it("plays the chime once per arrival batch, even when several requests arrive together", () => {
    mockNotifications([R1]);
    const { rerender } = render(<NotificationBell />);
    expect(playChimeMock).not.toHaveBeenCalled();

    mockNotifications([R1, R2]);
    rerender(<NotificationBell />);

    expect(playChimeMock).toHaveBeenCalledTimes(1);
  });

  it("toasts and chimes once when a payment completes after the initial load", () => {
    mockNotifications([]);
    mockOrderNotifications([O1]);
    const { rerender } = render(<NotificationBell />);
    expect(toastAddMock).not.toHaveBeenCalled();
    expect(playChimeMock).not.toHaveBeenCalled();

    mockOrderNotifications([O2, O1]);
    rerender(<NotificationBell />);

    expect(toastAddMock).toHaveBeenCalledTimes(1);
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "새 주문이 들어왔습니다.",
        description: "2번 테이블 · 진토닉 · ₩9,000",
      }),
    );
    expect(playChimeMock).toHaveBeenCalledTimes(1);
  });

  it("does not toast for the paid orders already present on the initial load", () => {
    mockNotifications([]);
    mockOrderNotifications([O1, O2]);
    const { rerender } = render(<NotificationBell />);

    rerender(<NotificationBell />);

    expect(toastAddMock).not.toHaveBeenCalled();
  });

  it("lists undismissed orders in the panel and folds them into the bell badge", () => {
    mockNotifications([]);
    mockOrderNotifications([O1, O2]);
    render(<NotificationBell />);

    // The guest-request list body is still empty on its own (no pending
    // requests), but the bell's badge/accessible name count now includes
    // the two undismissed orders — an order the operator hasn't dismissed
    // is exactly as "unread" as a request they haven't checked.
    expect(screen.getByText("확인하지 않은 요청이 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "새 알림 2건" })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    expect(screen.getByText("새 주문 알림")).toBeInTheDocument();
    expect(screen.getByText("7 · 하우스 하이볼 · ₩10,000")).toBeInTheDocument();
    expect(screen.getByText("2 · 진토닉 · ₩9,000")).toBeInTheDocument();
  });

  it("hides the new-order section when there are no undismissed orders", () => {
    mockNotifications([]);
    mockOrderNotifications([]);
    render(<NotificationBell />);

    expect(screen.queryByText("새 주문 알림")).not.toBeInTheDocument();
  });

  it("adds the guest-request and order counts together on the badge", () => {
    mockNotifications(NOTIFICATIONS);
    mockOrderNotifications([O1]);
    render(<NotificationBell />);

    expect(screen.getByRole("button", { name: "새 알림 3건" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("clicking an order in the panel dismisses it and navigates to /orders, without touching request mutations", () => {
    mockNotifications([]);
    mockOrderNotifications([O1]);
    render(<NotificationBell />);

    fireEvent.click(screen.getByText("7 · 하우스 하이볼 · ₩10,000"));

    expect(dismissOrderMock).toHaveBeenCalledWith("o1");
    expect(pushMock).toHaveBeenCalledWith("/orders");
    expect(singleMutateMock).not.toHaveBeenCalled();
    expect(bulkMutateMock).not.toHaveBeenCalled();
  });

  it("shows a 'sound blocked' button that resumes audio on click", () => {
    mockNotifications([]);
    mockSound({ isBlocked: true });
    render(<NotificationBell />);

    fireEvent.click(screen.getByRole("button", { name: "알림음이 꺼져 있습니다. 눌러서 켜기" }));

    expect(enableSoundMock).toHaveBeenCalled();
  });

  it("shows a mute toggle when sound is enabled and unmuted", () => {
    mockNotifications([]);
    mockSound({ isBlocked: false, isMuted: false });
    render(<NotificationBell />);

    fireEvent.click(screen.getByRole("button", { name: "알림음 끄기" }));

    expect(toggleMutedMock).toHaveBeenCalled();
  });

  it("shows an unmute toggle when sound is muted", () => {
    mockNotifications([]);
    mockSound({ isBlocked: false, isMuted: true });
    render(<NotificationBell />);

    expect(screen.getByRole("button", { name: "알림음 켜기" })).toBeInTheDocument();
  });
});
