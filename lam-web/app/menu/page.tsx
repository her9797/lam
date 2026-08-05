import { notFound } from "next/navigation";

import { CategoryScreen } from "@/components/screens/category-screen";
import { getAppData, getFeaturedCategoryFromData, getMenuItemsByCategoryFromData } from "@/services/app-service";

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
      categories={appData.categories}
      category={category}
      items={getMenuItemsByCategoryFromData(appData, category.id)}
    />
  );
}
