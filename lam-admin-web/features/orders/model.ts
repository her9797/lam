import type { DatePreset } from "./business-day";

/**
 * Mirrors `lam-api/internal/lamdata.PaymentOrder` — the admin read shape,
 * deliberately kept separate from `lam-web`'s customer-facing payment
 * contract per this repo's `AGENTS.md` rule that customer and admin
 * contracts stay decoupled. This is the `payment_orders` feature boundary:
 * no shared model, API path, or query key with `features/requests` or
 * `features/special-requests`.
 */
export type PaymentOrderStatus = "READY" | "DONE";

export type PaymentOrderPosSyncStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "NOT_CONFIGURED";

export type PaymentOrder = {
  orderId: string;
  menuItemId?: string;
  menuItemName: string;
  categoryName: string;
  tableNumber: string;
  amount: number;
  vat: number;
  suppliedAmount: number;
  taxFreeAmount: number;
  status: PaymentOrderStatus;
  paymentMethod?: string;
  paymentKey?: string;
  approvedAt?: string;
  posSyncStatus: PaymentOrderPosSyncStatus;
  posOrderId?: string;
  posSyncError?: string;
  createdAt: string;
};

export type PaymentOrderSort = "createdAt" | "amount";

export type SortOrder = "asc" | "desc";

export type OrderListQuery = {
  page: number;
  pageSize: number;
  status?: PaymentOrderStatus;
  posSyncStatus?: PaymentOrderPosSyncStatus;
  search: string;
  datePreset: DatePreset;
  sort: PaymentOrderSort;
  order: SortOrder;
};

/** Mirrors `lam-api/internal/lamdata.PaymentOrderPage`. */
export type OrderPageResult = {
  items: PaymentOrder[];
  page: number;
  pageSize: number;
  total: number;
};
