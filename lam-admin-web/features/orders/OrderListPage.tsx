"use client";

import "@/i18n/client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { ListToolbar } from "@/components/list/ListToolbar";
import { Pagination } from "@/components/list/Pagination";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/PageStates";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime } from "@/lib/utils";

import type { DatePreset } from "./business-day";
import { buildOrderListSearchParams, parseOrderListQuery } from "./list-query-url";
import type {
  OrderListQuery,
  PaymentOrder,
  PaymentOrderPosSyncStatus,
  PaymentOrderSort,
  PaymentOrderStatus,
} from "./model";
import { useOrdersPageQuery } from "./queries";

const SEARCH_DEBOUNCE_MS = 300;

// Translation keys in the `orders` namespace, not rendered text.
const STATUS_LABEL_KEY: Record<PaymentOrderStatus, string> = {
  READY: "statusReady",
  DONE: "statusDone",
};

const POS_SYNC_LABEL_KEY: Record<PaymentOrderPosSyncStatus, string> = {
  PENDING: "posSyncPending",
  SUCCEEDED: "posSyncSucceeded",
  FAILED: "posSyncFailed",
  NOT_CONFIGURED: "posSyncNotConfigured",
};

const DATE_PRESET_LABEL_KEY: Record<DatePreset, string> = {
  today: "datePresetToday",
  last7: "datePresetLast7",
  last30: "datePresetLast30",
  all: "datePresetAll",
};

