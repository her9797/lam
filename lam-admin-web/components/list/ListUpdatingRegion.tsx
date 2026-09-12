"use client";

import "@/i18n/client";

import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/**
 * Wraps the rows of a paginated list screen and reports when the next page
 * is on its way.
 *
 * Deliberately not a spinner that replaces the list. Swapping a full table
 * for a centred `LoadingState` on each page click is what made paging feel
 * broken: the document collapsed to a fraction of its height, the window
 * scrollbar appeared and disappeared, and the button under the operator's
 * pointer unmounted mid-click. Here the rows stay (see any list query's
 * `placeholderData`) under a 2px bar bonded to the top edge of the list —
 * and the bar's track holds its height whether or not the bar is running,
 * so the indicator can never cause the layout shift it exists to report on.
 *
 * The bar is indeterminate, with no `aria-valuenow`: a fetch in flight is
 * all the screen knows, never how far along it is.
 *
 * `active` and `stale` are two different facts and must not be collapsed
 * into one. `active` is "a request is open" — including a background
 * refetch on window focus or a Realtime broadcast, which should show the
 * bar but must never dim the rows an operator is reading. `stale` is "what
 * you are looking at is the previous page", which is what the dimming says.
 *
 * Under `prefers-reduced-motion: reduce` the global rule in
 * `app/globals.css` collapses the sweep animation, which is why the bar's
 * resting style (before any transform) is a full-width bar — it still reads
 * as busy while standing perfectly still.
 */
export function ListUpdatingRegion({
  active,
  stale,
  className,
  children,
}: {
  active: boolean;
  stale: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation("common");

  return (
    <div className={cn("flex flex-col gap-2", className)} aria-busy={stale}>
      <div
        data-slot="list-progress-track"
        className={cn("h-0.5 w-full overflow-hidden rounded-full", active && "bg-primary/15")}
      >
        {active ? (
          <div
            role="progressbar"
            aria-label={t("listUpdating")}
            className="list-progress-bar h-full w-full rounded-full bg-primary"
          />
        ) : null}
      </div>

      <div className={cn("transition-opacity duration-200", stale && "opacity-60")}>{children}</div>
    </div>
  );
}
