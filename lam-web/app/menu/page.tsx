import { notFound } from "next/navigation";

import { CategoryScreen } from "@/components/screens/category-screen";
import {
  getAppData,
  getFeaturedCategoryFromData,
  getMenuItemsByCategoryFromData,
  getVisibleCategoriesFromData,
} from "@/services/app-service";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const appData = await getAppData();
  const category = getFeaturedCategoryFromData(appData);

  if (!category) {
    notFound();
  }

  return (
    <CategoryScreen
      store={appData.store}
      categories={getVisibleCategoriesFromData(appData)}
      category={category}
      items={getMenuItemsByCategoryFromData(appData, category.id)}
    />
  );
}
