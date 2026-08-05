import { categories, menuItems } from "@/data/menu-data";

export function getFeaturedCategory() {
  return categories.find((category) => category.id === "signature") ?? categories[0];
}

export function getCategoryById(categoryId: string) {
  return categories.find((category) => category.id === categoryId);
}

export function getMenuItemsByCategory(categoryId: string) {
  return menuItems.filter((item) => item.categoryId === categoryId);
}

export function getFeaturedItems() {
  const featuredCategory = getFeaturedCategory();
  return featuredCategory ? getMenuItemsByCategory(featuredCategory.id).slice(0, 3) : [];
}
