import { toast } from "sonner";

import { HttpError } from "./http-client";

/**
 * Pull a user-facing message out of a thrown error, if the server gave one.
 * `httpClient` sets `HttpError.message` to a developer string
 * (`"POST /path failed with status 400"`), so the human-readable message —
 * when present — lives in `HttpError.body`, which the API returns as
 * `{ statusCode, message }` (`message` may be a string or a string[]).
 */
function serverMessage(error: unknown): string | undefined {
  if (!(error instanceof HttpError) || typeof error.body !== "object" || error.body === null) {
    return undefined;
  }
  const message = (error.body as { message?: unknown }).message;
  if (typeof message === "string" && message.trim()) return message;
  if (Array.isArray(message)) {
    const joined = message.filter((m): m is string => typeof m === "string").join("; ");
    if (joined) return joined;
  }
  return undefined;
}

/**
 * Surface a failed request to the user via a sonner toast. Prefers the
 * server-provided message (`HttpError.body.message`); otherwise shows the given
 * human-readable fallback — never the internal `"METHOD /path failed…"` string.
 * Use in a mutation's `onError` so writes never fail silently (see the
 * data-layer error contract in CLAUDE.md).
 */
export function toastError(error: unknown, fallback: string): void {
  toast.error(serverMessage(error) ?? fallback);
}
