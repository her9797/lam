/**
 * Mirrors `lam-api/internal/lamdata.PaymentOrderStats` and its nested
 * types. Aggregated over DONE orders only, within a caller-supplied
 * `[from, to)` range — see `lam-api`'s `store.Repository.GetPaymentOrderStats`
 * doc comment for the bucketing/timezone rules.
 */
export type SalesStatsSummary = {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
};

export type TrendUnit = "day" | "week" | "month";

export type TrendBucket = {
  bucket: string;
  revenue: number;
  orderCount: number;
};

export type SalesTrend = {
  unit: TrendUnit;
  buckets: TrendBucket[];
};

export type CategoryStat = {
  categoryName: string;
  revenue: number;
  orderCount: number;
};

export type PaymentMethodStat = {
  paymentMethod: string;
  revenue: number;
  orderCount: number;
};

export type TableStat = {
  tableNumber: string;
  revenue: number;
  orderCount: number;
};

export type SalesStats = {
  summary: SalesStatsSummary;
  trend: SalesTrend;
  byCategory: CategoryStat[];
  byPaymentMethod: PaymentMethodStat[];
  byTable: TableStat[];
};
