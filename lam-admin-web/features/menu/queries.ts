import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AppData } from "@/features/bootstrap/model";
import { bootstrapKeys } from "@/features/bootstrap/queries";

import {
  createCategory,
  createMenuItem,
  deleteCategory,
  deleteMenuItem,
  updateCategoryVisibility,
  updateMenuItemVisibility,
  uploadMenuItemImage,
} from "./api";
import type { CreateCategoryInput, CreateMenuItemInput, UploadMenuItemImageInput } from "./model";

/**
 * Every mutation here touches categories/menu items, which live in the
 * shared `AppData` bootstrap tree (Task 4's design) — so every one of them
 * writes its response into `bootstrapKeys.all` only, never
 * `requestsKeys.all`/`specialRequestKeys.all`.
 */
function useApplyBootstrapUpdate() {
  const queryClient = useQueryClient();
  return (appData: AppData) => {
    queryClient.setQueryData(bootstrapKeys.all, appData);
  };
}

export function useCreateCategoryMutation() {
  const applyBootstrapUpdate = useApplyBootstrapUpdate();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: applyBootstrapUpdate,
  });
}

export function useUpdateCategoryVisibilityMutation() {
  const applyBootstrapUpdate = useApplyBootstrapUpdate();
  return useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      updateCategoryVisibility(id, isVisible),
    onSuccess: applyBootstrapUpdate,
  });
}

export function useDeleteCategoryMutation() {
  const applyBootstrapUpdate = useApplyBootstrapUpdate();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: applyBootstrapUpdate,
  });
}

export function useCreateMenuItemMutation() {
  const applyBootstrapUpdate = useApplyBootstrapUpdate();
  return useMutation({
    mutationFn: (input: CreateMenuItemInput) => createMenuItem(input),
    onSuccess: applyBootstrapUpdate,
  });
}

export function useUpdateMenuItemVisibilityMutation() {
  const applyBootstrapUpdate = useApplyBootstrapUpdate();
  return useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      updateMenuItemVisibility(id, isVisible),
    onSuccess: applyBootstrapUpdate,
  });
}

export function useDeleteMenuItemMutation() {
  const applyBootstrapUpdate = useApplyBootstrapUpdate();
  return useMutation({
    mutationFn: (id: string) => deleteMenuItem(id),
    onSuccess: applyBootstrapUpdate,
  });
}

export function useUploadMenuItemImageMutation() {
  const applyBootstrapUpdate = useApplyBootstrapUpdate();
  return useMutation({
    mutationFn: (input: UploadMenuItemImageInput) => uploadMenuItemImage(input),
    onSuccess: applyBootstrapUpdate,
  });
}
