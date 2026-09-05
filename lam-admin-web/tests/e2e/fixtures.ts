import { expect, type Page } from "@playwright/test";

import type { AppData } from "@/features/bootstrap/model";
import type { CustomerRequest } from "@/features/requests/model";
import type { SpecialRequest } from "@/features/special-requests/model";

/**
 * Matches this suite's Playwright `webServer.env` (`playwright.config.ts`)
 * and the Vitest test env (`vitest.config.ts`) — the real
 * `/api/auth/admin-login` route runs for real in every test here (it never
 * calls `lam-api`, so it needs no mocking) and accepts this value.
 */
export const ADMIN_PASSWORD = "test-admin-password";

/**
 * Fresh `AppData` each call — field names/shapes match the fixture already
 * verified against `lam-api` in `features/bootstrap/api.test.ts` and reused
 * by `features/menu/MenuManagementPage.test.tsx` /
 * `features/notices/NoticeManagementPage.test.tsx`. Callers must not share
 * one mutable object across tests/routes — construct a new one (or pass
 * `overrides`) per test.
 */
export function buildAppData(overrides: Partial<AppData> = {}): AppData {
  return {
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
    notices: [
      { id: "notice-1", text: "매주 수요일 하이볼 1,000원 할인", isVisible: true },
    ],
    ...overrides,
  };
}

/**
 * Fresh `CustomerRequest[]` each call — shape matches
 * `features/requests/RequestListPage.test.tsx`'s fixture. `r1` is a general
 * request, `r2` a song request (the `[노래 신청]` prefix convention).
 */
export function buildCustomerRequests(): CustomerRequest[] {
  return [
    {
      id: "r1",
      tableNumber: "1",
      text: "물 좀 주세요",
      status: "pending",
      createdAt: "2026-09-03T10:00:00Z",
    },
    {
      id: "r2",
      tableNumber: "2",
      text: "[노래 신청] Dynamite - BTS",
      status: "pending",
      createdAt: "2026-09-03T10:05:00Z",
    },
  ];
}

/**
 * Fresh `SpecialRequest[]` each call — shape matches
 * `features/special-requests/SpecialRequestPage.test.tsx`'s fixture.
 */
export function buildSpecialRequests(): SpecialRequest[] {
  return [
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
}

/** Mocks the bootstrap BFF route (`GET /api/bootstrap`). */
export async function mockBootstrap(page: Page, appData: AppData): Promise<void> {
  await page.route("**/api/bootstrap", async (route) => {
    await route.fulfill({ json: appData });
  });
}

/** Mocks the general/song request list route (`GET /api/admin/customer-requests`). */
export async function mockCustomerRequestsList(
  page: Page,
  requests: CustomerRequest[],
): Promise<void> {
  await page.route("**/api/admin/customer-requests", async (route) => {
    await route.fulfill({ json: requests });
  });
}

/**
 * Mocks a status-change PATCH (`PATCH /api/admin/customer-requests/{id}/status`),
 * which per `features/requests/api.ts` returns the full refreshed list.
 */
export async function mockCustomerRequestStatusUpdate(
  page: Page,
  refreshedRequests: CustomerRequest[],
): Promise<void> {
  await page.route("**/api/admin/customer-requests/*/status", async (route) => {
    await route.fulfill({ json: refreshedRequests });
  });
}

/**
 * Mocks the bulk status-change PATCH (`PATCH /api/admin/customer-requests`,
 * the collection path — see `docs/plans/2026-09-04-admin-request-notifications.md`
 * section 4.5), which returns the full refreshed list, same as the
 * single-id PATCH above. This shares its URL with `mockCustomerRequestsList`
 * (`GET` on the same path), so it must be registered *after* that call in a
 * test: Playwright matches routes most-recently-registered-first, and
 * `route.fallback()` on a non-`PATCH` request here defers to the
 * previously-registered `GET` handler underneath it.
 */
export async function mockCustomerRequestsBulkStatusUpdate(
  page: Page,
  refreshedRequests: CustomerRequest[],
): Promise<void> {
  await page.route("**/api/admin/customer-requests", async (route) => {
    if (route.request().method() !== "PATCH") {
      await route.fallback();
      return;
    }
    await route.fulfill({ json: refreshedRequests });
  });
}

/** Mocks the special request list route (`GET /api/admin/special-requests`). */
export async function mockSpecialRequestsList(
  page: Page,
  requests: SpecialRequest[],
): Promise<void> {
  await page.route("**/api/admin/special-requests", async (route) => {
    await route.fulfill({ json: requests });
  });
}

/**
 * Mocks a delete (`DELETE /api/admin/special-requests/{id}`), which per
 * `features/special-requests/api.ts` returns the full refreshed list.
 */
export async function mockSpecialRequestDelete(
  page: Page,
  refreshedRequests: SpecialRequest[],
): Promise<void> {
  await page.route("**/api/admin/special-requests/*", async (route) => {
    await route.fulfill({ json: refreshedRequests });
  });
}

/**
 * Mocks menu item creation (`POST /api/admin/menu-items`), which per
 * `features/menu/api.ts` returns the full refreshed `AppData` tree.
 */
export async function mockCreateMenuItem(page: Page, refreshedAppData: AppData): Promise<void> {
  await page.route("**/api/admin/menu-items", async (route) => {
    await route.fulfill({ json: refreshedAppData });
  });
}

/**
 * Mocks notice creation (`POST /api/admin/notices`), which per
 * `features/notices/api.ts` returns the full refreshed `AppData` tree.
 */
export async function mockCreateNotice(page: Page, refreshedAppData: AppData): Promise<void> {
  await page.route("**/api/admin/notices", async (route) => {
    await route.fulfill({ json: refreshedAppData });
  });
}

/**
 * Mocks every query the dashboard route needs (bootstrap, customer
 * requests, special requests) with fresh default fixtures unless
 * `overrides` supplies its own — call this before `loginAsAdmin` in any
 * test whose flow passes through `/dashboard`, so that transient landing
 * on it after login never hits the real (deliberately unreachable)
 * `lam-api` origin.
 */
export async function mockDashboardData(
  page: Page,
  overrides: {
    appData?: AppData;
    requests?: CustomerRequest[];
    specialRequests?: SpecialRequest[];
  } = {},
): Promise<void> {
  await mockBootstrap(page, overrides.appData ?? buildAppData());
  await mockCustomerRequestsList(page, overrides.requests ?? buildCustomerRequests());
  await mockSpecialRequestsList(page, overrides.specialRequests ?? buildSpecialRequests());
}

/**
 * Logs in through the real `/api/auth/admin-login` route (never mocked —
 * see `ADMIN_PASSWORD`'s doc comment) and waits for the redirect to
 * `/dashboard`. Callers must mock the dashboard's own data (e.g. via
 * `mockDashboardData`) beforehand if they want the landing render to
 * succeed rather than show an error state.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("비밀번호").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
