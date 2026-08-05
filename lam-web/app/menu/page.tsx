import { CategoryScreen } from "@/components/screens/category-screen";
import { getFeaturedCategory } from "@/services/menu-service";

export default function MenuPage() {
  const category = getFeaturedCategory();

  return <CategoryScreen category={category} />;
}
