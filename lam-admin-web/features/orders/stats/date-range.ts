/**
 * Converts the sales-stats screen's two `<input type="date">` values (plain
 * `YYYY-MM-DD` strings, no time component) into the absolute `[from, to)`
 * instant range `GET /api/v1/admin/payment-orders/stats` expects.
 *
 * Parsing happens in the browser, against the operator's own local clock —
 * the same approach `features/orders/business-day.ts` uses for the
 * order-history screen's date presets, for the same reason: it keeps
 * `lam-api` free of any server-side timezone policy for filtering.
 */

export type DateRangeResult = { ok: true; from: Date; to: Date } | { ok: false };

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(value: string): Date | null {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  // Guards against e.g. "2026-02-30", which `Date` would otherwise silently
  // roll forward into March.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/**
 * Resolves the picked `[fromDateStr, toDateStr]` calendar range to an
 * absolute `[from, to)` instant range. `to` is the midnight that *starts
 * the day after* `toDateStr`, so a range where `from` and `to` are the same
 * calendar date still covers that entire day (an inclusive, one-day range),
 * not zero orders.
 */
export function resolveDateRange(fromDateStr: string, toDateStr: string): DateRangeResult {
  const from = parseDateOnly(fromDateStr);
  const toDayStart = parseDateOnly(toDateStr);
  if (!from || !toDayStart) {
    return { ok: false };
  }
  if (from.getTime() > toDayStart.getTime()) {
    return { ok: false };
  }

  const to = new Date(toDayStart);
  to.setDate(to.getDate() + 1);

  return { ok: true, from, to };
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const DEFAULT_RANGE_DAYS = 30;

/**
 * The screen's initial range on first load: the 30 days up to and
 * including `reference` (defaults to now).
 */
export function defaultDateRange(reference: Date = new Date()): { from: string; to: string } {
  const to = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const from = new Date(to);
  from.setDate(from.getDate() - DEFAULT_RANGE_DAYS);
  return { from: formatDateOnly(from), to: formatDateOnly(to) };
}
