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

/**
 * Remove emojis/decoradores do nome (ex.: "🌻🌵 Jéssica" → "Jéssica").
 * Preserva letras acentuadas. Usa Extended_Pictographic + ZWJ/VS16.
 */
export function stripNameDecorators(name: string): string {
  return name
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[\uFE0F\u200D]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove prefixo "Negócio" e emojis/decoradores do nome do contato. */
export function sanitizeContactName(name: string | null | undefined): string {
  const t = (name ?? "").trim();
  if (!t) return t;
  const withoutDeal = personNameFromDealTitle(t) ?? t;
  return stripNameDecorators(withoutDeal);
}
