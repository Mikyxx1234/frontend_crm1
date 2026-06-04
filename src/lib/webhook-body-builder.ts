/**
 * Núcleo do construtor visual de body do step "Webhook" (em
 * `webhook-step-config.tsx`).
 *
 * Responsabilidades:
 *
 *   1. Converter uma lista de entries (UI) → string JSON que o backend
 *      salva em `step.config.body` e usa como template no disparo. O
 *      backend continua interpolando os tokens `{{...}}` com o regex já
 *      existente — não mexemos no motor.
 *
 *   2. Converter uma string JSON existente → entries, pra retrocompat
 *      com automações antigas que tinham body editado manualmente.
 *      Tokens não reconhecidos no catálogo ficam marcados como
 *      `unknown`, bloqueando o save até o operador corrigir.
 *
 *   3. Validar entries antes do save (chave vazia, duplicada, perigosa,
 *      caminho inválido, conflito de tipo no mesmo path).
 *
 * IMPORTANTE: o usuário NÃO digita JSON. Ele só seleciona campos no
 * picker e define a `keyPath` (com `.` opcional pra aninhar). Toda a
 * geração de JSON é responsabilidade desta lib.
 */

import type { WebhookVariableOption } from "@/lib/automation-webhook-variables";

/**
 * Linha do construtor visual. Identidade local (`id`) é só pra `key`
 * de React; não é persistida.
 */
export type WebhookBodyEntry = {
  id: string;
  /** Chave/path que o operador definiu (ex.: `dealId`, `contato.telefone`, `ad.headline`). */
  keyPath: string;
  /** `key` canônica do catálogo (ex.: `contact.phone`). Vazio se ainda não foi escolhido. */
  optionKey: string;
  /**
   * Token literal vindo de body legado quando NÃO casou com nenhuma
   * opção do catálogo. Quando setado, a entry é considerada "unknown"
   * e bloqueia o save até o operador escolher um campo válido.
   * Mantemos pra exibir o valor original na UI ("não reconhecido:
   * {{xpto}}").
   */
  unknownToken?: string;
  /**
   * Valor literal não-template encontrado no body legado (ex.: number,
   * boolean, string sem `{{}}`). Diferente de `unknownToken`, isso
   * indica um valor estático que o construtor visual não suporta — o
   * operador precisa removê-lo ou substituí-lo por um campo do
   * catálogo.
   */
  literalValue?: string;
};

export type WebhookBodyValidationError = {
  entryId: string;
  message: string;
};

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Gera um id local pra novas entries. Não persiste — só pra React keys
 * e pra mensagens de erro referenciarem uma linha específica.
 */
let _idCounter = 0;
export function newEntryId(): string {
  _idCounter += 1;
  return `wbe_${Date.now().toString(36)}_${_idCounter}`;
}

export function makeEntry(partial: Partial<WebhookBodyEntry> = {}): WebhookBodyEntry {
  return {
    id: partial.id ?? newEntryId(),
    keyPath: partial.keyPath ?? "",
    optionKey: partial.optionKey ?? "",
    unknownToken: partial.unknownToken,
    literalValue: partial.literalValue,
  };
}

/**
 * Splita `keyPath` em segmentos limpos. Vazio quando não há segmento
 * válido (ex.: `""`, `".."`).
 */
