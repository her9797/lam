import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement these; shadcn's base-ui primitives (Sidebar's
// mobile Sheet, dialogs, etc.) reference them defensively, and the theme
// system reads `matchMedia` directly to resolve `system` theme / subscribe
// to OS scheme changes.
if (typeof window !== "undefined") {
  if (!window.localStorage) {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, String(value)),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
        key: (index: number) => [...values.keys()][index] ?? null,
        get length() {
          return values.size;
        },
      } satisfies Storage,
    });
  }

  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
  }

  if (!window.ResizeObserver) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }

  // jsdom reports "en-US" by default. This app's fallback/browser-detected
  // language matters for component tests (react-i18next), so pin the test
  // environment's navigator language to Korean — this MVP's primary and
  // fallback locale — instead of letting an incidental jsdom default decide
  // which language components render in.
  Object.defineProperty(window.navigator, "language", {
    value: "ko-KR",
    configurable: true,
  });
  Object.defineProperty(window.navigator, "languages", {
    value: ["ko-KR", "ko"],
    configurable: true,
  });
}
