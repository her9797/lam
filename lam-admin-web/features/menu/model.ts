/**
 * Request/validation shapes for the menu-management feature. Category and
 * menu-item *read* models (`MenuCategory`, `MenuItem`, `MenuImage`) already
 * live in `features/bootstrap/model.ts` (Task 4) since they're part of the
 * shared `AppData` tree — this module only adds the create/upload payload
 * shapes and the pure validation used before those payloads are sent.
 *
 * Field names below are grounded in `lam-api/internal/httpapi/router.go`'s
 * `createCategoryRequest`/`createMenuItemRequest`/`updateVisibilityRequest`
 * structs and the `/{id}/images` multipart handler (fields `image`,
 * `isPrimary`, `displayArea`, `focusX`, `focusY`) — not invented.
 */

export type CreateCategoryInput = {
  id: string;
  label: string;
  isVisible: boolean;
};

export type CreateMenuItemInput = {
  categoryId: string;
  badge: string;
  badgeColor: string;
  name: string;
  description: string;
  price: string;
  isVisible: boolean;
};

export type MenuImageDisplayArea = "home" | "menu" | "both";

export type UploadMenuItemImageInput = {
  menuItemId: string;
  image: File;
  isPrimary: boolean;
  displayArea: MenuImageDisplayArea;
  focusX: number;
  focusY: number;
};

/**
 * `lam-api` accepts any multipart file for an image upload without a
 * server-side MIME/size allowlist (`r.ParseMultipartForm(8 << 20)` only
 * bounds the in-memory parse buffer, it doesn't reject the request). This
 * allowlist and size cap are this app's own client-side guard against an
 * operator uploading an unusable file — 8MB mirrors that same `8 << 20`
 * figure from the Go handler.
 */
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

/**
 * Every validator below returns a translation KEY in the `menu` namespace,
 * never rendered text. That keeps these functions pure and framework-free
 * (they're called from event handlers, not render) while still letting the
 * operator see the message in whichever language they picked — the calling
 * component runs the key through its own `t()`.
 */
export type MenuValidationKey =
  | "errorCategoryIdRequired"
  | "errorCategoryIdDuplicate"
  | "errorCategoryNameRequired"
  | "errorCategoryMissing"
  | "errorItemNameRequired"
  | "errorPriceRequired"
  | "errorImageType"
  | "errorImageSize";

export type CategoryFormErrors = {
  id?: MenuValidationKey;
  label?: MenuValidationKey;
};

export function validateCategoryForm(
  input: { id: string; label: string },
  existingCategoryIds: readonly string[],
): CategoryFormErrors {
  const errors: CategoryFormErrors = {};
  const id = input.id.trim();
  const label = input.label.trim();

  if (!id) {
    errors.id = "errorCategoryIdRequired";
  } else if (existingCategoryIds.includes(id)) {
    errors.id = "errorCategoryIdDuplicate";
  }

  if (!label) {
    errors.label = "errorCategoryNameRequired";
  }

  return errors;
}

export type MenuItemFormErrors = {
  categoryId?: MenuValidationKey;
  name?: MenuValidationKey;
  price?: MenuValidationKey;
};

export function validateMenuItemForm(
  input: { categoryId: string; name: string; price: string },
  existingCategoryIds: readonly string[],
): MenuItemFormErrors {
  const errors: MenuItemFormErrors = {};
  const categoryId = input.categoryId.trim();

  if (!categoryId || !existingCategoryIds.includes(categoryId)) {
    errors.categoryId = "errorCategoryMissing";
  }

  if (!input.name.trim()) {
    errors.name = "errorItemNameRequired";
  }

  if (!input.price.trim()) {
    errors.price = "errorPriceRequired";
  }

  return errors;
}

/**
 * Returns a `menu`-namespace translation key when `file` isn't an allowed
 * image type or exceeds the size cap, otherwise `undefined`.
 */
export function validateImageFile(file: File): MenuValidationKey | undefined {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    return "errorImageType";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "errorImageSize";
  }
  return undefined;
}
