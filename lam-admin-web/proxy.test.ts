import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { createAdminSessionValue, getAdminCookieName } from "@/lib/auth/session";

import { config, proxy } from "./proxy";

function requestFor(pathname: string, cookieValue?: string): NextRequest {
  const request = new NextRequest(`http://localhost:3001${pathname}`);
  if (cookieValue !== undefined) {
    request.cookies.set(getAdminCookieName(), cookieValue);
  }
  return request;
}

const ADMIN_PATHS = [
  "/dashboard",
  "/requests",
  "/song-requests",
  "/special-requests",
  "/menu",
  "/notices",
  "/store-copy",
];

describe("proxy admin session gate", () => {
  it("redirects an anonymous visitor to /login on every admin route", () => {
    for (const pathname of ADMIN_PATHS) {
      const response = proxy(requestFor(pathname));
      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/login");
    }
  });

  it("redirects a visitor whose session cookie is malformed", () => {
    const response = proxy(requestFor("/dashboard", "not-a-real-session"));
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/login");
  });

  it("redirects a visitor whose session signature does not verify", () => {
    const valid = createAdminSessionValue();
    const tampered = `${valid.slice(0, -1)}${valid.endsWith("0") ? "1" : "0"}`;
    const response = proxy(requestFor("/dashboard", tampered));
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/login");
  });

  it("redirects a visitor whose session has expired", () => {
    const expired = createAdminSessionValue(new Date(Date.now() - 1000 * 60 * 60 * 24));
    const response = proxy(requestFor("/dashboard", expired));
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/login");
  });

  it("lets a valid session through without redirecting", () => {
    const response = proxy(requestFor("/dashboard", createAdminSessionValue()));
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });

  it("matches every admin route group directory and nothing else", () => {
    // `/login` and `/api/*` must stay outside the matcher: the login page has
    // to be reachable anonymously, and the BFF routes do their own auth.
    expect(config.matcher).toEqual([
      "/dashboard/:path*",
      "/requests/:path*",
      "/song-requests/:path*",
      "/special-requests/:path*",
      "/menu/:path*",
      "/notices/:path*",
      "/store-copy/:path*",
    ]);
    expect(config.matcher.some((pattern) => pattern.startsWith("/login"))).toBe(false);
    expect(config.matcher.some((pattern) => pattern.startsWith("/api"))).toBe(false);
  });
});
