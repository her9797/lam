"use client";

import "@/i18n/client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListToolbar } from "@/components/list/ListToolbar";
import { ListTotalCount } from "@/components/list/ListTotalCount";
import { Pagination } from "@/components/list/Pagination";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/PageStates";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useBootstrapQuery } from "@/features/bootstrap/queries";
import type { MenuItem } from "@/features/bootstrap/model";
import { applyListQuery } from "@/lib/list/apply-list-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

import {
  UPLOAD_FOCUS_CENTER,
  createInitialCropTransform,
  cropImageFileToSquare,
  loadImageNaturalSize,
  type CropTransform,
} from "./crop";
import { CatalogResyncButton } from "./CatalogResyncButton";
import { ImageCropEditor } from "./ImageCropEditor";
import { MenuItemForm } from "./MenuItemForm";
import { buildMenuListSearchParams, parseMenuListQuery, type MenuListQuery } from "./list-query-url";
import { filterItemsByCategory, getMenuItemDisplayImage, validateImageFile } from "./model";
import { useUpdateMenuItemVisibilityMutation, useUploadMenuItemImageMutation } from "./queries";

type CropDraft = {
  menuItemId: string;
  file: File;
  imageUrl: string;
  transform: CropTransform;
};

const SEARCH_DEBOUNCE_MS = 300;

