"use client";

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
import { EmptyState } from "@/components/states/PageStates";
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

import type { MenuCategory } from "@/features/bootstrap/model";

import { validateCategoryForm, type CategoryFormErrors } from "./model";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useUpdateCategoryVisibilityMutation,
} from "./queries";

type CategoryFormState = {
  id: string;
  label: string;
  isVisible: boolean;
};

const EMPTY_FORM: CategoryFormState = { id: "", label: "", isVisible: true };

export function CategoryPanel({ categories }: { categories: MenuCategory[] }) {
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<CategoryFormErrors>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const createMutation = useCreateCategoryMutation();
  const visibilityMutation = useUpdateCategoryVisibilityMutation();
  const deleteMutation = useDeleteCategoryMutation();

  const deleteTarget = categories.find((category) => category.id === pendingDeleteId) ?? null;

  function isVisibilityPending(id: string): boolean {
    return visibilityMutation.isPending && visibilityMutation.variables?.id === id;
  }

  function isDeletePending(id: string): boolean {
    return deleteMutation.isPending && deleteMutation.variables === id;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateCategoryForm(
      form,
      categories.map((category) => category.id),
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    createMutation.mutate(
      { id: form.id.trim(), label: form.label.trim(), isVisible: form.isVisible },
      { onSuccess: () => setForm(EMPTY_FORM) },
    );
  }

  function handleConfirmDelete() {
    if (!pendingDeleteId) {
      return;
    }
    deleteMutation.mutate(pendingDeleteId, {
      onSuccess: () => setPendingDeleteId(null),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>카테고리</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="category-id">카테고리 ID</Label>
            <Input
              id="category-id"
              value={form.id}
              onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
              aria-invalid={Boolean(errors.id)}
            />
            {errors.id ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.id}
              </p>
            ) : null}
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="category-label">카테고리 이름</Label>
            <Input
              id="category-label"
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              aria-invalid={Boolean(errors.label)}
            />
            {errors.label ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.label}
              </p>
            ) : null}
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.isVisible}
              onChange={(event) => setForm((current) => ({ ...current, isVisible: event.target.checked }))}
            />
            공개
          </label>
          <Button type="submit" disabled={createMutation.isPending}>
            카테고리 추가
          </Button>
        </form>

        {createMutation.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : "카테고리 추가에 실패했습니다."}
          </p>
        ) : null}

        {categories.length === 0 ? (
          <EmptyState title="등록된 카테고리가 없습니다." description="위 양식으로 카테고리를 추가하세요." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>공개 여부</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.id}</TableCell>
                  <TableCell>{category.label}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isVisibilityPending(category.id)}
                      onClick={() =>
                        visibilityMutation.mutate({ id: category.id, isVisible: !category.isVisible })
                      }
                    >
                      {category.isVisible ? "공개" : "숨김"}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isDeletePending(category.id)}
                      onClick={() => setPendingDeleteId(category.id)}
                    >
                      삭제
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

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
            <AlertDialogTitle>카테고리를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `'${deleteTarget.label}' 카테고리를 삭제합니다. ` : ""}
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
    </Card>
  );
}
