import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
}));

vi.mock(
  "next/link",
  () => ({
    default: ({
      href,
      children,
      ...props
    }: React.ComponentProps<"a"> & { href: string }) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  }),
);

import i18n from "@/i18n/client";

import { AdminShell } from "./AdminShell";

const NAV_LABELS = [
  "대시보드",
  "손님 요청",
  "노래 신청",
  "특별 요청",
  "메뉴 관리",
  "이벤트·공지",
  "안내 문구",
];

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

describe("AdminShell", () => {
  beforeEach(async () => {
    replaceMock.mockClear();
    refreshMock.mockClear();
    window.localStorage.clear();
    setViewportWidth(1024);
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    // The language menu test switches the shared i18next singleton to "en";
    // reset it before every test so test order can't leak locale state.
    await i18n.changeLanguage("ko");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders every primary navigation item as a reachable link", () => {
    render(
      <AdminShell>
        <p>page content</p>
      </AdminShell>,
    );

    for (const label of NAV_LABELS) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toBeInTheDocument();
      expect(link).not.toHaveAttribute("tabindex", "-1");
    }
  });

  it("renders the page content passed as children", () => {
    render(
      <AdminShell>
        <p>page content</p>
      </AdminShell>,
    );

    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("provides a keyboard-reachable skip link targeting the main content", () => {
    render(
      <AdminShell>
        <p>page content</p>
      </AdminShell>,
    );

    const skipLink = screen.getByRole("link", { name: "본문으로 바로가기" });
    expect(skipLink.tagName).toBe("A");
    expect(skipLink).toHaveAttribute("href", "#admin-main-content");

    const main = document.getElementById("admin-main-content");
    expect(main).not.toBeNull();
    expect(main?.tagName).toBe("MAIN");
  });

  it("opens the mobile navigation via a keyboard-operable trigger button", () => {
    setViewportWidth(375);

    render(
      <AdminShell>
        <p>page content</p>
      </AdminShell>,
    );

    // On narrow viewports the sidebar is not in the document until opened.
    expect(screen.queryByRole("link", { name: "대시보드" })).not.toBeInTheDocument();

    const trigger = screen.getByRole("button", { name: "메뉴 열기" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).not.toBeDisabled();

    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "대시보드" })).toBeInTheDocument();
  });

  it("exposes a keyboard-operable language menu that switches locale", () => {
    render(
      <AdminShell>
        <p>page content</p>
      </AdminShell>,
    );

    const languageSelect = screen.getByLabelText("언어") as HTMLSelectElement;
    expect(languageSelect.tagName).toBe("SELECT");

    fireEvent.change(languageSelect, { target: { value: "en" } });

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("exposes a keyboard-operable theme menu that switches theme", () => {
    render(
      <AdminShell>
        <p>page content</p>
      </AdminShell>,
    );

    const themeSelect = screen.getByLabelText("테마") as HTMLSelectElement;
    expect(themeSelect.tagName).toBe("SELECT");

    fireEvent.change(themeSelect, { target: { value: "dark" } });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("logs out via a keyboard-operable button and redirects to the login page", async () => {
    render(
      <AdminShell>
        <p>page content</p>
      </AdminShell>,
    );

    const logoutButton = screen.getByRole("button", { name: "로그아웃" });
    expect(logoutButton.tagName).toBe("BUTTON");

    fireEvent.click(logoutButton);

    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/admin-logout",
        expect.objectContaining({ method: "POST" }),
      );
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });
});
