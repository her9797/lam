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
import { cn } from "@/lib/utils";

import type { RequestNotification, RequestNotificationKind } from "./model";
import { NotificationPanel } from "./NotificationPanel";
import { useNewRequestArrivals } from "./useNewRequestArrivals";
import { useNotificationSound } from "./useNotificationSound";
import { useRequestBroadcast } from "./useRequestBroadcast";
import { useRequestNotifications } from "./useRequestNotifications";

const KIND_HREF: Record<RequestNotificationKind, string> = {
  general: "/requests",
  song: "/song-requests",
};

export function NotificationBell() {
  const { t } = useTranslation("notifications");
  const router = useRouter();
  useRequestBroadcast();
  const { notifications, count, isLoading, isError } = useRequestNotifications();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const arrivals = useNewRequestArrivals(notifications, isLoading);
  const sound = useNotificationSound();

  const singleMutation = useUpdateCustomerRequestStatusMutation();
  const bulkMutation = useUpdateCustomerRequestStatusesMutation();

  // `t` and `sound.playChime` are read through this ref rather than listed
  // as dependencies of the arrivals effect below. `t`'s reference is
  // normally stable, but `useNotificationSound()` returns a fresh object
  // every render, so its `playChime` would otherwise resubscribe that
  // effect on renders that have nothing to do with a new arrival — e.g. a
  // mute toggle — and `arrivals` is "sticky" (stays at its last non-empty
  // value until the *next* real arrival, by `useNewRequestArrivals`'s
  // design), so that unrelated re-fire would replay the same already-shown
  // toast/chime for requests that arrived earlier. Keying the effect on
  // `arrivals` alone is what makes "fires exactly once per real arrival"
  // hold. The ref itself is only ever written from inside an effect (never
  // during render) and only read from inside the arrivals effect below —
  // this file's own two effects run in declaration order within the same
  // commit, so the value is always current by the time it's read.
  const latestRef = useRef({ t, playChime: sound.playChime });
  useEffect(() => {
    latestRef.current = { t, playChime: sound.playChime };
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

  function handleItemClick(notification: RequestNotification) {
    singleMutation.mutate({ id: notification.id, status: "checked" });
    router.push(KIND_HREF[notification.kind]);
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
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground"
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
