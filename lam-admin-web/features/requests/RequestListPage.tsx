"use client";

import "@/i18n/client";

import { useMemo } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/states/PageStates";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  selectGeneralRequests,
  selectSongRequests,
  stripSongRequestPrefix,
} from "@/features/dashboard/summary";
import { formatDateTime } from "@/lib/utils";

import type { CustomerRequest, CustomerRequestStatus } from "./model";
import { useCustomerRequestsQuery, useUpdateCustomerRequestStatusMutation } from "./queries";

const STATUS_LABEL: Record<CustomerRequestStatus, string> = {
  pending: "미처리",
  checked: "확인",
  completed: "처리완료",
};

// Which status a "next action" button on a row moves it to, and the label
// for that button — mirrors `admin-screen.tsx`'s `handleCustomerRequestStatusChange`
// two-step flow (pending -> checked -> completed). A completed request has
// no next action.
const NEXT_STATUS: Partial<
  Record<CustomerRequestStatus, { status: CustomerRequestStatus; label: string }>
> = {
  pending: { status: "checked", label: "확인" },
  checked: { status: "completed", label: "처리완료" },
};

export type RequestListPageKind = "general" | "song";

const COPY: Record<
  RequestListPageKind,
  { title: string; loadingLabel: string; emptyTitle: string; emptyDescription: string }
> = {
  general: {
    title: "손님 요청",
    loadingLabel: "손님 요청을 불러오는 중입니다.",
    emptyTitle: "대기 중인 손님 요청이 없습니다.",
    emptyDescription: "새 요청이 들어오면 이 목록에 표시됩니다.",
  },
  song: {
    title: "노래 신청",
    loadingLabel: "노래 신청을 불러오는 중입니다.",
    emptyTitle: "대기 중인 노래 신청이 없습니다.",
    emptyDescription: "새 신청이 들어오면 이 목록에 표시됩니다.",
  },
};

export function RequestListPage({ kind }: { kind: RequestListPageKind }) {
  const requestsQuery = useCustomerRequestsQuery();
  const statusMutation = useUpdateCustomerRequestStatusMutation();
  const copy = COPY[kind];

  const requests = useMemo(() => {
    if (!requestsQuery.data) {
      return [];
    }
    return kind === "song"
      ? selectSongRequests(requestsQuery.data)
      : selectGeneralRequests(requestsQuery.data);
  }, [requestsQuery.data, kind]);

  if (requestsQuery.isLoading) {
    return <LoadingState label={copy.loadingLabel} />;
  }

  if (requestsQuery.isError) {
    return (
      <ErrorState
        title="요청 목록을 불러오지 못했습니다."
        message={requestsQuery.error instanceof Error ? requestsQuery.error.message : undefined}
        onRetry={() => requestsQuery.refetch()}
      />
    );
  }

  function isRowMutating(id: string): boolean {
    return statusMutation.isPending && statusMutation.variables?.id === id;
  }

  function handleAdvance(request: CustomerRequest) {
    const next = NEXT_STATUS[request.status];
    if (!next) {
      return;
    }
    statusMutation.mutate({ id: request.id, status: next.status });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>

      {statusMutation.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {statusMutation.error instanceof Error
            ? statusMutation.error.message
            : "요청 상태 변경에 실패했습니다."}
        </p>
      ) : null}

      {requests.length === 0 ? (
        <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>생성 시각</TableHead>
              <TableHead>테이블</TableHead>
              <TableHead>내용</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const next = NEXT_STATUS[request.status];
              return (
                <TableRow key={request.id}>
                  <TableCell>{formatDateTime(request.createdAt)}</TableCell>
                  <TableCell>{request.tableNumber || "-"}</TableCell>
                  <TableCell className="whitespace-normal">
                    {kind === "song" ? stripSongRequestPrefix(request.text) : request.text}
                  </TableCell>
                  <TableCell>{STATUS_LABEL[request.status]}</TableCell>
                  <TableCell>
                    {next ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isRowMutating(request.id)}
                        onClick={() => handleAdvance(request)}
                      >
                        {next.label}
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
