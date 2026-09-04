"use client";

import "@/i18n/client";

import { useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListToolbar } from "@/components/list/ListToolbar";
import { Pagination } from "@/components/list/Pagination";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/PageStates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime } from "@/lib/utils";

import type { SpecialRequest, SpecialRequestGender, SpecialRequestListQuery, SpecialRequestSort } from "./model";
import { useDeleteSpecialRequestMutation, useSpecialRequestsPageQuery } from "./queries";

// Field list mirrors `admin-screen.tsx`'s special-request detail modal
// exactly (table / name / age / residence / contact / ideal type / message)
// so the operator sees the same fields they already know from the current
// app. Labels are keys in the `specialRequests` namespace.
const DETAIL_FIELDS: Array<{ key: keyof SpecialRequest; labelKey: string }> = [
  { key: "tableNumber", labelKey: "fieldTableNumber" },
  { key: "name", labelKey: "fieldName" },
  { key: "age", labelKey: "fieldAge" },
  { key: "residence", labelKey: "fieldResidence" },
  { key: "instagram", labelKey: "fieldInstagram" },
  { key: "idealType", labelKey: "fieldIdealType" },
  { key: "text", labelKey: "fieldText" },
];

const SEARCH_DEBOUNCE_MS = 300;

const DEFAULT_QUERY: SpecialRequestListQuery = {
  page: 1,
  pageSize: 20,
  gender: undefined,
  search: "",
  sort: "createdAt",
  order: "desc",
};

export function SpecialRequestPage() {
  const { t, i18n } = useTranslation("specialRequests");

  // Unlike the general/song request screens, this state is deliberately
  // never synced to the URL: `search` can hold a guest's name or contact
  // info, and this screen already keeps that data out of the address bar
  // and browser history for the detail/delete dialogs below (both driven by
  // in-memory ids only) — see `docs/plans/2026-09-04-admin-list-paging-search-sort.md`
  // section 4.5.
  const [query, setQuery] = useState<SpecialRequestListQuery>(DEFAULT_QUERY);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  // React's "adjusting state when a prop changes" pattern (setState during
  // render, guarded), not an effect — see `RequestListPage`'s identical
  // comment for why an effect here would trip `react-hooks/set-state-in-effect`.
  const [syncedSearch, setSyncedSearch] = useState(debouncedSearch);
  if (debouncedSearch !== syncedSearch) {
    setSyncedSearch(debouncedSearch);
    setQuery((prev) => ({ ...prev, search: debouncedSearch, page: 1 }));
  }

  const requestsQuery = useSpecialRequestsPageQuery(query);
  const deleteMutation = useDeleteSpecialRequestMutation();
  // Both dialogs are driven by in-memory ids only (never a URL/query param),
  // so a guest's personal fields never end up in the address bar or browser
  // history.
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  if (requestsQuery.isLoading) {
    return <LoadingState label={t("loading")} />;
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

  const requests = requestsQuery.data?.items ?? [];
  const total = requestsQuery.data?.total ?? 0;
  const hasActiveFilter = Boolean(query.gender) || query.search.trim().length > 0;
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
      <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t("searchPlaceholder")}
      >
        <Select
          value={query.gender ?? "all"}
          onValueChange={(value) =>
            setQuery((prev) => ({
              ...prev,
              gender: value === "all" ? undefined : (value as SpecialRequestGender),
              page: 1,
            }))
          }
        >
          <SelectTrigger size="sm" aria-label={t("genderFilterLabel")}>
            <SelectValue placeholder={t("genderFilterLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common:filterAll")}</SelectItem>
            <SelectItem value="male">{t("genderMale")}</SelectItem>
            <SelectItem value="female">{t("genderFemale")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={query.sort}
          onValueChange={(value) =>
            setQuery((prev) => ({ ...prev, sort: value as SpecialRequestSort, page: 1 }))
          }
        >
          <SelectTrigger size="sm" aria-label={t("common:sortLabel")}>
            <SelectValue placeholder={t("common:sortLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">{t("sortByCreatedAt")}</SelectItem>
            <SelectItem value="name">{t("sortByName")}</SelectItem>
          </SelectContent>
        </Select>
      </ListToolbar>

      {deleteMutation.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {deleteMutation.error instanceof Error
            ? deleteMutation.error.message
            : t("deleteFailed")}
        </p>
      ) : null}

      {requests.length === 0 ? (
        hasActiveFilter ? (
          <EmptyState
            title={t("common:listNoResultsTitle")}
            description={t("common:listNoResultsDescription")}
          />
        ) : (
          <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common:columnCreatedAt")}</TableHead>
              <TableHead>{t("common:columnTable")}</TableHead>
              <TableHead>{t("common:columnName")}</TableHead>
              <TableHead>{t("common:columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{formatDateTime(request.createdAt, i18n.language)}</TableCell>
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
                      {t("viewDetail")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isRowDeleting(request.id)}
                      onClick={() => setPendingDeleteId(request.id)}
                    >
                      {t("common:delete")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination
        page={query.page}
        pageSize={query.pageSize}
        total={total}
        onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
      />

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
            <DialogTitle>{t("detailTitle")}</DialogTitle>
          </DialogHeader>
          {detailRequest ? (
            <dl className="flex flex-col gap-3">
              {DETAIL_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-0.5">
                  <dt className="text-sm font-medium text-foreground">{t(field.labelKey)}</dt>
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
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? t("deleteTarget", { name: deleteTarget.name }) : ""}
              {t("common:deleteIrreversible")}
            </AlertDialogDescription>
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
