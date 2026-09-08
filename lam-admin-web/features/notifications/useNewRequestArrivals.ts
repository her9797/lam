import type { RequestNotification } from "./model";
import { useNewArrivals } from "./useNewArrivals";

/**
 * The request-side binding of `useNewArrivals`, which holds the whole
 * baseline/pruning/stable-reference contract this relies on — see its doc
 * comment. Kept as a named hook so the request flow reads the same as the
 * order flow at the call site, and so `NotificationBell` never has to
 * spell out which of its two arrival streams it means.
 */
export function useNewRequestArrivals(
  notifications: RequestNotification[],
  isLoading: boolean,
): RequestNotification[] {
  return useNewArrivals(notifications, isLoading);
}
