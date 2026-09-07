"use client";

import "@/i18n/client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/PageStates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyKRW } from "@/lib/utils";

import { defaultDateRange, resolveDateRange } from "./date-range";
import type { TrendUnit } from "./model";
import { useSalesStatsQuery } from "./queries";

// One color per pie slice/bar, cycling through the theme's 5-step chart
// palette (`app/globals.css`'s `--chart-1`..`--chart-5`) rather than
// hardcoding colors, so charts stay correct in both light and dark theme.
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const TREND_UNIT_LABEL_KEY: Record<TrendUnit, string> = {
  day: "statsTrendUnitDay",
  week: "statsTrendUnitWeek",
  month: "statsTrendUnitMonth",
};

function ShareChart({
  data,
  nameKey,
  ariaLabel,
}: {
  data: Array<{ revenue: number; orderCount: number }>;
  nameKey: string;
  ariaLabel: string;
}) {
  return (
    <div role="img" aria-label={ariaLabel} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="revenue" nameKey={nameKey} outerRadius="80%">
            {data.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SalesStatsPage() {
  const { t, i18n } = useTranslation("orders");
  const initial = defaultDateRange();
  const [fromStr, setFromStr] = useState(initial.from);
  const [toStr, setToStr] = useState(initial.to);

  const initialResolved = resolveDateRange(initial.from, initial.to);
  const [lastValidRange, setLastValidRange] = useState<{ from: Date; to: Date }>(
    initialResolved.ok ? { from: initialResolved.from, to: initialResolved.to } : { from: new Date(), to: new Date() },
  );

  const currentResult = resolveDateRange(fromStr, toStr);
  // React's "adjust state during render" pattern (guarded, not an effect) —
  // same approach `RequestListPage`/`SpecialRequestPage` use to keep a local
  // input in sync with a derived value without an extra render's lag.
  if (
    currentResult.ok &&
    (currentResult.from.getTime() !== lastValidRange.from.getTime() ||
      currentResult.to.getTime() !== lastValidRange.to.getTime())
  ) {
    setLastValidRange({ from: currentResult.from, to: currentResult.to });
  }

  const statsQuery = useSalesStatsQuery(lastValidRange.from, lastValidRange.to);

  const dateControls = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stats-from">{t("statsFromLabel")}</Label>
        <Input
          id="stats-from"
          type="date"
          value={fromStr}
          onChange={(event) => setFromStr(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stats-to">{t("statsToLabel")}</Label>
        <Input id="stats-to" type="date" value={toStr} onChange={(event) => setToStr(event.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{t("statsTitle")}</h1>
      {dateControls}

      {!currentResult.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {t("statsInvalidRange")}
        </p>
      ) : statsQuery.isLoading ? (
        <LoadingState label={t("statsLoading")} />
      ) : statsQuery.isError ? (
        <ErrorState
          title={t("statsErrorTitle")}
          message={statsQuery.error instanceof Error ? statsQuery.error.message : undefined}
          onRetry={() => statsQuery.refetch()}
        />
      ) : !statsQuery.data || statsQuery.data.summary.orderCount === 0 ? (
        <EmptyState title={t("statsEmptyTitle")} description={t("statsEmptyDescription")} />
      ) : (
        <SalesStatsContent data={statsQuery.data} t={t} language={i18n.language} />
      )}
    </div>
  );
}

function SalesStatsContent({
  data,
  t,
  language,
}: {
  data: NonNullable<ReturnType<typeof useSalesStatsQuery>["data"]>;
  t: (key: string, options?: Record<string, unknown>) => string;
  language: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>{t("statsSummaryRevenue")}</CardDescription>
            <CardTitle className="text-2xl">{formatCurrencyKRW(data.summary.totalRevenue, language)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{t("statsSummaryOrderCount")}</CardDescription>
            <CardTitle className="text-2xl">{data.summary.orderCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{t("statsSummaryAverageOrderValue")}</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrencyKRW(data.summary.averageOrderValue, language)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("statsTrendTitle")} ({t(TREND_UNIT_LABEL_KEY[data.trend.unit])})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trend.buckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrencyKRW(Number(value), language)} />
                <Bar dataKey="revenue" fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("statsByCategoryTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ShareChart data={data.byCategory} nameKey="categoryName" ariaLabel={t("statsByCategoryTitle")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("statsByPaymentMethodTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ShareChart
              data={data.byPaymentMethod}
              nameKey="paymentMethod"
              ariaLabel={t("statsByPaymentMethodTitle")}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("statsByTableTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common:columnTable")}</TableHead>
                <TableHead>{t("columnRevenue")}</TableHead>
                <TableHead>{t("columnOrderCount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byTable.map((row) => (
                <TableRow key={row.tableNumber}>
                  <TableCell>{row.tableNumber || "-"}</TableCell>
                  <TableCell>{formatCurrencyKRW(row.revenue, language)}</TableCell>
                  <TableCell>{row.orderCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
