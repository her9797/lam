import { normalizeAppDataImages, type AppData } from "@/services/app-service";

const API_BASE_URL = "";

type CategoryInput = {
  id: string;
  label: string;
  isVisible: boolean;
};

type MenuItemInput = {
  categoryId: string;
  badge: string;
  name: string;
  description: string;
  price: string;
  isVisible: boolean;
};

type NoticeInput = {
  text: string;
  isVisible: boolean;
};

type MenuImageInput = {
  menuItemId: string;
  image: File;
  isPrimary?: boolean;
  displayArea?: "home" | "menu" | "both";
  focusX?: number;
  focusY?: number;
};

async function postJSON(path: string, payload: unknown): Promise<AppData> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(errorBody?.error ?? `request failed: ${response.status}`);
  }

  return normalizeAppDataImages((await response.json()) as AppData);
}

async function patchJSON(path: string, payload: unknown): Promise<AppData> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(errorBody?.error ?? `request failed: ${response.status}`);
  }

  return normalizeAppDataImages((await response.json()) as AppData);
}

export function createCategory(payload: CategoryInput) {
  return postJSON("/api/admin/categories", payload);
}

export function createMenuItem(payload: MenuItemInput) {
  return postJSON("/api/admin/menu-items", payload);
}

export function createRequestGuide(payload: NoticeInput) {
  return postJSON("/api/admin/request-guides", payload);
}

export function createNotice(payload: NoticeInput) {
  return postJSON("/api/admin/notices", payload);
}

export function updateCategoryVisibility(categoryId: string, isVisible: boolean) {
  return patchJSON(`/api/admin/categories/${categoryId}/visibility`, { isVisible });
}

export function updateMenuItemVisibility(menuItemId: string, isVisible: boolean) {
  return patchJSON(`/api/admin/menu-items/${menuItemId}/visibility`, { isVisible });
}

export function updateRequestGuideVisibility(requestGuideId: string, isVisible: boolean) {
  return patchJSON(`/api/admin/request-guides/${requestGuideId}/visibility`, { isVisible });
}

export function updateNoticeVisibility(noticeId: string, isVisible: boolean) {
  return patchJSON(`/api/admin/notices/${noticeId}/visibility`, { isVisible });
}

export async function uploadMenuImage(payload: MenuImageInput): Promise<AppData> {
  const formData = new FormData();
  formData.append("image", payload.image);
  if (payload.isPrimary) {
    formData.append("isPrimary", "true");
  }
  formData.append("displayArea", payload.displayArea ?? "menu");
  formData.append("focusX", String(payload.focusX ?? 50));
  formData.append("focusY", String(payload.focusY ?? 50));

  const response = await fetch(`${API_BASE_URL}/api/admin/menu-items/${payload.menuItemId}/images`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(errorBody?.error ?? `request failed: ${response.status}`);
  }

  return normalizeAppDataImages((await response.json()) as AppData);
}

async function deleteJSON(path: string): Promise<AppData> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(errorBody?.error ?? `request failed: ${response.status}`);
  }

  return normalizeAppDataImages((await response.json()) as AppData);
}

export function deleteCategory(categoryId: string) {
  return deleteJSON(`/api/admin/categories/${categoryId}`);
}

export function deleteMenuItem(menuItemId: string) {
  return deleteJSON(`/api/admin/menu-items/${menuItemId}`);
}

export function deleteRequestGuide(requestGuideId: string) {
  return deleteJSON(`/api/admin/request-guides/${requestGuideId}`);
}

export function deleteNotice(noticeId: string) {
  return deleteJSON(`/api/admin/notices/${noticeId}`);
}
