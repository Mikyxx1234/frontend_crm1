/**
 * Helpers de nome Contato vs Negócio.
 * Contato = "Marcelo Pinheiro"; Negócio = "Negócio Marcelo Pinheiro".
 */

/** Extrai o nome da pessoa de um título "Negócio …". */
export function personNameFromDealTitle(
  title: string | null | undefined,
): string | null {
  if (!title) return null;
  const t = title.trim();
  if (!t) return null;
  const m = t.match(/^neg[oó]cio(?:\s*[-–]\s*|\s+)(.+)$/i);
  if (!m) return null;
  const rest = m[1].trim();
  if (!rest || /^#?\d+$/.test(rest)) return null;
  return rest;
}

/** Remove prefixo "Negócio" do nome do contato, se presente. */
export function sanitizeContactName(name: string | null | undefined): string {
  const t = (name ?? "").trim();
  if (!t) return t;
  return personNameFromDealTitle(t) ?? t;
}
