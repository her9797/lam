/**
 * Typed `fetch` wrapper for same-origin `/api/*` BFF routes.
 *
 * This is the single place that converts a non-2xx response into a thrown
 * error carrying the HTTP status, so every feature `api.ts` module (and the
 * shared 401 → login-redirect boundary in `lib/query/query-client.ts`) can
 * branch on `error.status` instead of re-parsing responses themselves.
 */
export class FetchJsonError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "FetchJsonError";
    this.status = status;
    this.body = body;
  }
}

function extractErrorMessage(status: number, body: unknown): string {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error?: unknown }).error === "string" &&
    (body as { error: string }).error.trim().length > 0
  ) {
    return (body as { error: string }).error;
  }
  return `요청이 실패했습니다. (${status})`;
}

export async function fetchJson<T = unknown>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    throw new FetchJsonError(response.status, extractErrorMessage(response.status, body), body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export function isUnauthorizedError(error: unknown): error is FetchJsonError {
  return error instanceof FetchJsonError && error.status === 401;
}
