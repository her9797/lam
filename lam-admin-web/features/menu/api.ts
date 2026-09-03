import { fetchJson } from "@/lib/api/fetch-json";
import type { AppData } from "@/features/bootstrap/model";

import type { CreateCategoryInput, CreateMenuItemInput, UploadMenuItemImageInput } from "./model";

const CATEGORIES_PATH = "/api/admin/categories";
const MENU_ITEMS_PATH = "/api/admin/menu-items";

/**
 * Every one of these calls `lam-api`'s admin category/menu-item endpoints
 * (proxied through this app's `/api/admin/[...slug]` BFF route) and, per
 * that handler group's actual response shape (see `router.go`), gets back
 * the full, refreshed `AppData` bootstrap tree — not just the
 * created/updated resource. Callers write that straight into
 * `bootstrapKeys.all` instead of a second round trip.
 */

export function createCategory(input: CreateCategoryInput): Promise<AppData> {
  return fetchJson<AppData>(CATEGORIES_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateCategoryVisibility(id: string, isVisible: boolean): Promise<AppData> {
  return fetchJson<AppData>(`${CATEGORIES_PATH}/${id}/visibility`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isVisible }),
  });
}

export function deleteCategory(id: string): Promise<AppData> {
  return fetchJson<AppData>(`${CATEGORIES_PATH}/${id}`, { method: "DELETE" });
}

export function createMenuItem(input: CreateMenuItemInput): Promise<AppData> {
  return fetchJson<AppData>(MENU_ITEMS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateMenuItemVisibility(id: string, isVisible: boolean): Promise<AppData> {
  return fetchJson<AppData>(`${MENU_ITEMS_PATH}/${id}/visibility`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isVisible }),
  });
}

export function deleteMenuItem(id: string): Promise<AppData> {
  return fetchJson<AppData>(`${MENU_ITEMS_PATH}/${id}`, { method: "DELETE" });
}

/**
 * Multipart upload to `POST /api/v1/admin/menu-items/{id}/images`. The
 * field names (`image`, `isPrimary`, `displayArea`, `focusX`, `focusY`)
 * match that handler's `r.FormFile("image")`/`r.FormValue(...)` calls
 * exactly. `Content-Type` is deliberately left unset so the browser adds
 * the multipart boundary itself — `fetchJson` just forwards `init` to
 * `fetch`.
 */
export function uploadMenuItemImage(input: UploadMenuItemImageInput): Promise<AppData> {
  const formData = new FormData();
  formData.append("image", input.image);
  formData.append("isPrimary", String(input.isPrimary));
  formData.append("displayArea", input.displayArea);
  formData.append("focusX", String(input.focusX));
  formData.append("focusY", String(input.focusY));

  return fetchJson<AppData>(`${MENU_ITEMS_PATH}/${input.menuItemId}/images`, {
    method: "POST",
    body: formData,
  });
}
