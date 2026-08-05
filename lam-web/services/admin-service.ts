import type { AppData } from "@/services/app-service";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:9090";

type CategoryInput = {
  id: string;
  label: string;
};

type MenuItemInput = {
  categoryId: string;
  badge: string;
  name: string;
  description: string;
  price: string;
};

type NoticeInput = {
  text: string;
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
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error ?? `request failed: ${response.status}`);
  }

  return (await response.json()) as AppData;
}

export function createCategory(payload: CategoryInput) {
  return postJSON("/api/v1/admin/categories", payload);
}

export function createMenuItem(payload: MenuItemInput) {
  return postJSON("/api/v1/admin/menu-items", payload);
}

export function createRequestGuide(payload: NoticeInput) {
  return postJSON("/api/v1/admin/request-guides", payload);
}

export function createNotice(payload: NoticeInput) {
  return postJSON("/api/v1/admin/notices", payload);
}
