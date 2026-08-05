import type { MenuItem } from "@/data/menu-data";

type MenuItemCardProps = {
  item: MenuItem;
};

export function MenuItemCard({ item }: MenuItemCardProps) {
  return (
    <article className="menu-item">
      <div className="menu-icon">{item.name.slice(0, 1)}</div>
      <div className="menu-copy">
        {item.badge ? <p className="menu-badge">{item.badge}</p> : null}
        <h3>{item.name}</h3>
        <p>{item.description}</p>
      </div>
      <div className="menu-price">{item.price}</div>
    </article>
  );
}
