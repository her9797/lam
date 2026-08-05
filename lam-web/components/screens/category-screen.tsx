import Link from "next/link";

import { MenuItemCard } from "@/components/menu/menu-item-card";
import { FloatingCategoryNav } from "@/components/navigation/floating-category-nav";
import { FloatingHomeBadge } from "@/components/navigation/floating-home-badge";
import { ScrollTopButton } from "@/components/navigation/scroll-top-button";
import type { MenuCategory } from "@/data/menu-data";
import { categories, store } from "@/data/menu-data";
import { getMenuItemsByCategory } from "@/services/menu-service";

type CategoryScreenProps = {
  category: MenuCategory;
};

export function CategoryScreen({ category }: CategoryScreenProps) {
  const items = getMenuItemsByCategory(category.id);

  return (
    <main className="page-shell">
      <FloatingHomeBadge />
      <ScrollTopButton />
      <div className="phone-frame">
        <header className="hero-card compact">
          <p className="eyebrow">BAR LAM</p>
          <h1>{category.label}</h1>
          <p className="hero-copy">{store.name}의 {category.label} 전체 메뉴</p>
        </header>

        <FloatingCategoryNav categories={categories} activeCategoryId={category.id} />

        <section className="content-card">
          <div className="section-header">
            <div>
              <p className="section-kicker">category</p>
              <h2>{category.label}</h2>
            </div>
          </div>

          <div className="menu-list">
            {items.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
