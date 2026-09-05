import { useEffect, useRef, useState } from "react";

import type { RequestNotification } from "./model";

/**
 * Detects requests that newly became pending since the last time
 * `notifications` was seen, for the toast (this hook's first consumer) and
 * the alarm sound (`useNotificationSound`) — both fire on the exact same
 * event, so this is the one place that event is computed, not duplicated
 * per consumer.
 *
 * The confirmed requirement's "baseline" rule lives here: the first
 * successful load seeds the seen-id set without reporting anything (an
 * admin opening the app for the first time shouldn't get a toast/sound
 * burst for every already-pending request). Only requests that appear
 * *after* that baseline are arrivals. IDs that later disappear (checked,
 * completed, or deleted) are pruned from the seen set rather than left to
 * accumulate — see `docs/plans/2026-09-04-admin-request-notifications.md`.
 *
 * The returned array's identity only changes when there is something new to
 * report — an unrelated re-render with the same `notifications` content
 * does not produce a new reference, so a consumer's
 * `useEffect(() => {...}, [arrivals])` fires exactly once per real arrival,
 * never on every render.
 *
 * `isLoading` gates when the baseline is allowed to seed. Before the
 * underlying query resolves for the first time, `notifications` is an
 * empty placeholder (`useRequestNotifications` returns `[]` while
 * loading) — that placeholder must never itself become the baseline, or
 * every already-pending request in the real first response gets
 * misreported as a brand-new arrival the instant it loads (caught via the
 * Playwright e2e suite, not the mocked unit tests, which never exercise a
 * real loading→loaded transition). Seeding only starts once `isLoading`
 * has gone false, using whatever `notifications` holds at that point —
 * which by then is the real first page of data.
 */
export function useNewRequestArrivals(
  notifications: RequestNotification[],
  isLoading: boolean,
): RequestNotification[] {
  const [arrivals, setArrivals] = useState<RequestNotification[]>([]);
  const seenIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const currentIds = new Set(notifications.map((notification) => notification.id));

    if (seenIdsRef.current === null) {
      seenIdsRef.current = currentIds;
      return;
    }

    const seenIds = seenIdsRef.current;
    const newOnes = notifications.filter((notification) => !seenIds.has(notification.id));
    seenIdsRef.current = currentIds;

    if (newOnes.length > 0) {
      setArrivals(newOnes);
    }
  }, [notifications, isLoading]);

  return arrivals;
}
