/**
 * Shared fetch/JSON helpers for API responses.
 * Assumes global fetch (with credentials patch in main.tsx for API origins).
 */

/** Read JSON body after a successful response. */
export async function parseJsonBody<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

type ErrorBody = { error?: string };

/** Throw with server `error` message or `fallbackLabel (status)`. */
export async function throwHttpError(res: Response, fallbackLabel: string): Promise<never> {
  const body = (await res.json().catch(() => null)) as ErrorBody | null;
  throw new Error(body?.error ?? `${fallbackLabel} (${res.status})`);
}

/**
 * GET/POST JSON: fetch, throw on non-OK (using error body when present), else parse JSON.
 */
export async function fetchJsonOk<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  errorLabel = 'Request failed',
): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) await throwHttpError(res, errorLabel);
  return parseJsonBody<T>(res);
}