export function splitKeyPath(keyPath: string): string[] {
  return keyPath
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function isDangerousKeyPath(keyPath: string): boolean {
  for (const seg of splitKeyPath(keyPath)) {
    if (DANGEROUS_KEYS.has(seg)) return true;
  }
  return false;
}

/**
 * Valida uma lista de entries. Retorna array de erros (vazio = OK).
 *
 * Regras (sincronizadas com o requisito #9 do brief):
 *   - keyPath não pode ser vazio
 *   - optionKey não pode ser vazio (entry incompleta)
 *   - sem entries marcadas `unknownToken` ou `literalValue` (legado
 *     incompatível)
 *   - keyPath não pode ter segmentos perigosos
 *   - keyPaths duplicados
 *   - conflito de tipo no mesmo path: `ad` (folha) e `ad.x` (objeto)
 *     no mesmo body — JSON não suporta os dois ao mesmo tempo
 */
export function validateEntries(
  entries: WebhookBodyEntry[],
): WebhookBodyValidationError[] {
  const errors: WebhookBodyValidationError[] = [];
  const pathByEntry = new Map<string, string[]>();
  const usedPaths = new Map<string, string>(); // path string → entryId

  for (const e of entries) {
    if (e.unknownToken) {
      errors.push({
        entryId: e.id,
        message: `Campo não reconhecido (${e.unknownToken}). Selecione uma categoria/campo válido ou remova esta linha.`,
      });
      continue;
    }
    if (e.literalValue !== undefined) {
      errors.push({
        entryId: e.id,
        message: `Valor literal "${e.literalValue}" não é suportado pelo construtor visual. Substitua por um campo do catálogo ou remova a linha.`,
      });
      continue;
    }
    if (!e.keyPath || !e.keyPath.trim()) {
      errors.push({ entryId: e.id, message: "Defina a chave do webhook." });
      continue;
    }
    if (!e.optionKey) {
      errors.push({ entryId: e.id, message: "Selecione um campo." });
      continue;
    }
    const segs = splitKeyPath(e.keyPath);
    if (segs.length === 0) {
      errors.push({ entryId: e.id, message: "Chave inválida." });
      continue;
    }
    if (isDangerousKeyPath(e.keyPath)) {
      errors.push({
        entryId: e.id,
        message: 'Chave proibida (uso de "__proto__", "constructor" ou "prototype").',
      });
      continue;
    }
    const canonical = segs.join(".");
    if (usedPaths.has(canonical)) {
      errors.push({
        entryId: e.id,
        message: `Chave duplicada: "${canonical}".`,
      });
      continue;
    }
    usedPaths.set(canonical, e.id);
    pathByEntry.set(e.id, segs);
  }

  // Conflito objeto/folha: se existe `ad.x`, não pode existir `ad` como
  // folha (JSON requer um único tipo por chave). Detectamos comparando
  // todos os pares de paths válidos.
  const pathsList = Array.from(pathByEntry.entries());
  for (let i = 0; i < pathsList.length; i++) {
    for (let j = i + 1; j < pathsList.length; j++) {
      const [aId, aSegs] = pathsList[i];
      const [bId, bSegs] = pathsList[j];
      const shorter = aSegs.length < bSegs.length ? aSegs : bSegs;
      const longer = aSegs.length < bSegs.length ? bSegs : aSegs;
      if (shorter.length === longer.length) continue; // já tratado pelo dup check
      let isPrefix = true;
      for (let k = 0; k < shorter.length; k++) {
        if (shorter[k] !== longer[k]) {
          isPrefix = false;
          break;
        }
      }
      if (isPrefix) {
        const conflictId = aSegs.length < bSegs.length ? aId : bId;
        errors.push({
          entryId: conflictId,
          message: `Conflito de chave: "${shorter.join(".")}" não pode coexistir com "${longer.join(".")}".`,
        });
      }
    }
  }

  return errors;
}

/**
 * Constrói o objeto aninhado a partir de entries válidas. Não roda
 * validação — chame `validateEntries` antes pra evitar comportamento
 * indefinido (ex.: chave duplicada → último ganha; conflito → erro de
 * tipo silencioso).
 */
function buildNestedObject(entries: WebhookBodyEntry[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const e of entries) {
    if (!e.optionKey || e.unknownToken || e.literalValue !== undefined) continue;
    const segs = splitKeyPath(e.keyPath);
    if (segs.length === 0) continue;
    if (isDangerousKeyPath(e.keyPath)) continue;
    let cur: Record<string, unknown> = root;
    for (let i = 0; i < segs.length - 1; i++) {
      const seg = segs[i];
      const next = cur[seg];
      if (next && typeof next === "object" && !Array.isArray(next)) {
        cur = next as Record<string, unknown>;
      } else {
        const fresh: Record<string, unknown> = {};
        cur[seg] = fresh;
        cur = fresh;
      }
    }
    cur[segs[segs.length - 1]] = e.unknownToken ?? `__TOKEN__:${e.optionKey}`;
  }
  return root;
}

/**
 * Serializa entries → string JSON que o backend salva. Tokens são
 * inseridos como strings com aspas duplas (ex.: `"dealId": "{{deal.id}}"`),
 * que é o formato consumido por `interpolateWebhookString` no executor.
 *
 * Tomamos o cuidado de:
 *   1. Renderizar via `JSON.stringify` (pra escapar aspas/quebras em
 *      keyPaths atípicos).
 *   2. Substituir os marcadores `__TOKEN__:<key>` pelo token real
 *      depois — `JSON.stringify` ia escapar `{{` e quebrar a
 *      interpolação no backend.
 */
export function entriesToBodyString(
  entries: WebhookBodyEntry[],
  options: WebhookVariableOption[],
): string {
  const optionByKey = new Map(options.map((o) => [o.key, o] as const));
  const obj = buildNestedObject(entries);
  // Etapa 1: stringify normal — gera `"__TOKEN__:contact.name"` como string JSON válida.
  let out = JSON.stringify(obj, null, 2);
  // Etapa 2: troca cada `"__TOKEN__:<key>"` pelo token real do catálogo.
  out = out.replace(/"__TOKEN__:([^"]+)"/g, (_match, key: string) => {
    const opt = optionByKey.get(key);
    return opt ? JSON.stringify(opt.token) : '""';
  });
  return out;
}

