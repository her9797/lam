import Link from "next/link";

import { MenuItemCard } from "@/components/menu/menu-item-card";
import { FloatingHomeBadge } from "@/components/navigation/floating-home-badge";
import { PrimaryNav } from "@/components/navigation/primary-nav";
import type { MenuCategory, MenuItem, StoreInfo } from "@/data/menu-data";

type HomeScreenProps = {
  store: StoreInfo;
  featuredCategory?: MenuCategory;
  featuredItems: MenuItem[];
};

export function HomeScreen({ store, featuredCategory, featuredItems }: HomeScreenProps) {
  return (
    <main className="page-shell">
      <FloatingHomeBadge active />
      <div className="phone-frame">
        <header className="hero-card">
          <p className="eyebrow">BAR LAM</p>
          <h1>{store.name}</h1>
          <p className="hero-copy">{store.subtitle}</p>
          <p className="hero-meta">{store.address}</p>
        </header>

        <PrimaryNav />

        <section className="content-card">
          <div className="section-header">
            <div>
              <p className="section-kicker">featured</p>
              <h2>{featuredCategory?.label ?? "대표"}</h2>
            </div>
            {featuredCategory ? (
              <Link className="section-arrow-link" href={`/menu/${featuredCategory.id}`}>
                <span className="section-arrow">›</span>
              </Link>
            ) : (
              <span className="section-arrow">›</span>
            )}
          </div>

          <div className="menu-list">
            {featuredItems.map((item) => (
              <MenuItemCard key={item.id} item={item} imageArea="home" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
