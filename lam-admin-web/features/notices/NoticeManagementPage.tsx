"use client";

import "@/i18n/client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("notices");
  const bootstrapQuery = useBootstrapQuery();

  const createMutation = useCreateNoticeMutation();
  const updateMutation = useUpdateNoticeMutation();
  const visibilityMutation = useUpdateNoticeVisibilityMutation();
  const deleteMutation = useDeleteNoticeMutation();

  const [form, setForm] = useState<NoticeFormState>(EMPTY_FORM);
  // Validation state holds translation KEYS (see `validateNoticeText` in
  // `./api`), not rendered text, so a language switch re-renders the message
  // too.
  const [formErrorKey, setFormErrorKey] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingErrorKey, setEditingErrorKey] = useState<string | undefined>(undefined);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (bootstrapQuery.isLoading) {
    return <LoadingState label={t("loading")} />;
  }

  if (bootstrapQuery.isError) {
    return (
      <ErrorState
        title={t("errorTitle")}
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
    setFormErrorKey(error);
    if (error) {
      return;
    }

    createMutation.mutate(
      { text: form.text.trim(), isVisible: form.isVisible },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM);
          setStatusMessage(t("created"));
        },
      },
    );
  }

  function beginEdit(notice: NoticeItem) {
    setEditingId(notice.id);
    setEditingText(notice.text);
    setEditingErrorKey(undefined);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingText("");
    setEditingErrorKey(undefined);
  }

  function saveEdit(id: string) {
    const error = validateNoticeText(editingText);
    setEditingErrorKey(error);
    if (error) {
      return;
    }

    updateMutation.mutate(
      { id, text: editingText.trim() },
      {
        onSuccess: () => {
          setStatusMessage(t("updated"));
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
        setStatusMessage(t("deleted"));
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
        onSuccess: () => setStatusMessage(t("visibilityChanged")),
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>

      {statusMessage ? (
        <p role="status" aria-live="polite" className="text-sm text-emerald-600 dark:text-emerald-400">
          {statusMessage}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("createCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={handleCreateSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notice-text">{t("textLabel")}</Label>
              <Textarea
                id="notice-text"
                value={form.text}
                onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
                aria-invalid={Boolean(formErrorKey)}
                placeholder={t("textPlaceholder")}
              />
              {formErrorKey ? (
                <p role="alert" className="text-sm text-destructive">
                  {t(formErrorKey)}
                </p>
              ) : null}
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.isVisible}
                onChange={(event) => setForm((current) => ({ ...current, isVisible: event.target.checked }))}
              />
              {t("common:isPublic")}
            </label>

            {createMutation.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : t("createFailed")}
              </p>
            ) : null}

            <Button type="submit" disabled={createMutation.isPending}>
              {t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("listCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {deleteMutation.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : t("deleteFailed")}
            </p>
          ) : null}
          {visibilityMutation.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {visibilityMutation.error instanceof Error
                ? visibilityMutation.error.message
                : t("visibilityFailed")}
            </p>
          ) : null}

          {notices.length === 0 ? (
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnText")}</TableHead>
                  <TableHead>{t("common:columnVisibility")}</TableHead>
                  <TableHead>{t("common:columnActions")}</TableHead>
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
                              aria-label={t("editTextAria")}
                              value={editingText}
                              onChange={(event) => setEditingText(event.target.value)}
                            />
                            {editingErrorKey ? (
                              <p role="alert" className="text-sm text-destructive">
                                {t(editingErrorKey)}
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
                          {notice.isVisible ? t("common:visible") : t("common:hidden")}
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
                                {t("common:save")}
                              </Button>
                              <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                                {t("common:cancel")}
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
                                {t("common:edit")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isDeletePending(notice.id)}
                                onClick={() => setPendingDeleteId(notice.id)}
                              >
                                {t("common:delete")}
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
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common:deleteIrreversible")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={deleteMutation.isPending} onClick={handleConfirmDelete}>
              {t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
