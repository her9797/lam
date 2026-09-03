"use client";

import { RiCheckLine } from "@remixicon/react";
import { useTranslation } from "react-i18next";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        aria-label={`${t("theme")}: ${t(THEME_LABEL_KEYS[theme])}`}
      >
        {t(THEME_LABEL_KEYS[theme])}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {THEME_OPTIONS.map((option) => (
          <DropdownMenuItem key={option} onClick={() => setTheme(option)}>
            <RiCheckLine
              className={cn("size-4", theme !== option && "invisible")}
              aria-hidden="true"
            />
            {t(THEME_LABEL_KEYS[option])}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
