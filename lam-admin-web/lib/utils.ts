import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats an ISO timestamp for display in request/special-request lists.
 * Mirrors `lam-web`'s `admin-screen.tsx` `formatCustomerRequestDate` (same
 * `ko-KR`, `MM/DD HH:mm`, 24h format) so operators see the same date shape
 * they're used to. Falls back to the raw string for an unparseable value
 * instead of throwing.
 */
export function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}
