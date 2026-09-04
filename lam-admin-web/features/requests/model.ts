/**
 * Mirrors `lam-api/internal/lamdata.CustomerRequest`. This is the "general
 * request" (`customer_requests`) feature boundary — it must never share a
 * model, API namespace, or query key with `features/special-requests`
 * (`special_requests`), per this repo's `AGENTS.md` rule and the plan's
 * Task 4 brief.
 *
 * "Song request" (Task 5) is not a separate resource: it is the same
 * `CustomerRequest` list, split purely by a `text` prefix convention on the
 * UI layer — it stays on this one model/API/query-key boundary.
 */
export type CustomerRequestStatus = "pending" | "checked" | "completed";

export type CustomerRequest = {
  id: string;
  tableNumber: string;
  text: string;
  status: CustomerRequestStatus;
  createdAt: string;
  handledAt?: string;
};
