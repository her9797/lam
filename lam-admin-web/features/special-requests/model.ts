/**
 * Mirrors `lam-api/internal/lamdata.SpecialRequest`. This is the
 * `special_requests` feature boundary — kept fully separate from
 * `features/requests` (`customer_requests`): no shared model, API path, or
 * query key, per this repo's `AGENTS.md` rule and the plan's Task 4 brief.
 */
export type SpecialRequest = {
  id: string;
  tableNumber: string;
  gender: string;
  name: string;
  age: string;
  residence: string;
  instagram: string;
  idealType: string;
  text: string;
  createdAt: string;
};
