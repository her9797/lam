import { describe, expect, it } from "vitest";

import { defaultDateRange, resolveDateRange } from "./date-range";

describe("resolveDateRange", () => {
  it("converts a date-only [from, to] pair to an absolute [from, to) instant range covering the whole `to` day", () => {
    const result = resolveDateRange("2026-01-01", "2026-01-31");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.from).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
    // Exclusive upper bound: midnight of the day *after* `to`, so every
    // order placed on 2026-01-31 itself is still included.
    expect(result.to).toEqual(new Date(2026, 1, 1, 0, 0, 0, 0));
  });

  it("rejects a blank from or to", () => {
    expect(resolveDateRange("", "2026-01-31").ok).toBe(false);
    expect(resolveDateRange("2026-01-01", "").ok).toBe(false);
  });

  it("rejects an unparseable date", () => {
    expect(resolveDateRange("not-a-date", "2026-01-31").ok).toBe(false);
  });

  it("rejects from strictly after to", () => {
    expect(resolveDateRange("2026-02-01", "2026-01-01").ok).toBe(false);
  });

  it("accepts from equal to to (a single day)", () => {
    const result = resolveDateRange("2026-01-15", "2026-01-15");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.from).toEqual(new Date(2026, 0, 15, 0, 0, 0, 0));
    expect(result.to).toEqual(new Date(2026, 0, 16, 0, 0, 0, 0));
  });
});

describe("defaultDateRange", () => {
  it("spans the 30 days up to and including the reference date", () => {
    const range = defaultDateRange(new Date(2026, 0, 31, 15, 0, 0, 0));
    expect(range.from).toBe("2026-01-01");
    expect(range.to).toBe("2026-01-31");
  });
});
