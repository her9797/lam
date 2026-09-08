"use client";

import "@/i18n/client";

import { RiCheckDoubleLine } from "@remixicon/react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { formatCurrencyKRW, formatDateTime } from "@/lib/utils";

import type { OrderNotification, RequestNotification, RequestNotificationKind } from "./model";

const KIND_LABEL_KEY: Record<RequestNotificationKind, string> = {
  general: "kindGeneral",
  song: "kindSong",
};

export type NotificationPanelProps = {
  notifications: RequestNotification[];
  isError: boolean;
  isItemPending: (id: string) => boolean;
  onItemClick: (notification: RequestNotification) => void;
  onMarkAllClick: () => void;
  isMarkAllPending: boolean;
  /**
   * Orders that just came in and haven't been dismissed yet, shown as a
   * feed below the guest-request list. Deliberately separate from
   * `notifications`/`onItemClick` above: an order's "read" state is
   * client-only (`useOrderNotifications`'s `dismiss`, kept in
   * `localStorage` — see `order-dismissal.ts`), not the server-owned
   * `pending`→`checked` status requests use, so there is no "모두 확인"
   * bulk action for orders and no separate pending/loading props — each
   * click's `onOrderItemClick` removes that order from this list
   * immediately.
   */
  orderNotifications: OrderNotification[];
  onOrderItemClick: (order: OrderNotification) => void;
};

export function NotificationPanel({
  notifications,
  isError,
  isItemPending,
  onItemClick,
  onMarkAllClick,
  isMarkAllPending,
  orderNotifications,
  onOrderItemClick,
}: NotificationPanelProps) {
  const { t, i18n } = useTranslation("notifications");
  const hasGeneralRequest = notifications.some((notification) => notification.kind === "general");

  return (
    <div className="flex max-h-[28rem] flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-foreground/5 px-4 py-3">
        <span className="font-heading text-sm font-medium">{t("panelTitle")}</span>
        {hasGeneralRequest ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isMarkAllPending}
            onClick={onMarkAllClick}
          >
            <RiCheckDoubleLine className="size-4" aria-hidden="true" />
            {t("markAllChecked")}
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isError ? (
          <p role="alert" className="px-2 py-4 text-sm text-destructive">
            {t("loadFailed")}
          </p>
        ) : notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {notifications.map((notification) => (
              <li key={`${notification.kind}:${notification.id}`}>
                <button
                  type="button"
                  disabled={isItemPending(notification.id)}
                  onClick={() => onItemClick(notification)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-2xl px-3 py-2 text-left text-sm hover:bg-foreground/5 disabled:opacity-50"
                >
                  <span className="flex w-full items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{t(KIND_LABEL_KEY[notification.kind])}</span>
                    <span>{formatDateTime(notification.createdAt, i18n.language)}</span>
                  </span>
                  <span className="line-clamp-2 w-full text-foreground">
                    {notification.tableNumber ? `${notification.tableNumber} · ` : ""}
                    {notification.preview}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {orderNotifications.length > 0 ? (
          <div className="mt-2 border-t border-foreground/5 pt-2">
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
              {t("ordersPanelTitle")}
            </p>
            <ul className="flex flex-col gap-1">
              {orderNotifications.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => onOrderItemClick(order)}
                    className="flex w-full flex-col items-start gap-0.5 rounded-2xl px-3 py-2 text-left text-sm hover:bg-foreground/5"
                  >
                    <span className="flex w-full items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{t("kindOrder")}</span>
                      <span>{formatDateTime(order.approvedAt, i18n.language)}</span>
                    </span>
                    <span className="line-clamp-2 w-full text-foreground">
                      {order.tableNumber} · {order.menuItemName} ·{" "}
                      {formatCurrencyKRW(order.amount, i18n.language)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
