import { useCallback, useMemo, useState } from "react";

import { useOrderNotificationsQuery } from "@/features/orders/queries";

import { readDismissedOrderIds, writeDismissedOrderIds } from "./order-dismissal";
import { toOrderNotifications } from "./order-selectors";

/**
 * "An order just came in" alarm feed — the order-side counterpart of
 * `useRequestNotifications`. Built from recently completed
 * (`payment_orders.status = "DONE"`) orders because that is the moment an
 * order actually needs the operator's attention — the point is noticing
 * the order, not recording the sale.
 *
 * `count`/`notifications` only reflect orders not yet dismissed via
 * `dismiss(id)`. Unlike customer requests, `payment_orders` has no
 * server-owned read state, so "처리됨" here is a client-only concept
 * persisted to `localStorage` (`order-dismissal.ts`) rather than a status
 * flip on the server — same trade-off already made for the mute
 * preference in `useNotificationSound`. This feeds arrival detection
 * (`useNewArrivals`) for the toast/chime and the panel's list, both driven
 * off the same undismissed set.
 */
export function useOrderNotifications() {
  const ordersQuery = useOrderNotificationsQuery();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => readDismissedOrderIds());

  const allOrders = useMemo(
    () => (ordersQuery.data ? toOrderNotifications(ordersQuery.data) : []),
    [ordersQuery.data],
  );

  const notifications = useMemo(
    () => allOrders.filter((order) => !dismissedIds.has(order.id)),
    [allOrders, dismissedIds],
  );

  const dismiss = useCallback((id: string) => {
    setDismissedIds((previous) => {
      if (previous.has(id)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(id);
      writeDismissedOrderIds(next);
      return next;
    });
  }, []);

  return {
    notifications,
    count: notifications.length,
    isLoading: ordersQuery.isLoading,
    dismiss,
  };
}
