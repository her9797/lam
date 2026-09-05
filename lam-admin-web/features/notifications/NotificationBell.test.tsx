import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RequestNotification } from "./model";

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

function mockNotifications(notifications: RequestNotification[]) {
  useRequestNotificationsMock.mockReturnValue({
    notifications,
    count: notifications.length,
    isLoading: false,
    isError: false,
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

  it("clicking a song notification marks it checked and navigates to /song-requests", () => {
    mockNotifications(NOTIFICATIONS);
    render(<NotificationBell />);

    fireEvent.click(screen.getByRole("button", { name: /아무 노래/ }));

    expect(singleMutateMock).toHaveBeenCalledWith({ id: "r2", status: "checked" });
    expect(pushMock).toHaveBeenCalledWith("/song-requests");
  });

  it("'모두 확인' asks for confirmation before bulk-checking every pending id", async () => {
    mockNotifications(NOTIFICATIONS);
    render(<NotificationBell />);

    fireEvent.click(screen.getByRole("button", { name: "모두 확인" }));
    expect(bulkMutateMock).not.toHaveBeenCalled();

    expect(await screen.findByText("모두 확인 처리할까요?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    expect(bulkMutateMock).toHaveBeenCalledWith({ ids: ["r1", "r2"], status: "checked" });
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
