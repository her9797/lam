"use client";

import "@/i18n/client";

import { useState } from "react";
import type { FormEvent } from "react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/PageStates";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useBootstrapQuery } from "@/features/bootstrap/queries";
import type { NoticeItem } from "@/features/bootstrap/model";

import {
  useCreateNoticeMutation,
  useDeleteNoticeMutation,
  useUpdateNoticeMutation,
  useUpdateNoticeVisibilityMutation,
  validateNoticeText,
} from "./api";

type NoticeFormState = {
  text: string;
  isVisible: boolean;
};

const EMPTY_FORM: NoticeFormState = { text: "", isVisible: true };

export function NoticeManagementPage() {
  const bootstrapQuery = useBootstrapQuery();

  const createMutation = useCreateNoticeMutation();
  const updateMutation = useUpdateNoticeMutation();
  const visibilityMutation = useUpdateNoticeVisibilityMutation();
  const deleteMutation = useDeleteNoticeMutation();

  const [form, setForm] = useState<NoticeFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingError, setEditingError] = useState<string | undefined>(undefined);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (bootstrapQuery.isLoading) {
    return <LoadingState label="공지/이벤트 정보를 불러오는 중입니다." />;
  }

  if (bootstrapQuery.isError) {
    return (
      <ErrorState
        title="공지/이벤트 정보를 불러오지 못했습니다."
        message={bootstrapQuery.error instanceof Error ? bootstrapQuery.error.message : undefined}
        onRetry={() => bootstrapQuery.refetch()}
      />
    );
  }

  const notices = bootstrapQuery.data?.notices ?? [];
  const deleteTarget = notices.find((notice) => notice.id === pendingDeleteId) ?? null;

  function isVisibilityPending(id: string): boolean {
    return visibilityMutation.isPending && visibilityMutation.variables?.id === id;
  }

  function isUpdatePending(id: string): boolean {
    return updateMutation.isPending && updateMutation.variables?.id === id;
  }

  function isDeletePending(id: string): boolean {
    return deleteMutation.isPending && deleteMutation.variables === id;
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateNoticeText(form.text);
    setFormError(error);
    if (error) {
      return;
    }

    createMutation.mutate(
      { text: form.text.trim(), isVisible: form.isVisible },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM);
          setStatusMessage("공지/이벤트를 등록했습니다.");
        },
      },
    );
  }

  function beginEdit(notice: NoticeItem) {
    setEditingId(notice.id);
    setEditingText(notice.text);
    setEditingError(undefined);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingText("");
    setEditingError(undefined);
  }

  function saveEdit(id: string) {
    const error = validateNoticeText(editingText);
    setEditingError(error);
    if (error) {
      return;
    }

    updateMutation.mutate(
      { id, text: editingText.trim() },
      {
        onSuccess: () => {
          setStatusMessage("공지/이벤트를 수정했습니다.");
          cancelEdit();
        },
      },
    );
  }

  function handleConfirmDelete() {
    if (!pendingDeleteId) {
      return;
    }
    const targetId = pendingDeleteId;
    deleteMutation.mutate(targetId, {
      onSuccess: () => {
        setStatusMessage("공지/이벤트를 삭제했습니다.");
        setPendingDeleteId(null);
        if (editingId === targetId) {
          cancelEdit();
        }
      },
    });
  }

  function handleToggleVisibility(notice: NoticeItem) {
    visibilityMutation.mutate(
      { id: notice.id, isVisible: !notice.isVisible },
      {
        onSuccess: () => setStatusMessage("공개 상태를 변경했습니다."),
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">이벤트·공지</h1>

      {statusMessage ? (
        <p role="status" aria-live="polite" className="text-sm text-emerald-600 dark:text-emerald-400">
          {statusMessage}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>새 공지/이벤트 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={handleCreateSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notice-text">공지 문구</Label>
              <Textarea
                id="notice-text"
                value={form.text}
                onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
                aria-invalid={Boolean(formError)}
                placeholder="예: 매주 수요일 하이볼 1,000원 할인"
              />
              {formError ? (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              ) : null}
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.isVisible}
                onChange={(event) => setForm((current) => ({ ...current, isVisible: event.target.checked }))}
              />
              공개
            </label>

            {createMutation.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "공지 등록에 실패했습니다."}
              </p>
            ) : null}

            <Button type="submit" disabled={createMutation.isPending}>
              등록
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>공지·이벤트 목록</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {deleteMutation.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : "공지 삭제에 실패했습니다."}
            </p>
          ) : null}
          {visibilityMutation.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {visibilityMutation.error instanceof Error
                ? visibilityMutation.error.message
                : "공개 상태 변경에 실패했습니다."}
            </p>
          ) : null}

          {notices.length === 0 ? (
            <EmptyState title="등록된 공지/이벤트가 없습니다." description="위 양식으로 공지를 추가하세요." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>문구</TableHead>
                  <TableHead>공개 여부</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.map((notice) => {
                  const isEditing = editingId === notice.id;
                  return (
                    <TableRow key={notice.id}>
                      <TableCell className="whitespace-normal">
                        {isEditing ? (
                          <div className="flex flex-col gap-1.5">
                            <Textarea
                              aria-label="공지 문구 수정"
                              value={editingText}
                              onChange={(event) => setEditingText(event.target.value)}
                            />
                            {editingError ? (
                              <p role="alert" className="text-sm text-destructive">
                                {editingError}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          notice.text
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isVisibilityPending(notice.id)}
                          onClick={() => handleToggleVisibility(notice)}
                        >
                          {notice.isVisible ? "공개" : "숨김"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                disabled={isUpdatePending(notice.id)}
                                onClick={() => saveEdit(notice.id)}
                              >
                                저장
                              </Button>
                              <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                                취소
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => beginEdit(notice)}
                              >
                                수정
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isDeletePending(notice.id)}
                                onClick={() => setPendingDeleteId(notice.id)}
                              >
                                삭제
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
            <AlertDialogTitle>공지/이벤트를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>삭제하면 되돌릴 수 없습니다.</AlertDialogDescription>
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
