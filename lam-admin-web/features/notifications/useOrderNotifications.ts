import { useMemo } from "react";

import { useOrderNotificationsQuery } from "@/features/orders/queries";

import { toOrderNotifications } from "./order-selectors";

/**
 * Read-only alarm view of recently completed sales, the order-side
 * counterpart of `useRequestNotifications`.
 *
 * It intentionally exposes no `count`: unlike customer requests, orders
 * have no server-owned read state, so there is no defensible number to put
 * on the bell badge — every sale would stay "unread" forever. This feeds
 * arrival detection (`useNewArrivals`) for the toast and chime only.
 */
export function useOrderNotifications() {
  const ordersQuery = useOrderNotificationsQuery();

  const notifications = useMemo(
    () => (ordersQuery.data ? toOrderNotifications(ordersQuery.data) : []),
    [ordersQuery.data],
  );

  return {
    notifications,
    isLoading: ordersQuery.isLoading,
  };
}
