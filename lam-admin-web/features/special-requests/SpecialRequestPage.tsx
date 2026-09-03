"use client";

import "@/i18n/client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/PageStates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

import type { SpecialRequest } from "./model";
import { useDeleteSpecialRequestMutation, useSpecialRequestsQuery } from "./queries";

// Field list and labels mirror `admin-screen.tsx`'s special-request detail
// modal exactly (테이블/이름/나이/사는 곳/연락처/이상형/하고 싶은 말) so the
// operator sees the same fields they already know from the current app.
const DETAIL_FIELDS: Array<{ key: keyof SpecialRequest; label: string }> = [
  { key: "tableNumber", label: "테이블" },
  { key: "name", label: "이름" },
  { key: "age", label: "나이" },
  { key: "residence", label: "사는 곳" },
  { key: "instagram", label: "연락처" },
  { key: "idealType", label: "이상형" },
  { key: "text", label: "하고 싶은 말" },
];

export function SpecialRequestPage() {
  const requestsQuery = useSpecialRequestsQuery();
  const deleteMutation = useDeleteSpecialRequestMutation();
  // Both dialogs are driven by in-memory ids only (never a URL/query param),
  // so a guest's personal fields never end up in the address bar or browser
  // history.
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  if (requestsQuery.isLoading) {
    return <LoadingState label="특별 요청을 불러오는 중입니다." />;
  }

  if (requestsQuery.isError) {
    return (
      <ErrorState
        title="특별 요청을 불러오지 못했습니다."
        message={requestsQuery.error instanceof Error ? requestsQuery.error.message : undefined}
        onRetry={() => requestsQuery.refetch()}
      />
    );
  }

  const requests = requestsQuery.data ?? [];
  const detailRequest = requests.find((request) => request.id === detailId) ?? null;
  const deleteTarget = requests.find((request) => request.id === pendingDeleteId) ?? null;

  function isRowDeleting(id: string): boolean {
    return deleteMutation.isPending && deleteMutation.variables === id;
  }

  function handleConfirmDelete() {
    if (!pendingDeleteId) {
      return;
    }
    const targetId = pendingDeleteId;
    deleteMutation.mutate(targetId, {
      onSuccess: () => {
        setPendingDeleteId(null);
        if (detailId === targetId) {
          setDetailId(null);
        }
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">특별 요청</h1>

      {deleteMutation.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {deleteMutation.error instanceof Error
            ? deleteMutation.error.message
            : "특별 요청 삭제에 실패했습니다."}
        </p>
      ) : null}

      {requests.length === 0 ? (
        <EmptyState
          title="접수된 특별 요청이 없습니다."
          description="새 요청이 들어오면 이 목록에 표시됩니다."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>생성 시각</TableHead>
              <TableHead>테이블</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{formatDateTime(request.createdAt)}</TableCell>
                <TableCell>{request.tableNumber || "-"}</TableCell>
                <TableCell>{request.name}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailId(request.id)}
                    >
                      상세보기
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isRowDeleting(request.id)}
                      onClick={() => setPendingDeleteId(request.id)}
                    >
                      삭제
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={detailRequest !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>특별 요청 상세</DialogTitle>
          </DialogHeader>
          {detailRequest ? (
            <dl className="flex flex-col gap-3">
              {DETAIL_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-0.5">
                  <dt className="text-sm font-medium text-foreground">{field.label}</dt>
                  <dd className="text-sm text-muted-foreground">{detailRequest[field.key]}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>특별 요청을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `${deleteTarget.name}님의 특별 요청을 삭제합니다. ` : ""}
              삭제하면 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction disabled={deleteMutation.isPending} onClick={handleConfirmDelete}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
