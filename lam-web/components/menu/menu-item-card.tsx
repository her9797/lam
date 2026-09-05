"use client";

import { useEffect, useId, useState } from "react";

import type { MenuItem } from "@/data/menu-data";
import { getMenuItemDetail } from "@/lib/menu-item-detail";

type MenuItemCardProps = {
  item: MenuItem;
  imageArea?: "home" | "menu";
};

export function MenuItemCard({ item, imageArea = "menu" }: MenuItemCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const detail = getMenuItemDetail(item);
  const preferredImages = item.images?.filter((image) =>
    imageArea === "home" ? image.displayArea === "home" || image.displayArea === "both" : image.displayArea === "menu" || image.displayArea === "both",
  );
  const fallbackImages =
    imageArea === "home"
      ? item.images?.filter((image) => image.displayArea === "menu")
      : item.images;
  const candidateImages = preferredImages?.length ? preferredImages : fallbackImages;
  const primaryImage = candidateImages?.find((image) => image.isPrimary) ?? candidateImages?.[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className="menu-item menu-item-button"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
      >
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
          <h3>{item.name}</h3>
          <p>{item.description}</p>
        </div>
        <div className="menu-side">
          <span
            className={item.badge ? "menu-badge" : "menu-badge menu-badge-placeholder"}
            data-badge-color={item.badgeColor || "green"}
            aria-hidden={item.badge ? undefined : true}
          >
            {item.badge || "badge"}
          </span>
          <span className="menu-price">{item.price}</span>
        </div>
      </button>

      {isOpen ? (
        <div
          className="table-session-modal-backdrop"
          role="presentation"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="table-session-modal menu-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="section-kicker">menu detail</p>
            <h2 id={titleId}>{detail.name}</h2>
            <p className="menu-detail-price">{detail.price}</p>
            <p className="menu-detail-description" id={descriptionId}>
              {detail.description || "메뉴 설명이 준비 중입니다."}
            </p>
            <div className="menu-detail-actions">
              <button
                className="request-compose-button menu-detail-order-button"
                type="button"
                disabled
              >
                주문
              </button>
              <button
                className="table-session-modal-close menu-detail-close-button"
                type="button"
                autoFocus
                onClick={() => setIsOpen(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
