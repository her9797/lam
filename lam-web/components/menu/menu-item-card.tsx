import type { MenuItem } from "@/data/menu-data";

type MenuItemCardProps = {
  item: MenuItem;
  imageArea?: "home" | "menu";
};

export function MenuItemCard({ item, imageArea = "menu" }: MenuItemCardProps) {
  const preferredImages = item.images?.filter((image) =>
    imageArea === "home" ? image.displayArea === "home" || image.displayArea === "both" : image.displayArea === "menu" || image.displayArea === "both",
  );
  const fallbackImages =
    imageArea === "home"
      ? item.images?.filter((image) => image.displayArea === "menu")
      : item.images;
  const candidateImages = preferredImages?.length ? preferredImages : fallbackImages;
  const primaryImage = candidateImages?.find((image) => image.isPrimary) ?? candidateImages?.[0];

  return (
    <article className="menu-item">
      <div className="menu-icon">
        {primaryImage ? (
          <img
            src={primaryImage.contentUrl}
            alt={item.name}
            className="menu-icon-image"
            style={{ objectPosition: `${primaryImage.focusX}% ${primaryImage.focusY}%` }}
          />
        ) : (
          item.name.slice(0, 1)
        )}
      </div>
      <div className="menu-copy">
        {item.badge ? <p className="menu-badge">{item.badge}</p> : null}
        <h3>{item.name}</h3>
        <p>{item.description}</p>
      </div>
      <div className="menu-price">{item.price}</div>
    </article>
  );
}
