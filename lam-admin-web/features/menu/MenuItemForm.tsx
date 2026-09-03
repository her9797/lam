"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { AppData, MenuCategory } from "@/features/bootstrap/model";

import {
  UPLOAD_FOCUS_CENTER,
  createInitialCropTransform,
  cropImageFileToSquare,
  loadImageNaturalSize,
  type CropTransform,
} from "./crop";
import { ImageCropEditor } from "./ImageCropEditor";
import { validateImageFile, validateMenuItemForm, type MenuItemFormErrors } from "./model";
import { useCreateMenuItemMutation, useUploadMenuItemImageMutation } from "./queries";

type PendingImage = {
  file: File;
  imageUrl: string;
  transform: CropTransform;
};

type MenuItemFormState = {
  categoryId: string;
  badge: string;
  badgeColor: string;
  name: string;
  description: string;
  price: string;
  isVisible: boolean;
};

// Mirrors the fixed badge-color palette already in use for the customer
// menu (`lam-web/components/screens/admin-screen.tsx`'s `badgeColorOptions`)
// — `badgeColor` is a free-form string on the wire, but the operator picks
// from this known set rather than typing a raw value.
const BADGE_COLOR_OPTIONS = [
  { value: "", label: "배지 없음" },
  { value: "green", label: "그린" },
  { value: "amber", label: "앰버" },
  { value: "pink", label: "핑크" },
  { value: "blue", label: "블루" },
] as const;

function emptyForm(categoryId: string): MenuItemFormState {
  return {
    categoryId,
    badge: "",
    badgeColor: "",
    name: "",
    description: "",
    price: "",
    isVisible: true,
  };
}

type MenuItemFormProps = {
  categories: MenuCategory[];
  /**
   * Current menu items, used solely to capture the "before" id set right
   * before creating a new item. `lam-api` generates each item's id itself
   * (`fmt.Sprintf("menu-%d", time.Now().UnixMilli())`,
   * `lam-api/internal/store/postgres.go`) and the create response only
   * returns the full refreshed bootstrap tree, not the new id directly —
   * so the id of the item just created is recovered by diffing this set
   * against the items in that response (same pattern as
   * `lam-web/components/screens/admin-screen.tsx`'s `handleMenuSubmit`).
   * This is what lets an image selected in this form be uploaded to the
   * right item immediately after creation, in one submit.
   */
  items: { id: string }[];
};

