"use client";

import "@/i18n/client";

import { RiNotification3Line, RiVolumeMuteLine, RiVolumeUpLine } from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import {
  useUpdateCustomerRequestStatusesMutation,
  useUpdateCustomerRequestStatusMutation,
} from "@/features/requests/queries";
import { cn, formatCurrencyKRW } from "@/lib/utils";

import type { OrderNotification, RequestNotification, RequestNotificationKind } from "./model";
import { NotificationPanel } from "./NotificationPanel";
import { useNewArrivals } from "./useNewArrivals";
import { useNewRequestArrivals } from "./useNewRequestArrivals";
import { useNotificationSound } from "./useNotificationSound";
import { useOrderBroadcast } from "./useOrderBroadcast";
import { useOrderNotifications } from "./useOrderNotifications";
import { useRequestBroadcast } from "./useRequestBroadcast";
import { useRequestNotifications } from "./useRequestNotifications";

const KIND_HREF: Record<RequestNotificationKind, string> = {
  general: "/requests",
  song: "/song-requests",
};

export function NotificationBell() {
  const { t, i18n } = useTranslation("notifications");
  const router = useRouter();
  useRequestBroadcast();
  const { notifications, count: requestCount, isLoading, isError } = useRequestNotifications();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const arrivals = useNewRequestArrivals(notifications, isLoading);
  const sound = useNotificationSound();

  // New orders ride the same arrival-alarm path as guest requests (toast +
  // chime, plus a list in the panel below), but "read" for an order means
  // "dismissed on this device" (`useOrderNotifications`'s `dismiss`,
  // localStorage-backed) rather than the server-owned `pending`→`checked`
  // status requests use — `payment_orders` has no such server state. The
  // bell's badge counts both: an order the operator hasn't dismissed yet
  // is exactly as "unread" as a request they haven't checked.
  useOrderBroadcast();
  const orders = useOrderNotifications();
  const orderArrivals = useNewArrivals(orders.notifications, orders.isLoading);
  const count = requestCount + orders.count;

  const singleMutation = useUpdateCustomerRequestStatusMutation();
  const bulkMutation = useUpdateCustomerRequestStatusesMutation();

  // `t`, the active language and `sound.playChime` are read through this
  // ref rather than listed as dependencies of the arrival effects below.
  // `t`'s reference is normally stable, but `useNotificationSound()`
  // returns a fresh object every render, so its `playChime` would
  // otherwise resubscribe those effects on renders that have nothing to do
  // with a new arrival — e.g. a mute toggle — and both arrival lists are
  // "sticky" (each stays at its last non-empty value until the *next* real
  // arrival, by `useNewArrivals`'s design), so that unrelated re-fire
  // would replay an already-shown toast/chime. Keying each effect on its
  // own arrivals array alone is what makes "fires exactly once per real
  // arrival" hold. The ref itself is only ever written from inside an
  // effect (never during render) and only read from inside the arrival
  // effects below — this file's effects run in declaration order within
  // the same commit, so the value is always current by the time it's read.
  const latestRef = useRef({ t, language: i18n.language, playChime: sound.playChime });
  useEffect(() => {
    latestRef.current = { t, language: i18n.language, playChime: sound.playChime };
  });

  useEffect(() => {
    if (arrivals.length === 0) {
      return;
    }
    const { t, playChime } = latestRef.current;
    for (const notification of arrivals) {
      toast.add({
        title: t("newRequestToastTitle"),
        description: t(
          notification.kind === "song" ? "newRequestToastSong" : "newRequestToastGeneral",
          { tableNumber: notification.tableNumber, preview: notification.preview },
        ),
      });
    }
    // Chime once for the whole batch — per the confirmed requirement,
    // several requests landing together still means a single beep, not
    // one per request — while a toast is shown per request so each stays
    // legible.
    playChime();
  }, [arrivals]);

  // Separate from the request effect on purpose: the two flows are
  // independent, and merging them would mean a request and a sale landing
  // in the same commit could only ever produce one combined beep. They are
  // different events and each deserves its own.
  useEffect(() => {
    if (orderArrivals.length === 0) {
      return;
    }
    const { t, language, playChime } = latestRef.current;
    for (const order of orderArrivals) {
      toast.add({
        title: t("newOrderToastTitle"),
        description: t("newOrderToastBody", {
          tableNumber: order.tableNumber,
          menuItemName: order.menuItemName,
          amount: formatCurrencyKRW(order.amount, language),
        }),
      });
    }
    playChime();
  }, [orderArrivals]);

  function handleItemClick(notification: RequestNotification) {
    singleMutation.mutate({ id: notification.id, status: "checked" });
    router.push(KIND_HREF[notification.kind]);
  }

  function handleOrderItemClick(order: OrderNotification) {
    orders.dismiss(order.id);
    router.push("/orders");
  }

  function handleConfirmMarkAll() {
    bulkMutation.mutate({
      ids: notifications.map((notification) => notification.id),
      status: "checked",
    });
    setIsConfirmOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}
        aria-label={
          sound.isBlocked
            ? t("soundBlockedLabel")
            : sound.isMuted
              ? t("soundUnmuteLabel")
              : t("soundMuteLabel")
        }
        onClick={sound.isBlocked ? sound.enableSound : sound.toggleMuted}
      >
        {sound.isBlocked || sound.isMuted ? (
          <RiVolumeMuteLine className="size-4" aria-hidden="true" />
        ) : (
          <RiVolumeUpLine className="size-4" aria-hidden="true" />
        )}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "relative")}
          aria-label={count > 0 ? t("bellLabel", { count }) : t("bellLabelEmpty")}
        >
          <RiNotification3Line className="size-4" aria-hidden="true" />
          {count > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-400 px-1 text-[10px] font-medium text-white"
            >
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          <NotificationPanel
            notifications={notifications}
            isError={isError}
            isItemPending={(id) => singleMutation.isPending && singleMutation.variables?.id === id}
            onItemClick={handleItemClick}
            onMarkAllClick={() => setIsConfirmOpen(true)}
            isMarkAllPending={bulkMutation.isPending}
            orderNotifications={orders.notifications}
            onOrderItemClick={handleOrderItemClick}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("markAllConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("markAllConfirmBody", { count: notifications.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMarkAll}>
              {t("common:confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
