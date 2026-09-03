import { describe, expect, it } from "vitest";

import { createAdminSessionValue, isAdminSessionValid } from "./session";

describe("admin session", () => {
  it("accepts a freshly created session value", () => {
    const now = new Date("2026-09-03T00:00:00.000Z");
    const value = createAdminSessionValue(now);

    expect(isAdminSessionValid(value, now)).toBe(true);
  });

  it("rejects a tampered session value", () => {
    const now = new Date("2026-09-03T00:00:00.000Z");
    const value = createAdminSessionValue(now);

    expect(isAdminSessionValid(`${value}tampered`, now)).toBe(false);
  });

  it("rejects an expired session value", () => {
    const now = new Date("2026-09-03T00:00:00.000Z");
    const value = createAdminSessionValue(now);

    expect(
      isAdminSessionValid(
        value,
        new Date(now.getTime() + 12 * 60 * 60 * 1000 + 1),
      ),
    ).toBe(false);
  });

  it("rejects a missing session value", () => {
    expect(isAdminSessionValid(undefined)).toBe(false);
  });

  it("rejects a malformed session value", () => {
    expect(isAdminSessionValid("not-a-valid-session")).toBe(false);
  });
});