// `style: "currency"` renders a currency symbol ("₩"), not a translated
// word, so this needs no i18n resource key of its own — unlike
// `lam-api`'s `menu_items.price`, which is a pre-formatted "10,000원"
// string from the backend, kept as-is regardless of UI language.
function formatAmount(amount: number, language: string): string {
  return new Intl.NumberFormat(language, {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Field list for the detail dialog, in display order. Labels are keys in
// the `orders` namespace. Optional fields (e.g. `paymentKey` on an unpaid
// `READY` order) fall back to "-" at render time rather than being
// filtered out of this list, so the dialog's shape stays identical
// regardless of the order's status.
const DETAIL_FIELDS: Array<{ key: keyof PaymentOrder; labelKey: string }> = [
  { key: "tableNumber", labelKey: "fieldTableNumber" },
  { key: "menuItemName", labelKey: "fieldMenuItem" },
  { key: "categoryName", labelKey: "fieldCategory" },
  { key: "amount", labelKey: "fieldAmount" },
  { key: "vat", labelKey: "fieldVat" },
  { key: "suppliedAmount", labelKey: "fieldSuppliedAmount" },
  { key: "taxFreeAmount", labelKey: "fieldTaxFreeAmount" },
  { key: "status", labelKey: "fieldStatus" },
  { key: "paymentMethod", labelKey: "fieldPaymentMethod" },
  { key: "paymentKey", labelKey: "fieldPaymentKey" },
  { key: "approvedAt", labelKey: "fieldApprovedAt" },
  { key: "posSyncStatus", labelKey: "fieldPosSyncStatus" },
  { key: "posOrderId", labelKey: "fieldPosOrderId" },
  { key: "posSyncError", labelKey: "fieldPosSyncError" },
  { key: "createdAt", labelKey: "fieldCreatedAt" },
];

const AMOUNT_FIELD_KEYS: Set<keyof PaymentOrder> = new Set(["amount", "vat", "suppliedAmount", "taxFreeAmount"]);
const DATE_FIELD_KEYS: Set<keyof PaymentOrder> = new Set(["approvedAt", "createdAt"]);

export function OrderListPage() {
  const { t, i18n } = useTranslation("orders");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = useMemo(() => parseOrderListQuery(searchParams), [searchParams]);

  const updateQuery = useCallback(
    (patch: Partial<OrderListQuery>) => {
      const params = buildOrderListSearchParams({ ...query, ...patch });
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [query, pathname, router],
  );

  // Local, immediately-updated search box synced to the URL only after
  // debouncing — same pattern as `RequestListPage`/`SpecialRequestPage`'s
  // search input.
  const [searchInput, setSearchInput] = useState(query.search);
  const [syncedSearch, setSyncedSearch] = useState(query.search);
  if (query.search !== syncedSearch) {
    setSyncedSearch(query.search);
    setSearchInput(query.search);
  }

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  useEffect(() => {
    if (debouncedSearch !== query.search) {
      updateQuery({ search: debouncedSearch, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const ordersQuery = useOrdersPageQuery(query);
  // Detail dialog is driven by an in-memory id, not a URL param — an
  // order's `paymentKey` is sensitive enough that it shouldn't round-trip
  // through the address bar/browser history.
  const [detailId, setDetailId] = useState<string | null>(null);

  if (ordersQuery.isLoading) {
    return <LoadingState label={t("loading")} />;
  }

  if (ordersQuery.isError) {
    return (
      <ErrorState
        title={t("errorTitle")}
        message={ordersQuery.error instanceof Error ? ordersQuery.error.message : undefined}
        onRetry={() => ordersQuery.refetch()}
      />
    );
  }

  const orders = ordersQuery.data?.items ?? [];
  const total = ordersQuery.data?.total ?? 0;
  const hasActiveFilter =
    Boolean(query.status && query.status !== "DONE") ||
    Boolean(query.posSyncStatus) ||
    query.datePreset !== "all" ||
    query.search.trim().length > 0;
  const detailOrder = orders.find((order) => order.orderId === detailId) ?? null;

  const STATUS_FILTER_LABELS: Record<string, string> = {
    all: t("common:filterAll"),
    READY: t("statusReady"),
    DONE: t("statusDone"),
  };
  const POS_SYNC_FILTER_LABELS: Record<string, string> = {
    all: t("common:filterAll"),
    PENDING: t("posSyncPending"),
    SUCCEEDED: t("posSyncSucceeded"),
    FAILED: t("posSyncFailed"),
    NOT_CONFIGURED: t("posSyncNotConfigured"),
  };
  const DATE_PRESET_LABELS: Record<string, string> = {
    today: t("datePresetToday"),
    last7: t("datePresetLast7"),
    last30: t("datePresetLast30"),
    all: t("datePresetAll"),
  };
  const SORT_LABELS: Record<string, string> = {
    createdAt: t("sortByCreatedAt"),
    amount: t("sortByAmount"),
  };

  function renderDetailValue(order: PaymentOrder, key: keyof PaymentOrder): string {
    const value = order[key];
    if (value === undefined || value === "") {
      return "-";
    }
    if (key === "status") {
      return t(STATUS_LABEL_KEY[order.status]);
    }
    if (key === "posSyncStatus") {
      return t(POS_SYNC_LABEL_KEY[order.posSyncStatus]);
    }
    if (AMOUNT_FIELD_KEYS.has(key)) {
      return formatAmount(value as number, i18n.language);
    }
    if (DATE_FIELD_KEYS.has(key)) {
      return formatDateTime(value as string, i18n.language);
    }
    return String(value);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>
        <span className="text-sm text-muted-foreground">
          {t("common:listTotalCount", { count: total })}
        </span>
      </div>

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t("searchPlaceholder")}
      >
        <Select
          value={query.datePreset}
          onValueChange={(value) => updateQuery({ datePreset: value as DatePreset, page: 1 })}
        >
          <SelectTrigger size="sm" aria-label={t("datePresetLabel")}>
            <SelectValue placeholder={t("datePresetLabel")}>
              {(value: string) => DATE_PRESET_LABELS[value] ?? value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{t("datePresetToday")}</SelectItem>
            <SelectItem value="last7">{t("datePresetLast7")}</SelectItem>
            <SelectItem value="last30">{t("datePresetLast30")}</SelectItem>
            <SelectItem value="all">{t("datePresetAll")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={query.status ?? "all"}
          onValueChange={(value) =>
            updateQuery({
              status: value === "all" ? undefined : (value as PaymentOrderStatus),
              page: 1,
            })
          }
        >
          <SelectTrigger size="sm" aria-label={t("statusFilterLabel")}>
            <SelectValue placeholder={t("statusFilterLabel")}>
              {(value: string) => STATUS_FILTER_LABELS[value] ?? value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common:filterAll")}</SelectItem>
            <SelectItem value="READY">{t("statusReady")}</SelectItem>
            <SelectItem value="DONE">{t("statusDone")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={query.posSyncStatus ?? "all"}
          onValueChange={(value) =>
            updateQuery({
              posSyncStatus: value === "all" ? undefined : (value as PaymentOrderPosSyncStatus),
              page: 1,
            })
          }
        >
          <SelectTrigger size="sm" aria-label={t("posSyncFilterLabel")}>
            <SelectValue placeholder={t("posSyncFilterLabel")}>
              {(value: string) => POS_SYNC_FILTER_LABELS[value] ?? value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common:filterAll")}</SelectItem>
            <SelectItem value="PENDING">{t("posSyncPending")}</SelectItem>
            <SelectItem value="SUCCEEDED">{t("posSyncSucceeded")}</SelectItem>
            <SelectItem value="FAILED">{t("posSyncFailed")}</SelectItem>
            <SelectItem value="NOT_CONFIGURED">{t("posSyncNotConfigured")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={query.sort}
          onValueChange={(value) => updateQuery({ sort: value as PaymentOrderSort, page: 1 })}
        >
          <SelectTrigger size="sm" aria-label={t("common:sortLabel")}>
            <SelectValue placeholder={t("common:sortLabel")}>
              {(value: string) => SORT_LABELS[value] ?? value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">{t("sortByCreatedAt")}</SelectItem>
            <SelectItem value="amount">{t("sortByAmount")}</SelectItem>
          </SelectContent>
        </Select>
      </ListToolbar>

      {orders.length === 0 ? (
        hasActiveFilter ? (
          <EmptyState
            title={t("common:listNoResultsTitle")}
            description={t("common:listNoResultsDescription")}
          />
        ) : (
          <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnApprovedAt")}</TableHead>
              <TableHead>{t("common:columnTable")}</TableHead>
              <TableHead>{t("columnMenuItem")}</TableHead>
              <TableHead>{t("columnAmount")}</TableHead>
              <TableHead>{t("columnStatus")}</TableHead>
              <TableHead>{t("columnPosSync")}</TableHead>
              <TableHead>{t("common:columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.orderId}>
                <TableCell>{formatDateTime(order.approvedAt ?? order.createdAt, i18n.language)}</TableCell>
                <TableCell>{order.tableNumber || "-"}</TableCell>
                <TableCell>
                  {order.menuItemName}
                  <span className="text-muted-foreground"> ({order.categoryName})</span>
                </TableCell>
                <TableCell>{formatAmount(order.amount, i18n.language)}</TableCell>
                <TableCell>{t(STATUS_LABEL_KEY[order.status])}</TableCell>
                <TableCell>{t(POS_SYNC_LABEL_KEY[order.posSyncStatus])}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDetailId(order.orderId)}
                  >
                    {t("viewDetail")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination
        page={query.page}
        pageSize={query.pageSize}
        total={total}
        onPageChange={(page) => updateQuery({ page })}
        onPageSizeChange={(pageSize) => updateQuery({ pageSize, page: 1 })}
      />

      <Dialog
        open={detailOrder !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("detailTitle")}</DialogTitle>
          </DialogHeader>
          {detailOrder ? (
            <dl className="flex flex-col gap-3">
              {DETAIL_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-0.5">
                  <dt className="text-sm font-medium text-foreground">{t(field.labelKey)}</dt>
                  <dd className="text-sm text-muted-foreground">
                    {renderDetailValue(detailOrder, field.key)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
