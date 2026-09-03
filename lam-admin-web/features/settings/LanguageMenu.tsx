"use client";

import { useId } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGE_OPTIONS = [
  { value: "ko", labelKey: "languageKorean" },
  { value: "en", labelKey: "languageEnglish" },
] as const;

export function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const selectId = useId();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language ?? "ko";

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="sr-only">
        {t("language")}
      </label>
      <select
        id={selectId}
        className="select-control h-9 w-auto min-h-0"
        value={currentLanguage}
        onChange={(event) => {
          void i18n.changeLanguage(event.target.value);
        }}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
}
