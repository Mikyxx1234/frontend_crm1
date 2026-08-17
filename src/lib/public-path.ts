/** ID público na URL: só dígitos. CUID nunca casa. */
export function isNumericPublicId(value: string): boolean {
  return /^\d+$/.test(value);
}

/** Path de detalhe: prefere `number`, cai no CUID. */
export function entityPath(
  base: string,
  number: number | null | undefined,
  id: string,
): string {
  const suffix = number != null ? String(number) : id;
  return `${base}/${suffix}`;
}

/**
 * Se a rota ainda tem CUID e o registro já tem `number`, reescreve
 * (bookmarks antigos viram `/contacts/42`).
 */
export function rewriteNumericPath(
  base: string,
  param: string,
  number: number | null | undefined,
): void {
  if (typeof window === "undefined") return;
  if (number == null) return;
  if (isNumericPublicId(param)) return;
  const next = `${base}/${number}`;
  const { search, hash } = window.location;
  window.history.replaceState(window.history.state, "", `${next}${search}${hash}`);
}
