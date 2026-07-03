#!/usr/bin/env node
/**
 * Design System v2 — leak scanner (ratchet)
 *
 * Conta vazamentos de token em `src/**\/*.tsx,*.ts` (excluindo `src/features/legacy-v1/**`)
 * e compara com a baseline em `scripts/ds-baseline.json`. Falha se a contagem
 * subir em qualquer categoria. Use `--update` para regravar a baseline depois
 * de uma refatoração que reduziu contagens (ratchet só desce).
 *
 * Categorias rastreadas:
 *   - hexInClassName      → `bg-[#…]`, `text-[#…]`, `border-[#…]`, `from-[#…]`...
 *   - hexInStyle          → `style={{ color: "#abc" }}` etc.
 *   - bgWhiteAlpha        → `bg-white/N`
 *   - borderWhiteAlpha    → `border-white/N`
 *   - tailwindNativePalette → `text-red-500`, `bg-emerald-400`, etc.
 *   - rawRoundedPx        → `rounded-[Npx]`
 *
 * Heurística é regex — pode haver falso positivo/negativo. Não é validação
 * formal, é só um trinco contra regressão. Apêndice B do TOKEN-INVENTORY
 * documenta exceções (cores de marca de terceiros).
 */

import { readFileSync, writeFileSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");
const BASELINE_PATH = join(ROOT, "scripts", "ds-baseline.json");
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "out",
  "build",
  "coverage",
  "generated",
]);
// Caminhos relativos a `src/` que são ignorados (legado v1 + mocks de preview + showcase DS).
const SKIP_REL = [
  join("features", "legacy-v1"),
  join("lib", "preview-mocks.ts"),
  // showcase/ é rota de preview do DS (similar a Storybook) — não é código de produção.
  join("app", "(app)", "showcase"),
];

const EXTS = [".tsx", ".ts"];

const PATTERNS = {
  // ── Cores ────────────────────────────────────────────────────────────────
  // Cores nativas Tailwind que NÃO devem aparecer em código v2.
  // Lista canônica baseada em tailwindcss/colors (sem white/black/transparent/current/inherit).
  tailwindNativePalette: (() => {
    const palette = [
      "slate", "gray", "zinc", "neutral", "stone",
      "red", "orange", "amber", "yellow", "lime",
      "green", "emerald", "teal", "cyan", "sky",
      "blue", "indigo", "violet", "purple", "fuchsia",
      "pink", "rose",
    ];
    const shades = "(?:50|100|200|300|400|500|600|700|800|900|950)";
    const utilities = "(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|caret|accent|shadow|decoration)";
    // Captura ocorrências como `bg-red-500`, `text-emerald-400/50`, com prefixos
    // tipo `hover:`, `dark:`, etc.
    const re = new RegExp(
      `\\b(?:${utilities})-(?:${palette.join("|")})-${shades}(?:/\\d+)?\\b`,
      "g",
    );
    return re;
  })(),
  hexInClassName:
    /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|shadow|decoration)-\[#[0-9a-fA-F]{3,8}(?:\/\d+)?\]/g,
  hexInStyle:
    /["']#[0-9a-fA-F]{3,8}["']/g,
  bgWhiteAlpha: /\bbg-white\/\d+\b/g,
  borderWhiteAlpha: /\bborder-white\/\d+\b/g,
  rawRoundedPx: /\brounded(?:-[trblxy]{1,2})?-\[\d+(?:\.\d+)?px\]/g,

  // ── DS-001: Ícones — lucide-react não deve crescer fora do legado ─────────
  // Conta imports de lucide-react em arquivos não-legados (legado é excluído via
  // SKIP_REL). O ratchet garante que a contagem só diminui.
  lucideImports: /from\s+['"]lucide-react['"]/g,

  // ── DS-009: confirm() nativo — deve ser zero no codebase ─────────────────
  // Rastreia somente `window.confirm(` — a chamada nativa inequívoca.
  // Bare `confirm(` não é rastreado aqui porque o hook useConfirm() devolve
  // uma função local de mesmo nome (falso-positivo). O ESLint no-restricted-globals
  // cobre o caso global com entendimento de escopo.
  windowConfirm: /\bwindow\.confirm\s*\(/g,

  // ── DS-008: z-index arbitrário — deve usar tokens --z-* ──────────────────
  // Captura `z-[<número>]` em className (Tailwind JIT). Tokens aceitos são
  // z-(--z-overlay), z-(--z-popover), z-(--z-radix) — esses NÃO batem neste
  // padrão pois usam --z-* em vez de número literal.
  arbitraryZIndex: /\bz-\[\d+\]/g,

  // ── DS-004: valores px arbitrários em espaçamento/tamanho ────────────────
  // Captura utilitários de layout com px literais: p-[16px], gap-[8px], etc.
  // Não inclui rounded (já coberto por rawRoundedPx) nem text (font-size teria
  // padrão próprio). Heurística regex; consulte DECISOES-PENDENTES para exceções.
  arbitrarySpacingPx: /\b(?:p|px|py|pl|pr|pt|pb|m|mx|my|ml|mr|mt|mb|gap|space-x|space-y|w|h|min-w|min-h|max-w|max-h|size|top|right|bottom|left|inset)-\[\d+(?:\.\d+)?px\]/g,
};

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (EXTS.some((ext) => entry.name.endsWith(ext))) {
      yield full;
    }
  }
}

function isSkipped(absPath) {
  const rel = relative(SRC, absPath);
  if (rel.startsWith("..")) return true;
  return SKIP_REL.some((p) => rel === p || rel.startsWith(p + sep));
}

async function scan() {
  const counts = Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, 0]));
  const perFile = new Map();
  for await (const file of walk(SRC)) {
    if (isSkipped(file)) continue;
    let src;
    try {
      src = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const fileCounts = {};
    for (const [name, re] of Object.entries(PATTERNS)) {
      const matches = src.match(re);
      const n = matches ? matches.length : 0;
      if (n > 0) {
        counts[name] += n;
        fileCounts[name] = n;
      }
    }
    if (Object.keys(fileCounts).length > 0) {
      perFile.set(relative(ROOT, file), fileCounts);
    }
  }
  return { counts, perFile };
}

function loadBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function topOffenders(perFile, limit = 10) {
  const totals = [];
  for (const [file, c] of perFile.entries()) {
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    totals.push({ file, total, breakdown: c });
  }
  totals.sort((a, b) => b.total - a.total);
  return totals.slice(0, limit);
}

const args = new Set(process.argv.slice(2));
const update = args.has("--update");
const verbose = args.has("--verbose") || args.has("-v");

const { counts, perFile } = await scan();
const baseline = loadBaseline();

if (update || !baseline) {
  writeFileSync(BASELINE_PATH, JSON.stringify(counts, null, 2) + "\n", "utf8");
  console.log("[ds-scan] baseline atualizada:");
  console.log(counts);
  if (verbose) {
    console.log("\n[ds-scan] top 10 ofensores:");
    for (const o of topOffenders(perFile)) {
      console.log(`  ${o.total.toString().padStart(4)}  ${o.file}`);
    }
  }
  process.exit(0);
}

let regressed = false;
const report = [];
for (const [k, v] of Object.entries(counts)) {
  const base = baseline[k] ?? 0;
  const delta = v - base;
  report.push({ category: k, baseline: base, current: v, delta });
  if (delta > 0) regressed = true;
}

console.log("[ds-scan] resultado (categoria | baseline → atual | delta):");
for (const r of report) {
  const arrow = r.delta === 0 ? "=" : r.delta > 0 ? "▲" : "▼";
  console.log(
    `  ${arrow} ${r.category.padEnd(24)} ${String(r.baseline).padStart(5)} → ${String(r.current).padStart(5)}  (${r.delta >= 0 ? "+" : ""}${r.delta})`,
  );
}

if (verbose || regressed) {
  console.log("\n[ds-scan] top 10 ofensores:");
  for (const o of topOffenders(perFile)) {
    console.log(`  ${o.total.toString().padStart(4)}  ${o.file}`);
  }
}

if (regressed) {
  console.error(
    "\n[ds-scan] FALHA: contagem subiu em pelo menos uma categoria. Refatore para tokens DS v2 ou rode `node scripts/ds-scan.mjs --update` se a alta for justificada (documente em docs/design-system/DECISOES-PENDENTES.md).",
  );
  process.exit(1);
}

console.log("\n[ds-scan] OK — sem regressões.");
