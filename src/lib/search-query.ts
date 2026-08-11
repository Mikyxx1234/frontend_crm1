/**
 * Shared gates for server-side search (board POST, inbox list/counts).
 * Short queries are expensive (ILIKE / phone digit scans) and rarely useful.
 */
export const SEARCH_DEBOUNCE_MS = 350;
export const SEARCH_MIN_CHARS = 3;

/** Trim + enforce min length. Empty string = do not send `search` to the API. */
export function normalizeSearchQuery(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  return t.length >= SEARCH_MIN_CHARS ? t : "";
}
