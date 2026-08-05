import {
  categories as fallbackCategories,
  menuItems as fallbackMenuItems,
  notices as fallbackNotices,
  requestGuides as fallbackRequestGuides,
  store as fallbackStore,
  type MenuCategory,
  type MenuItem,
  type NoticeItem,
  type StoreInfo,
} from "@/data/menu-data";

export type AppData = {
  store: StoreInfo;
  categories: MenuCategory[];
  items: MenuItem[];
  requestGuides: NoticeItem[];
  notices: NoticeItem[];
};

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:9090";

function getFallbackAppData(): AppData {
  return {
    store: fallbackStore,
    categories: fallbackCategories,
    items: fallbackMenuItems,
    requestGuides: fallbackRequestGuides,
    notices: fallbackNotices,
  };
}

function isAppData(payload: unknown): payload is AppData {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppData>;
  return (
    !!candidate.store &&
    typeof candidate.store.name === "string" &&
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.items) &&
    Array.isArray(candidate.requestGuides) &&
    Array.isArray(candidate.notices)
  );
}

export async function getAppData(): Promise<AppData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/bootstrap`, {
      cache: "no-store",
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(1500),
    });

    if (!response.ok) {
      throw new Error(`bootstrap api request failed: ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    if (!isAppData(payload)) {
      throw new Error("bootstrap api returned an invalid payload");
    }

    return payload;
  } catch (error) {
    console.warn("Falling back to local app data.", error);
    return getFallbackAppData();
  }
}

export function getFeaturedCategoryFromData(appData: AppData) {
  return appData.categories.find((category) => category.id === "signature") ?? appData.categories[0];
}

export function getCategoryByIdFromData(appData: AppData, categoryId: string) {
  return appData.categories.find((category) => category.id === categoryId);
}

export function getMenuItemsByCategoryFromData(appData: AppData, categoryId: string) {
  return appData.items.filter((item) => item.categoryId === categoryId);
}

export function getFeaturedItemsFromData(appData: AppData) {
  const featuredCategory = getFeaturedCategoryFromData(appData);
  return featuredCategory ? getMenuItemsByCategoryFromData(appData, featuredCategory.id).slice(0, 3) : [];
}