/**
 * Caminhada recursiva pra achatar um objeto/valor em pares
 * `keyPath -> raw`. Listas no nível raiz não são suportadas — o body
 * de webhook é sempre um objeto JSON.
 */
function flattenJsonObject(
  obj: unknown,
  prefix: string[],
  out: Array<{ keyPath: string[]; raw: unknown }>,
): void {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    out.push({ keyPath: prefix, raw: obj });
    return;
  }
  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length === 0) {
    // Objeto vazio é tratado como folha (raro, mas não quebra parser).
    out.push({ keyPath: prefix, raw: obj });
    return;
  }
  for (const [k, v] of entries) {
    flattenJsonObject(v, [...prefix, k], out);
  }
}

/**
 * Parseia uma string JSON salva em `step.config.body` em entries para o
 * construtor visual. Usado na hidratação de automações já criadas.
 *
 * - Quando o leaf é uma string `"{{token}}"` exata: tenta casar com o
 *   catálogo via `optionByToken`. Se achar, gera entry válida; senão
 *   cria entry `unknownToken`.
 * - Outras formas (objeto, array, número, boolean, null, string com
 *   conteúdo extra) viram entry `literalValue` — pra que o operador
 *   tome ciência e converta manualmente.
 *
 * Body inválido (não-JSON ou não-objeto) → retorna lista vazia. A UI
 * trata como "começar do zero" sem quebrar.
 */
export function parseBodyToEntries(
  bodyString: string,
  options: WebhookVariableOption[],
): WebhookBodyEntry[] {
  const trimmed = (bodyString ?? "").trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return [];
  }

  const optionByToken = new Map(options.map((o) => [o.token, o] as const));
  // Match pra strings que sejam um token "puro" (ex.: `"{{contact.name}}"`).
  const PURE_TOKEN_RE = /^\s*\{\{\s*([\w.]+)\s*\}\}\s*$/;

  const flat: Array<{ keyPath: string[]; raw: unknown }> = [];
  flattenJsonObject(parsed, [], flat);

  const out: WebhookBodyEntry[] = [];
  for (const f of flat) {
    if (f.keyPath.length === 0) continue;
    const keyPath = f.keyPath.join(".");
    const raw = f.raw;

    if (typeof raw === "string") {
      const m = PURE_TOKEN_RE.exec(raw);
      if (m) {
        const token = `{{${m[1]}}}`;
        const opt = optionByToken.get(token);
        if (opt) {
          out.push(makeEntry({ keyPath, optionKey: opt.key }));
        } else {
          // Token desconhecido — pode ser custom field não mais existente,
          // ou variável adicionada por usuário avançado. Marcamos como
          // unknown pra forçar revisão.
          out.push(makeEntry({ keyPath, unknownToken: raw }));
        }
        continue;
      }
      // String sem template → literal puro
      out.push(makeEntry({ keyPath, literalValue: raw }));
      continue;
    }

    // Number / boolean / null / array / objeto vazio → literal
    let display: string;
    try {
      display = JSON.stringify(raw);
    } catch {
      display = String(raw);
    }
    out.push(makeEntry({ keyPath, literalValue: display }));
  }

  return out;
}
