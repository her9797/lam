"use client";

import "@/i18n/client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListToolbar } from "@/components/list/ListToolbar";
import { Pagination } from "@/components/list/Pagination";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/PageStates";
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
import { applyListQuery, type ListQueryState } from "@/lib/list/apply-list-query";

import {
  UPLOAD_FOCUS_CENTER,
  createInitialCropTransform,
  cropImageFileToSquare,
  loadImageNaturalSize,
  type CropTransform,
} from "./crop";
import { ImageCropEditor } from "./ImageCropEditor";
import { MenuItemForm } from "./MenuItemForm";
import { validateImageFile } from "./model";
import {
  useDeleteMenuItemMutation,
  useUpdateMenuItemVisibilityMutation,
  useUploadMenuItemImageMutation,
} from "./queries";

type CropDraft = {
  menuItemId: string;
  file: File;
  imageUrl: string;
  transform: CropTransform;
};

export function MenuManagementPage() {
  const { t } = useTranslation("menu");
  const bootstrapQuery = useBootstrapQuery();
  const visibilityMutation = useUpdateMenuItemVisibilityMutation();
  const deleteMutation = useDeleteMenuItemMutation();
  const uploadMutation = useUploadMenuItemImageMutation();

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  // Holds a translation key (from `validateImageFile`, or one raised here),
  // not rendered text, so the message follows a language switch.
  const [imageErrorKey, setImageErrorKey] = useState<string | null>(null);

  // Search/sort/pagination applies only to this table's own rendering —
  // never to the `items` passed to `MenuItemForm` below, which needs the
  // full, unfiltered list to detect a newly-created item by diffing ids.
  const [listQuery, setListQuery] = useState<ListQueryState>({
    search: "",
    sort: "",
    order: "asc",
    page: 1,
    pageSize: 20,
  });

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
  const deleteTarget = items.find((item) => item.id === pendingDeleteId) ?? null;

  const { items: visibleItems, total: visibleTotal } = applyListQuery<MenuItem>(items, listQuery, {
    searchText: (item) => `${item.name} ${item.description}`,
    sortValue: (item, key) => (key === "price" ? Number(item.price) || 0 : item.name),
  });

  function isVisibilityPending(id: string): boolean {
    return visibilityMutation.isPending && visibilityMutation.variables?.id === id;
  }

  function isDeletePending(id: string): boolean {
    return deleteMutation.isPending && deleteMutation.variables === id;
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

  function handleConfirmDelete() {
    if (!pendingDeleteId) {
      return;
    }
    deleteMutation.mutate(pendingDeleteId, { onSuccess: () => setPendingDeleteId(null) });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>

      <MenuItemForm categories={categories} items={items} />

      <Card>
        <CardHeader>
          <CardTitle>{t("listCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
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
              searchValue={listQuery.search}
              onSearchChange={(search) => setListQuery((prev) => ({ ...prev, search, page: 1 }))}
              searchPlaceholder={t("itemSearchPlaceholder")}
            >
              <Select
                value={listQuery.sort || "none"}
                onValueChange={(value) =>
                  setListQuery((prev) => ({
                    ...prev,
                    sort: value === "none" ? "" : String(value),
                    page: 1,
                  }))
                }
              >
                <SelectTrigger size="sm" aria-label={t("common:sortLabel")}>
                  <SelectValue placeholder={t("common:sortLabel")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common:filterAll")}</SelectItem>
                  <SelectItem value="name">{t("itemSortByName")}</SelectItem>
                  <SelectItem value="price">{t("itemSortByPrice")}</SelectItem>
                </SelectContent>
              </Select>
            </ListToolbar>
          ) : null}

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
                  <TableHead>{t("columnCategory")}</TableHead>
                  <TableHead>{t("columnPrice")}</TableHead>
                  <TableHead>{t("common:columnVisibility")}</TableHead>
                  <TableHead>{t("columnImage")}</TableHead>
                  <TableHead>{t("common:columnActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((item) => {
                  const category = categories.find((candidate) => candidate.id === item.categoryId);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{category?.label ?? item.categoryId}</TableCell>
                      <TableCell>{item.price}</TableCell>
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
                        <label className="cursor-pointer text-sm text-primary underline-offset-4 hover:underline">
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
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isDeletePending(item.id)}
                          onClick={() => setPendingDeleteId(item.id)}
                        >
                          {t("common:delete")}
                        </Button>
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
              onPageChange={(page) => setListQuery((prev) => ({ ...prev, page }))}
            />
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("itemDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? t("itemDeleteTarget", { name: deleteTarget.name }) : ""}
              {t("common:deleteIrreversible")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/*
            A failed delete leaves this dialog open (it only closes in the
            mutation's own `onSuccess`), so the failure has to be reported
            here rather than in the page body behind the dialog.
          */}
          {deleteMutation.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : t("itemDeleteFailed")}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={deleteMutation.isPending} onClick={handleConfirmDelete}>
              {t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
