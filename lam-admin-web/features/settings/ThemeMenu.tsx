"use client";

import { useId } from "react";
import { useTranslation } from "react-i18next";

import type { Theme } from "./theme";
import { useTheme } from "./ThemeProvider";

const THEME_OPTIONS: readonly Theme[] = ["light", "dark", "system"];

const THEME_LABEL_KEYS: Record<Theme, string> = {
  light: "themeLight",
  dark: "themeDark",
  system: "themeSystem",
};

export function ThemeMenu() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const selectId = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="sr-only">
        {t("theme")}
      </label>
      <select
        id={selectId}
        className="select-control h-9 w-auto min-h-0"
        value={theme}
        onChange={(event) => setTheme(event.target.value as Theme)}
      >
        {THEME_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {t(THEME_LABEL_KEYS[option])}
          </option>
        ))}
      </select>
    </div>
  );
}
