/**
 * Utilitário de normalização de telefone para E.164 (BR-first).
 *
 * Espelha o helper de mesmo nome no backend (`backend/src/lib/phone.ts`).
 * A ideia é que o usuário possa digitar o número de qualquer forma
 * (com/sem `+`, com/sem DDI, com máscara) e a UI mostre / envie
 * um formato canônico (`+55DDXXXXXXXXX`).
 *
 * Entradas aceitas:
 *   - `+5511987654321` (E.164 completo)
 *   - `5511987654321`  (DDI + DDD + número)
 *   - `11987654321`    (DDD + 9 dígitos)
 *   - `1187654321`     (DDD + 8 dígitos)
 *   - `(11) 9 8765-4321` (com máscara)
 *
 * Números com DDI diferente de 55 são aceitos e devolvidos com `+`
 * prefixado, sem regra regional adicional.
 */

const E164_RE = /^\+\d{7,15}$/;

function strip(raw: string): string {
  return raw.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const s = strip(raw.trim());
  if (!s) return null;

  if (E164_RE.test(s)) return s;

  const digits = s.startsWith("+") ? s.slice(1) : s;

  if (digits.startsWith("55")) {
    const local = digits.slice(2);
    return normalizeBrLocal(local);
  }

  if (digits.length === 10 || digits.length === 11) {
    return normalizeBrLocal(digits);
  }

  if (digits.length >= 7 && digits.length <= 15) {
    const candidate = `+${digits}`;
    return E164_RE.test(candidate) ? candidate : null;
  }

  return null;
}

function normalizeBrLocal(local: string): string | null {
  if (local.length === 11 || local.length === 10) {
    return `+55${local}`;
  }
  return null;
}
