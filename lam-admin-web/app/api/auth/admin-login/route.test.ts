import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { isAdminSessionValid } from "@/lib/auth/session";

import { POST } from "./route";

function loginRequest(password: unknown) {
  return new NextRequest("http://localhost/api/auth/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

describe("POST /api/auth/admin-login", () => {
  it("returns 401 for an incorrect password", async () => {
    const response = await POST(loginRequest("wrong-password"));

    expect(response.status).toBe(401);
    expect(response.cookies.get("lam_admin_session")).toBeUndefined();
  });

  it("sets an HttpOnly, SameSite=Lax session cookie for the correct password", async () => {
    const response = await POST(loginRequest(process.env.ADMIN_PASSWORD));

    expect(response.status).toBe(200);

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("lam_admin_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");

    const cookie = response.cookies.get("lam_admin_session");
    expect(cookie).toBeDefined();
    expect(isAdminSessionValid(cookie?.value)).toBe(true);
  });
});
