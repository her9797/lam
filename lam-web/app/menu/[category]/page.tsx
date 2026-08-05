import { notFound } from "next/navigation";

import { CategoryScreen } from "@/components/screens/category-screen";
import { getAppData, getCategoryByIdFromData, getMenuItemsByCategoryFromData } from "@/services/app-service";

export const dynamic = "force-dynamic";

type CategoryPageProps = {
  params: Promise<{
    category: string;
  }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const appData = await getAppData();
  const selectedCategory = getCategoryByIdFromData(appData, category);

  if (!selectedCategory) {
    notFound();
  }

  return (
    <CategoryScreen
      store={appData.store}
      categories={appData.categories}
      category={selectedCategory}
      items={getMenuItemsByCategoryFromData(appData, selectedCategory.id)}
    />
  );
}
