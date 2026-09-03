import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import { en, ko } from "./resources";

export const LOCALE_STORAGE_KEY = "lam-admin.locale";

const isBrowser = typeof window !== "undefined";

if (!i18n.isInitialized) {
  // The browser language detector reads `navigator`/`localStorage` when it
  // actually runs detection, which only happens during `init()`. It's safe
  // to import unconditionally, but we only register it (and let it pick the
  // language) in the browser; on the server we pin the fallback language so
  // `i18n.init` never triggers detection against absent globals.
  const instance = isBrowser ? i18n.use(LanguageDetector) : i18n;

  instance.use(initReactI18next).init({
    resources: { ko, en },
    defaultNS: "common",
    fallbackLng: "ko",
    lng: isBrowser ? undefined : "ko",
    supportedLngs: ["ko", "en"],
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: isBrowser
      ? {
          order: ["localStorage", "navigator"],
          lookupLocalStorage: LOCALE_STORAGE_KEY,
          caches: ["localStorage"],
        }
      : undefined,
    react: { useSuspense: false },
  });
}

if (isBrowser) {
  document.documentElement.lang = i18n.resolvedLanguage ?? "ko";
  i18n.on("languageChanged", (language) => {
    document.documentElement.lang = language;
  });
}

export default i18n;
