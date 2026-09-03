import { describe, expect, it } from "vitest";

import { en, ko } from "./resources";

describe("i18n resources", () => {
  it("keeps Korean and English common keys in sync", () => {
    expect(Object.keys(ko.common).sort()).toEqual(Object.keys(en.common).sort());
  });

  it("keeps the same top-level namespaces for both locales", () => {
    expect(Object.keys(ko).sort()).toEqual(Object.keys(en).sort());
  });

  it("has non-empty string values for every common key", () => {
    for (const value of Object.values(ko.common)) {
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    }
    for (const value of Object.values(en.common)) {
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    }
  });
});
