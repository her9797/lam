"use client";

import "@/i18n/client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

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

// Translation keys in the `requests` namespace, not rendered text.
const STATUS_LABEL_KEY: Record<CustomerRequestStatus, string> = {
  pending: "statusPending",
  checked: "statusChecked",
  completed: "statusCompleted",
};

// Which status a "next action" button on a row moves it to, and the label
// key for that button — mirrors `admin-screen.tsx`'s `handleCustomerRequestStatusChange`
// two-step flow (pending -> checked -> completed). A completed request has
// no next action.
const NEXT_STATUS: Partial<
  Record<CustomerRequestStatus, { status: CustomerRequestStatus; labelKey: string }>
> = {
  pending: { status: "checked", labelKey: "actionCheck" },
  checked: { status: "completed", labelKey: "actionComplete" },
};

export type RequestListPageKind = "general" | "song";

const COPY_KEYS: Record<
  RequestListPageKind,
  { title: string; loadingLabel: string; emptyTitle: string; emptyDescription: string }
> = {
  general: {
    title: "generalTitle",
    loadingLabel: "generalLoading",
    emptyTitle: "generalEmptyTitle",
    emptyDescription: "generalEmptyDescription",
  },
  song: {
    title: "songTitle",
    loadingLabel: "songLoading",
    emptyTitle: "songEmptyTitle",
    emptyDescription: "songEmptyDescription",
  },
};

export function RequestListPage({ kind }: { kind: RequestListPageKind }) {
  const { t, i18n } = useTranslation("requests");
  const requestsQuery = useCustomerRequestsQuery();
  const statusMutation = useUpdateCustomerRequestStatusMutation();
  const copyKeys = COPY_KEYS[kind];

  const requests = useMemo(() => {
    if (!requestsQuery.data) {
      return [];
    }
    return kind === "song"
      ? selectSongRequests(requestsQuery.data)
      : selectGeneralRequests(requestsQuery.data);
  }, [requestsQuery.data, kind]);

  if (requestsQuery.isLoading) {
    return <LoadingState label={t(copyKeys.loadingLabel)} />;
  }

  if (requestsQuery.isError) {
    return (
      <ErrorState
        title={t("errorTitle")}
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
      <h1 className="text-lg font-semibold text-foreground">{t(copyKeys.title)}</h1>

      {statusMutation.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {statusMutation.error instanceof Error
            ? statusMutation.error.message
            : t("statusChangeFailed")}
        </p>
      ) : null}

      {requests.length === 0 ? (
        <EmptyState title={t(copyKeys.emptyTitle)} description={t(copyKeys.emptyDescription)} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common:columnCreatedAt")}</TableHead>
              <TableHead>{t("common:columnTable")}</TableHead>
              <TableHead>{t("columnText")}</TableHead>
              <TableHead>{t("columnStatus")}</TableHead>
              <TableHead>{t("common:columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const next = NEXT_STATUS[request.status];
              return (
                <TableRow key={request.id}>
                  <TableCell>{formatDateTime(request.createdAt, i18n.language)}</TableCell>
                  <TableCell>{request.tableNumber || "-"}</TableCell>
                  <TableCell className="whitespace-normal">
                    {kind === "song" ? stripSongRequestPrefix(request.text) : request.text}
                  </TableCell>
                  <TableCell>{t(STATUS_LABEL_KEY[request.status])}</TableCell>
                  <TableCell>
                    {next ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isRowMutating(request.id)}
                        onClick={() => handleAdvance(request)}
                      >
                        {t(next.labelKey)}
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
