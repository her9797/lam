"use client";

import "@/i18n/client";

import { useTranslation } from "react-i18next";

import {
  RiArrowDownSLine,
  RiArrowLeftDoubleLine,
  RiArrowLeftSLine,
  RiArrowRightDoubleLine,
  RiArrowRightSLine,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";

export const PAGE_SIZE_OPTIONS = [10, 20, 30] as const;

type PageItem = number | "ellipsis-start" | "ellipsis-end";

function getPageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const startPage = Math.min(Math.max(page - 2, 1), pageCount - 4);
  const pages = Array.from({ length: 5 }, (_, index) => startPage + index);

  return [
    ...(startPage > 1 ? (["ellipsis-start"] as const) : []),
    ...pages,
    ...(startPage + 4 < pageCount ? (["ellipsis-end"] as const) : []),
  ];
}

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
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const pageItems = getPageItems(currentPage, pageCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <div className="relative inline-flex w-fit items-center">
        <select
          aria-label={t("listPageSizeLabel")}
          className="flex h-8 items-center appearance-none rounded-3xl border border-transparent bg-input/50 pl-3 pr-8 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <RiArrowDownSLine className="pointer-events-none absolute right-2 size-4 text-muted-foreground" />
      </div>
      <nav aria-label={t("listPageNavigation")} className="flex max-w-full items-center gap-1 overflow-x-auto">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={t("listFirstPage")}
          title={t("listFirstPage")}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
        >
          <RiArrowLeftDoubleLine data-icon="inline-start" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={t("listPrevPage")}
          title={t("listPrevPage")}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <RiArrowLeftSLine data-icon="inline-start" aria-hidden="true" />
        </Button>
        {pageItems.map((item) =>
          typeof item === "number" ? (
            <Button
              key={item}
              type="button"
              size="icon-sm"
              variant={item === currentPage ? "default" : "ghost"}
              aria-current={item === currentPage ? "page" : undefined}
              aria-label={t("listPageLabel", { page: item })}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ) : (
            <span key={item} aria-hidden="true" className="inline-flex size-8 items-center justify-center">
              …
            </span>
          ),
        )}
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={t("listNextPage")}
          title={t("listNextPage")}
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <RiArrowRightSLine data-icon="inline-end" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={t("listLastPage")}
          title={t("listLastPage")}
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(pageCount)}
        >
          <RiArrowRightDoubleLine data-icon="inline-end" aria-hidden="true" />
        </Button>
      </nav>
    </div>
  );
}
