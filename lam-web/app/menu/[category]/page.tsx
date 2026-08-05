import { notFound } from "next/navigation";

import { CategoryScreen } from "@/components/screens/category-screen";
import { getCategoryById } from "@/services/menu-service";

type CategoryPageProps = {
  params: Promise<{
    category: string;
  }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const selectedCategory = getCategoryById(category);

  if (!selectedCategory) {
    notFound();
  }

  return <CategoryScreen category={selectedCategory} />;
}