export function MenuItemForm({ categories, items }: MenuItemFormProps) {
  const [form, setForm] = useState<MenuItemFormState>(() => emptyForm(categories[0]?.id ?? ""));
  const [errors, setErrors] = useState<MenuItemFormErrors>({});
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const createMutation = useCreateMenuItemMutation();
  const uploadMutation = useUploadMenuItemImageMutation();

  // Derived (not synced via an effect) so the selected category stays
  // valid as the category list changes — e.g. the first category is
  // created after this form already mounted with no categories available.
  const effectiveCategoryId = categories.some((category) => category.id === form.categoryId)
    ? form.categoryId
    : categories[0]?.id ?? "";

  const hasCategories = categories.length > 0;

  function clearPendingImage() {
    setPendingImage((current) => {
      if (current) {
        URL.revokeObjectURL(current.imageUrl);
      }
      return null;
    });
  }

  async function handleImageSelected(file: File | undefined) {
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
      setPendingImage({ file, imageUrl, transform: createInitialCropTransform(naturalWidth, naturalHeight) });
      setIsCropDialogOpen(true);
    } catch {
      URL.revokeObjectURL(imageUrl);
      setImageError("이미지를 불러오지 못했습니다.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateMenuItemForm(
      { ...form, categoryId: effectiveCategoryId },
      categories.map((category) => category.id),
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    // Captured before the mutation fires so it reflects the item set that
    // existed prior to this create — see the `items` prop doc above.
    const previousItemIds = new Set(items.map((item) => item.id));
    const imageToUpload = pendingImage;

    // The crop (pan AND zoom) is rendered into the uploaded bitmap here,
    // before the item is created, so a failed crop aborts the whole submit
    // instead of leaving a new item with the wrong image. Uploading the
    // original file and describing the crop with `focusX`/`focusY` cannot
    // express zoom at all — see `./crop`'s module doc.
    let croppedImage: File | null = null;
    if (imageToUpload) {
      setImageError(null);
      try {
        croppedImage = await cropImageFileToSquare(imageToUpload.file, imageToUpload.transform);
      } catch {
        setImageError("이미지를 잘라내는 데 실패했습니다.");
        return;
      }
    }

    createMutation.mutate(
      {
        categoryId: effectiveCategoryId.trim(),
        badge: form.badge.trim(),
        badgeColor: form.badgeColor.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        price: form.price.trim(),
        isVisible: form.isVisible,
      },
      {
        onSuccess: (appData: AppData) => {
          setForm(emptyForm(effectiveCategoryId));
          clearPendingImage();

          if (!croppedImage) {
            return;
          }
          const createdItem = appData.items.find((item) => !previousItemIds.has(item.id));
          if (!createdItem) {
            return;
          }
          uploadMutation.mutate({
            menuItemId: createdItem.id,
            image: croppedImage,
            isPrimary: true,
            displayArea: "menu",
            focusX: UPLOAD_FOCUS_CENTER,
            focusY: UPLOAD_FOCUS_CENTER,
          });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>메뉴 등록</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasCategories ? (
          <p className="text-sm text-muted-foreground">먼저 카테고리를 추가하세요.</p>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="menu-category">카테고리</Label>
              <select
                id="menu-category"
                className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm text-foreground"
                value={effectiveCategoryId}
                onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                aria-invalid={Boolean(errors.categoryId)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
              {errors.categoryId ? (
                <p role="alert" className="text-sm text-destructive">
                  {errors.categoryId}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="menu-name">이름</Label>
              <Input
                id="menu-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name ? (
                <p role="alert" className="text-sm text-destructive">
                  {errors.name}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="menu-description">설명</Label>
              <Textarea
                id="menu-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="menu-price">가격</Label>
              <Input
                id="menu-price"
                value={form.price}
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                aria-invalid={Boolean(errors.price)}
              />
              {errors.price ? (
                <p role="alert" className="text-sm text-destructive">
                  {errors.price}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="menu-badge">배지 문구</Label>
                <Input
                  id="menu-badge"
                  value={form.badge}
                  onChange={(event) => setForm((current) => ({ ...current, badge: event.target.value }))}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="menu-badge-color">배지 색상</Label>
                <select
                  id="menu-badge-color"
                  className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm text-foreground"
                  value={form.badgeColor}
                  onChange={(event) => setForm((current) => ({ ...current, badgeColor: event.target.value }))}
                >
                  {BADGE_COLOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.isVisible}
                onChange={(event) => setForm((current) => ({ ...current, isVisible: event.target.checked }))}
              />
              공개
            </label>

            <div className="flex flex-col gap-1.5">
              <Label>이미지 (선택)</Label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-sm text-primary underline-offset-4 hover:underline">
                  {pendingImage ? "이미지 다시 선택" : "이미지 선택"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    aria-label="새 메뉴 이미지 선택"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      void handleImageSelected(file);
                      event.target.value = "";
                    }}
                  />
                </label>
                {pendingImage ? (
                  <>
                    <span className="text-sm text-muted-foreground">{pendingImage.file.name}</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => setIsCropDialogOpen(true)}>
                      영역 조정
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={clearPendingImage}>
                      제거
                    </Button>
                  </>
                ) : null}
              </div>
              {imageError ? (
                <p role="alert" className="text-sm text-destructive">
                  {imageError}
                </p>
              ) : null}
            </div>

            {createMutation.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "메뉴 추가에 실패했습니다."}
              </p>
            ) : null}

            {uploadMutation.isError ? (
              <p role="alert" className="text-sm text-destructive">
                메뉴는 등록되었지만 이미지 업로드에 실패했습니다. 메뉴 목록에서 이미지를 다시 선택해주세요.
              </p>
            ) : null}

            <Button type="submit" disabled={createMutation.isPending}>
              메뉴 추가
            </Button>
          </form>
        )}
      </CardContent>

      <Dialog
        open={isCropDialogOpen}
        onOpenChange={(open) => {
          setIsCropDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이미지 영역 선택</DialogTitle>
          </DialogHeader>
          {pendingImage ? (
            <ImageCropEditor
              imageUrl={pendingImage.imageUrl}
              transform={pendingImage.transform}
              onTransformChange={(transform) =>
                setPendingImage((current) => (current ? { ...current, transform } : current))
              }
            />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                clearPendingImage();
                setIsCropDialogOpen(false);
              }}
            >
              취소
            </Button>
            <Button type="button" onClick={() => setIsCropDialogOpen(false)}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
