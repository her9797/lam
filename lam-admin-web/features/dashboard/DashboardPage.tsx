"use client";

import "@/i18n/client";

import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/states/PageStates";
import { useBootstrapQuery } from "@/features/bootstrap/queries";
import { useCustomerRequestsQuery } from "@/features/requests/queries";
import { useSpecialRequestsQuery } from "@/features/special-requests/queries";

import { buildDashboardSummary, type DashboardSummary } from "./summary";

type ShortcutCard = {
  key: string;
  href: string;
  title: string;
  description: string;
  value: number;
};

// Every card links to the management route for the data it counts — the
// three built in this task (`/requests`, `/song-requests`,
// `/special-requests`) plus the menu/notice routes `AdminShell`'s nav
// already lists (Task 3) and Tasks 6/7 will implement. Linking ahead here
// matches the nav, which already does the same.
function buildCards(summary: DashboardSummary): ShortcutCard[] {
  return [
    {
      key: "general",
      href: "/requests",
      title: "손님 요청",
      description: "확인이 필요한 일반 요청",
      value: summary.pendingGeneralRequestCount,
    },
    {
      key: "song",
      href: "/song-requests",
      title: "노래 신청",
      description: "확인이 필요한 노래 신청",
      value: summary.pendingSongRequestCount,
    },
    {
      key: "special",
      href: "/special-requests",
      title: "특별 요청",
      description: "접수된 특별 요청",
      value: summary.specialRequestCount,
    },
    {
      key: "menu",
      href: "/menu",
      title: "메뉴 관리",
      description: "등록된 메뉴 항목",
      value: summary.menuItemCount,
    },
    {
      key: "notices",
      href: "/notices",
      title: "이벤트·공지",
      description: "등록된 공지 항목",
      value: summary.noticeCount,
    },
  ];
}

export function DashboardPage() {
  const bootstrapQuery = useBootstrapQuery();
  const requestsQuery = useCustomerRequestsQuery();
  const specialRequestsQuery = useSpecialRequestsQuery();

  const isLoading =
    bootstrapQuery.isLoading || requestsQuery.isLoading || specialRequestsQuery.isLoading;
  const failedQuery = [bootstrapQuery, requestsQuery, specialRequestsQuery].find(
    (query) => query.isError,
  );

  function retryAll() {
    if (bootstrapQuery.isError) {
      void bootstrapQuery.refetch();
    }
    if (requestsQuery.isError) {
      void requestsQuery.refetch();
    }
    if (specialRequestsQuery.isError) {
      void specialRequestsQuery.refetch();
    }
  }

  if (isLoading) {
    return <LoadingState label="대시보드를 불러오는 중입니다." />;
  }

  if (failedQuery || !bootstrapQuery.data || !requestsQuery.data || !specialRequestsQuery.data) {
    return (
      <ErrorState
        title="대시보드를 불러오지 못했습니다."
        message={
          failedQuery?.error instanceof Error ? failedQuery.error.message : undefined
        }
        onRetry={retryAll}
      />
    );
  }

  const summary = buildDashboardSummary(
    bootstrapQuery.data,
    requestsQuery.data,
    specialRequestsQuery.data,
  );
  const cards = buildCards(summary);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">대시보드</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.key} href={card.href} className="block">
            <Card className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">{card.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
