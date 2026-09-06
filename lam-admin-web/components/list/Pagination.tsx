"use client";

import "@/i18n/client";

import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

export const PAGE_SIZE_OPTIONS = [10, 20, 30] as const;

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const { t } = useTranslation("common");
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <select
        aria-label={t("listPageSizeLabel")}
        className="h-8 rounded-3xl border border-transparent bg-input/50 px-3 text-sm text-foreground"
        value={pageSize}
        onChange={(event) => onPageSizeChange(Number(event.target.value))}
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("listPrevPage")}
        </Button>
        <span>{t("listPageIndicator", { page, pageCount })}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          {t("listNextPage")}
        </Button>
      </div>
    </div>
  );
}
