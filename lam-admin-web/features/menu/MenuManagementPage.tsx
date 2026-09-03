"use client";

import "@/i18n/client";

import { useState } from "react";

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
import { EmptyState, ErrorState, LoadingState } from "@/components/states/PageStates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useBootstrapQuery } from "@/features/bootstrap/queries";

import { CategoryPanel } from "./CategoryPanel";
import { computeFocusPoint, createInitialCropTransform, loadImageNaturalSize, type CropTransform } from "./crop";
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
  const bootstrapQuery = useBootstrapQuery();
  const visibilityMutation = useUpdateMenuItemVisibilityMutation();
  const deleteMutation = useDeleteMenuItemMutation();
  const uploadMutation = useUploadMenuItemImageMutation();

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  if (bootstrapQuery.isLoading) {
    return <LoadingState label="메뉴 정보를 불러오는 중입니다." />;
  }

  if (bootstrapQuery.isError) {
    return (
      <ErrorState
        title="메뉴 정보를 불러오지 못했습니다."
        message={bootstrapQuery.error instanceof Error ? bootstrapQuery.error.message : undefined}
        onRetry={() => bootstrapQuery.refetch()}
      />
    );
  }

  const categories = bootstrapQuery.data?.categories ?? [];
  const items = bootstrapQuery.data?.items ?? [];
  const deleteTarget = items.find((item) => item.id === pendingDeleteId) ?? null;

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
    setImageError(null);
    if (!file) {
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      setImageError(validationError);
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
      setImageError("이미지를 불러오지 못했습니다.");
    }
  }

  function handleSaveCrop() {
    if (!cropDraft) {
      return;
    }
    const { focusX, focusY } = computeFocusPoint(cropDraft.transform);
    uploadMutation.mutate(
      {
        menuItemId: cropDraft.menuItemId,
        image: cropDraft.file,
        isPrimary: true,
        displayArea: "menu",
        focusX,
        focusY,
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
      <h1 className="text-lg font-semibold text-foreground">메뉴 관리</h1>

      <CategoryPanel categories={categories} />
      <MenuItemForm categories={categories} />

      <Card>
        <CardHeader>
          <CardTitle>메뉴 목록</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {imageError ? (
            <p role="alert" className="text-sm text-destructive">
              {imageError}
            </p>
          ) : null}
          {uploadMutation.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {uploadMutation.error instanceof Error
                ? uploadMutation.error.message
                : "이미지 업로드에 실패했습니다."}
            </p>
          ) : null}

          {items.length === 0 ? (
            <EmptyState title="등록된 메뉴가 없습니다." description="위 양식으로 메뉴를 추가하세요." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>가격</TableHead>
                  <TableHead>공개 여부</TableHead>
                  <TableHead>이미지</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
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
                          {item.isVisible ? "공개" : "숨김"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <label className="cursor-pointer text-sm text-primary underline-offset-4 hover:underline">
                          이미지 선택
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            aria-label={`${item.name} 이미지 선택`}
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
                          삭제
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
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
            <AlertDialogTitle>메뉴를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `'${deleteTarget.name}' 메뉴를 삭제합니다. ` : ""}
              삭제하면 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction disabled={deleteMutation.isPending} onClick={handleConfirmDelete}>
              삭제
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
            <DialogTitle>이미지 영역 선택</DialogTitle>
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
              취소
            </Button>
            <Button type="button" disabled={uploadMutation.isPending} onClick={handleSaveCrop}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
