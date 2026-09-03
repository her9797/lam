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

const LANGUAGE_OPTIONS = [
  { value: "ko", labelKey: "languageKorean" },
  { value: "en", labelKey: "languageEnglish" },
] as const;

export function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language ?? "ko";
  const currentOption =
    LANGUAGE_OPTIONS.find((option) => option.value === currentLanguage) ??
    LANGUAGE_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        aria-label={`${t("language")}: ${t(currentOption.labelKey)}`}
      >
        {t(currentOption.labelKey)}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {LANGUAGE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => {
              void i18n.changeLanguage(option.value);
            }}
          >
            <RiCheckLine
              className={cn(
                "size-4",
                currentLanguage !== option.value && "invisible",
              )}
              aria-hidden="true"
            />
            {t(option.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