export function MenuManagementPage() {
  const { t } = useTranslation("menu");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bootstrapQuery = useBootstrapQuery();
  const visibilityMutation = useUpdateMenuItemVisibilityMutation();
  const uploadMutation = useUploadMenuItemImageMutation();

  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  // Holds a translation key (from `validateImageFile`, or one raised here),
  // not rendered text, so the message follows a language switch.
  const [imageErrorKey, setImageErrorKey] = useState<string | null>(null);

  // Search/category/sort/pagination applies only to this table's own
  // rendering — never to the `items` passed to `MenuItemForm` below, which
  // needs the full, unfiltered list to detect a newly-created item by
  // diffing ids. Synced to the URL (see `./list-query-url.ts`) the same
  // way `OrderListPage`/`RequestListPage` sync theirs.
  const listQuery = useMemo(() => parseMenuListQuery(searchParams), [searchParams]);

  const updateQuery = useCallback(
    (patch: Partial<MenuListQuery>) => {
      const params = buildMenuListSearchParams({ ...listQuery, ...patch });
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [listQuery, pathname, router],
  );

  // Local, immediately-updated search box synced to the URL only after
  // debouncing — same pattern as `OrderListPage`/`RequestListPage`.
  const [searchInput, setSearchInput] = useState(listQuery.search);
  const [syncedSearch, setSyncedSearch] = useState(listQuery.search);
  if (listQuery.search !== syncedSearch) {
    setSyncedSearch(listQuery.search);
    setSearchInput(listQuery.search);
  }

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  useEffect(() => {
    if (debouncedSearch !== listQuery.search) {
      updateQuery({ search: debouncedSearch, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  if (bootstrapQuery.isLoading) {
    return <LoadingState label={t("loading")} />;
  }

  if (bootstrapQuery.isError) {
    return (
      <ErrorState
        title={t("errorTitle")}
        message={bootstrapQuery.error instanceof Error ? bootstrapQuery.error.message : undefined}
        onRetry={() => bootstrapQuery.refetch()}
      />
    );
  }

  const categories = bootstrapQuery.data?.categories ?? [];
  const items = bootstrapQuery.data?.items ?? [];
  const hasCategories = categories.length > 0;

  // Category filter applies before search/sort/pagination — narrows the
  // candidate set `applyListQuery` then paginates, so "총 N건" reflects
  // the category-filtered count, not the full catalog's.
  const categoryFilteredItems = filterItemsByCategory(items, listQuery.category);

  const { items: visibleItems, total: visibleTotal } = applyListQuery<MenuItem>(categoryFilteredItems, listQuery, {
    searchText: (item) => `${item.name} ${item.description}`,
    sortValue: (item, key) => (key === "price" ? Number(item.price) || 0 : item.name),
  });

  const ITEM_SORT_LABELS: Record<string, string> = {
    none: t("common:filterAll"),
    name: t("itemSortByName"),
    price: t("itemSortByPrice"),
  };
  const CATEGORY_FILTER_LABELS: Record<string, string> = {
    all: t("common:filterAll"),
    ...Object.fromEntries(categories.map((category) => [category.id, category.label])),
  };

  function isVisibilityPending(id: string): boolean {
    return visibilityMutation.isPending && visibilityMutation.variables?.id === id;
  }

  function isUploadPending(id: string): boolean {
    return uploadMutation.isPending && uploadMutation.variables?.menuItemId === id;
  }

  function closeCropDraft() {
    setCropDraft((current) => {
      if (current) {
        URL.revokeObjectURL(current.imageUrl);
      }
      return null;
    });
  }

  async function handleImageSelected(menuItemId: string, file: File | undefined) {
    setImageErrorKey(null);
    if (!file) {
      return;
    }

    const validationErrorKey = validateImageFile(file);
    if (validationErrorKey) {
      setImageErrorKey(validationErrorKey);
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    try {
      const { naturalWidth, naturalHeight } = await loadImageNaturalSize(imageUrl);
      setCropDraft({
        menuItemId,
        file,
        imageUrl,
        transform: createInitialCropTransform(naturalWidth, naturalHeight),
      });
    } catch {
      URL.revokeObjectURL(imageUrl);
      setImageErrorKey("imageLoadFailed");
    }
  }

  // Renders the selected crop region (pan AND zoom) into a square bitmap and
  // uploads that, rather than the original file — `focusX`/`focusY` alone
  // are a CSS `object-position` and cannot express zoom. See `./crop`.
  async function handleSaveCrop() {
    if (!cropDraft) {
      return;
    }

    setImageErrorKey(null);
    let croppedImage: File;
    try {
      croppedImage = await cropImageFileToSquare(cropDraft.file, cropDraft.transform);
    } catch {
      setImageErrorKey("cropFailed");
      return;
    }

    uploadMutation.mutate(
      {
        menuItemId: cropDraft.menuItemId,
        image: croppedImage,
        isPrimary: true,
        displayArea: "menu",
        focusX: UPLOAD_FOCUS_CENTER,
        focusY: UPLOAD_FOCUS_CENTER,
      },
      { onSuccess: () => closeCropDraft() },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <CatalogResyncButton />
          <MenuItemForm categories={categories} items={items} />
        </div>
      </div>

      {!hasCategories ? (
        <p className="text-sm text-muted-foreground">{t("noCategoriesHint")}</p>
      ) : null}
      {imageErrorKey ? (
        <p role="alert" className="text-sm text-destructive">
          {t(imageErrorKey)}
        </p>
      ) : null}
      {uploadMutation.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {uploadMutation.error instanceof Error
            ? uploadMutation.error.message
            : t("imageUploadFailed")}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ListToolbar
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder={t("itemSearchPlaceholder")}
          className="items-end"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="menu-category-filter">{t("itemCategoryFilterLabel")}</Label>
            <Select
              value={listQuery.category || "all"}
              onValueChange={(value) =>
                updateQuery({ category: value === "all" ? "" : String(value), page: 1 })
              }
            >
              <SelectTrigger
                id="menu-category-filter"
                size="sm"
                className="w-32"
                aria-label={t("itemCategoryFilterLabel")}
              >
                <SelectValue placeholder={t("itemCategoryFilterLabel")}>
                  {(value: string) => CATEGORY_FILTER_LABELS[value] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common:filterAll")}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="menu-sort">{t("common:sortLabel")}</Label>
            <Select
              value={listQuery.sort || "none"}
              onValueChange={(value) =>
                updateQuery({ sort: value === "none" ? "" : String(value), page: 1 })
              }
            >
              <SelectTrigger id="menu-sort" size="sm" className="w-32" aria-label={t("common:sortLabel")}>
                {/* Base UI's <Select.Value> shows the raw string value
                    unless told how to render a label for it — required
                    here since these items are plain strings. */}
                <SelectValue placeholder={t("common:sortLabel")}>
                  {(value: string) => ITEM_SORT_LABELS[value] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("common:filterAll")}</SelectItem>
                <SelectItem value="name">{t("itemSortByName")}</SelectItem>
                <SelectItem value="price">{t("itemSortByPrice")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </ListToolbar>
      ) : null}

      <ListTotalCount count={visibleTotal} />

      {items.length === 0 ? (
        <EmptyState title={t("itemEmptyTitle")} description={t("itemEmptyDescription")} />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          title={t("common:listNoResultsTitle")}
          description={t("common:listNoResultsDescription")}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common:columnName")}</TableHead>
              <TableHead className="w-32">{t("columnCategory")}</TableHead>
              <TableHead className="w-24">{t("columnPrice")}</TableHead>
              <TableHead className="w-44">{t("columnOptions")}</TableHead>
              <TableHead className="w-24">{t("common:columnVisibility")}</TableHead>
              <TableHead className="w-44">{t("columnImage")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map((item) => {
              const category = categories.find((candidate) => candidate.id === item.categoryId);
              const displayImage = getMenuItemDisplayImage(item);
              const options = item.options ?? [];
              const choiceCount = options.reduce((total, option) => total + option.choices.length, 0);
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={`/menu/${item.id}`}
                      className="text-foreground underline underline-offset-4 hover:font-bold"
                    >
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell>{category?.label ?? item.categoryId}</TableCell>
                  <TableCell>{item.price}</TableCell>
                  <TableCell>
                    {options.length > 0 ? (
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="text-sm text-foreground">
                          {t("optionSummary", { optionCount: options.length, choiceCount })}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {options.map((option) => option.title).join(" · ")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">{t("noOptions")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isVisibilityPending(item.id)}
                      onClick={() =>
                        visibilityMutation.mutate({ id: item.id, isVisible: !item.isVisible })
                      }
                    >
                      {item.isVisible ? t("common:visible") : t("common:hidden")}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {displayImage ? (
                        // POS image hosts are provided dynamically by the API.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayImage.src}
                          alt={t("itemImageAlt", { name: item.name })}
                          className="size-12 shrink-0 rounded-2xl object-cover"
                          style={
                            displayImage.focusX === undefined
                              ? undefined
                              : { objectPosition: `${displayImage.focusX}% ${displayImage.focusY}%` }
                          }
                        />
                      ) : null}
                      <label className="cursor-pointer text-sm text-foreground underline underline-offset-4 hover:font-bold">
                        {t("imageSelect")}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          aria-label={t("imageSelectRowAria", { name: item.name })}
                          disabled={isUploadPending(item.id)}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            void handleImageSelected(item.id, file);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {items.length > 0 ? (
        <Pagination
          page={listQuery.page}
          pageSize={listQuery.pageSize}
          total={visibleTotal}
          onPageChange={(page) => updateQuery({ page })}
          onPageSizeChange={(pageSize) => updateQuery({ pageSize, page: 1 })}
        />
      ) : null}

      <Dialog
        open={cropDraft !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeCropDraft();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cropDialogTitle")}</DialogTitle>
          </DialogHeader>
          {cropDraft ? (
            <ImageCropEditor
              imageUrl={cropDraft.imageUrl}
              transform={cropDraft.transform}
              onTransformChange={(transform) =>
                setCropDraft((current) => (current ? { ...current, transform } : current))
              }
            />
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCropDraft}>
              {t("common:cancel")}
            </Button>
            <Button
              type="button"
              disabled={uploadMutation.isPending}
              onClick={() => void handleSaveCrop()}
            >
              {t("common:save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
