"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { MenuCategory } from "@/features/bootstrap/model";

import { validateMenuItemForm, type MenuItemFormErrors } from "./model";
import { useCreateMenuItemMutation } from "./queries";

type MenuItemFormState = {
  categoryId: string;
  badge: string;
  badgeColor: string;
  name: string;
  description: string;
  price: string;
  isVisible: boolean;
};

// Mirrors the fixed badge-color palette already in use for the customer
// menu (`lam-web/components/screens/admin-screen.tsx`'s `badgeColorOptions`)
// — `badgeColor` is a free-form string on the wire, but the operator picks
// from this known set rather than typing a raw value.
const BADGE_COLOR_OPTIONS = [
  { value: "", label: "배지 없음" },
  { value: "green", label: "그린" },
  { value: "amber", label: "앰버" },
  { value: "pink", label: "핑크" },
  { value: "blue", label: "블루" },
] as const;

function emptyForm(categoryId: string): MenuItemFormState {
  return {
    categoryId,
    badge: "",
    badgeColor: "",
    name: "",
    description: "",
    price: "",
    isVisible: true,
  };
}

export function MenuItemForm({ categories }: { categories: MenuCategory[] }) {
  const [form, setForm] = useState<MenuItemFormState>(() => emptyForm(categories[0]?.id ?? ""));
  const [errors, setErrors] = useState<MenuItemFormErrors>({});
  const createMutation = useCreateMenuItemMutation();

  // Derived (not synced via an effect) so the selected category stays
  // valid as the category list changes — e.g. the first category is
  // created after this form already mounted with no categories available.
  const effectiveCategoryId = categories.some((category) => category.id === form.categoryId)
    ? form.categoryId
    : categories[0]?.id ?? "";

  const hasCategories = categories.length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateMenuItemForm(
      { ...form, categoryId: effectiveCategoryId },
      categories.map((category) => category.id),
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    createMutation.mutate(
      {
        categoryId: effectiveCategoryId.trim(),
        badge: form.badge.trim(),
        badgeColor: form.badgeColor.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        price: form.price.trim(),
        isVisible: form.isVisible,
      },
      { onSuccess: () => setForm(emptyForm(effectiveCategoryId)) },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>메뉴 등록</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasCategories ? (
          <p className="text-sm text-muted-foreground">먼저 카테고리를 추가하세요.</p>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="menu-category">카테고리</Label>
              <select
                id="menu-category"
                className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm text-foreground"
                value={effectiveCategoryId}
                onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                aria-invalid={Boolean(errors.categoryId)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
              {errors.categoryId ? (
                <p role="alert" className="text-sm text-destructive">
                  {errors.categoryId}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="menu-name">이름</Label>
              <Input
                id="menu-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name ? (
                <p role="alert" className="text-sm text-destructive">
                  {errors.name}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="menu-description">설명</Label>
              <Textarea
                id="menu-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="menu-price">가격</Label>
              <Input
                id="menu-price"
                value={form.price}
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                aria-invalid={Boolean(errors.price)}
              />
              {errors.price ? (
                <p role="alert" className="text-sm text-destructive">
                  {errors.price}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="menu-badge">배지 문구</Label>
                <Input
                  id="menu-badge"
                  value={form.badge}
                  onChange={(event) => setForm((current) => ({ ...current, badge: event.target.value }))}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="menu-badge-color">배지 색상</Label>
                <select
                  id="menu-badge-color"
                  className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm text-foreground"
                  value={form.badgeColor}
                  onChange={(event) => setForm((current) => ({ ...current, badgeColor: event.target.value }))}
                >
                  {BADGE_COLOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
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
                  : "메뉴 추가에 실패했습니다."}
              </p>
            ) : null}

            <Button type="submit" disabled={createMutation.isPending}>
              메뉴 추가
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
