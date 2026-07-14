/**
 * migrate-palette.mjs
 * Substitui classes Tailwind de paleta crua pelos tokens semânticos do DS v2.
 *
 * Uso:
 *   node scripts/migrate-palette.mjs              → dry-run (mostra contagem)
 *   node scripts/migrate-palette.mjs --write       → aplica mudanças
 *   node scripts/migrate-palette.mjs --write --file src/components/foo.tsx
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const DRY  = !process.argv.includes("--write");
const SINGLE = process.argv.includes("--file")
  ? process.argv[process.argv.indexOf("--file") + 1]
  : null;

// ── Mapa de substituição ────────────────────────────────────────────────────
// Ordem importa: mais específico antes do mais genérico dentro do mesmo grupo.
const MAP = [
  // ── Neutros: texto ────────────────────────────────
  ["text-slate-900",  "text-[var(--text-primary)]"],
  ["text-slate-800",  "text-[var(--text-primary)]"],
  ["text-slate-700",  "text-[var(--text-secondary)]"],
  ["text-slate-600",  "text-[var(--text-secondary)]"],
  ["text-slate-500",  "text-[var(--text-muted)]"],
  ["text-slate-400",  "text-[var(--text-muted)]"],
  ["text-slate-300",  "text-[var(--text-faint)]"],
  ["text-gray-900",   "text-[var(--text-primary)]"],
  ["text-gray-800",   "text-[var(--text-primary)]"],
  ["text-gray-700",   "text-[var(--text-secondary)]"],
  ["text-gray-600",   "text-[var(--text-secondary)]"],
  ["text-gray-500",   "text-[var(--text-muted)]"],
  ["text-gray-400",   "text-[var(--text-muted)]"],
  ["text-gray-300",   "text-[var(--text-faint)]"],
  ["text-zinc-900",   "text-[var(--text-primary)]"],
  ["text-zinc-700",   "text-[var(--text-secondary)]"],
  ["text-zinc-500",   "text-[var(--text-muted)]"],
  // ── Neutros: background ───────────────────────────
  ["bg-slate-50",     "bg-[var(--glass-bg-subtle)]"],
  ["bg-slate-100",    "bg-[var(--glass-bg-base)]"],
  ["bg-slate-300",    "bg-[var(--glass-border-subtle)]"],   // mid-gray ≈ subtle border bg
  ["bg-slate-800",    "bg-[var(--glass-bg-base)]"],         // dark bg base
  ["bg-slate-900",    "bg-[var(--glass-bg-modal)]"],        // dark bg ≈ glass-bg-modal dark
  ["bg-gray-50",      "bg-[var(--glass-bg-subtle)]"],
  ["bg-gray-100",     "bg-[var(--glass-bg-base)]"],
  // ── Neutros: border ───────────────────────────────
  ["border-slate-100","border-[var(--glass-border-subtle)]"],
  ["border-slate-200","border-[var(--glass-border)]"],
  ["border-slate-300","border-[var(--glass-border)]"],
  ["border-slate-700","border-[var(--glass-border)]"],      // dark border
  ["border-slate-800","border-[var(--glass-border)]"],      // dark border
  ["border-gray-100", "border-[var(--glass-border-subtle)]"],
  ["border-gray-200", "border-[var(--glass-border)]"],
  // ── Sucesso (emerald) ─────────────────────────────
  ["text-emerald-900","text-[var(--color-success-text)]"],  // dark success
  ["text-emerald-700","text-[var(--color-success-text)]"],
  ["text-emerald-600","text-[var(--color-success-text)]"],
  ["text-emerald-500","text-[var(--color-success)]"],
  ["text-emerald-400","text-[var(--color-success)]/80"],    // success leve
  ["text-emerald-200","text-[var(--color-success)]/50"],    // success sutil
  ["bg-emerald-50",   "bg-[var(--color-success-bg)]"],
  // ── Alerta (amber) ────────────────────────────────
  ["text-amber-900",  "text-[var(--color-warn-text)]"],     // amber-900 ≈ warn-text dark
  ["text-amber-700",  "text-[var(--color-warn)]"],
  ["text-amber-600",  "text-[var(--color-warn)]"],
  ["text-amber-400",  "text-[var(--color-warning)]/80"],    // amber-400 ≈ warning leve
  ["text-amber-200",  "text-[var(--color-warning)]/70"],    // amber-200 ≈ warning sutil
  ["bg-amber-50",     "bg-[var(--color-warn-bg)]"],
  // ── Perigo (rose/red) ─────────────────────────────
  ["text-rose-700",   "text-[var(--color-danger-text)]"],
  ["text-rose-600",   "text-[var(--color-danger-text)]"],
  ["text-rose-500",   "text-[var(--color-danger)]"],
  ["bg-rose-50",      "bg-[var(--color-danger-bg)]"],
  ["text-red-700",    "text-[var(--color-danger-text)]"],
  ["text-red-600",    "text-[var(--color-danger-text)]"],
  ["text-red-500",    "text-[var(--color-danger)]"],
  ["text-red-400",    "text-[var(--color-danger)]"],
  ["bg-red-50",       "bg-[var(--color-danger-bg)]"],
  // ── Info (blue/indigo) ────────────────────────────
  ["text-blue-600",   "text-[var(--color-info)]"],
  ["text-blue-500",   "text-[var(--color-info)]"],
  ["text-blue-400",   "text-[var(--color-info)]"],
  ["text-indigo-700", "text-[var(--brand-primary)]"],
  ["text-indigo-600", "text-[var(--brand-primary)]"],
  ["text-indigo-500", "text-[var(--brand-primary)]"],
  ["bg-indigo-50",    "bg-[var(--color-info-bg)]"],
  ["bg-blue-500",     "bg-[var(--color-info)]"],
  // ── Sucesso extras ────────────────────────────────
  ["bg-emerald-500",  "bg-[var(--color-success)]"],
  ["bg-emerald-100",  "bg-[var(--color-success-bg)]"],
  // ── Alerta extras ─────────────────────────────────
  ["text-amber-500",  "text-[var(--color-warn)]"],
  ["bg-amber-500",    "bg-[var(--color-warning)]"],
  ["bg-amber-100",    "bg-[var(--color-warn-bg)]"],
  // ── Perigo extras ─────────────────────────────────
  ["bg-rose-500",     "bg-[var(--color-danger)]"],
  ["bg-red-500",      "bg-[var(--color-danger)]"],
];

// Builds a regex that matches the class as a word boundary
// Handles variant prefixes like hover:, dark:, focus: by using \b
function makeRe(cls) {
  const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "g");
}

const REPLACEMENTS = MAP.map(([from, to]) => ({ from, to, re: makeRe(from) }));

// ── File walking ────────────────────────────────────────────────────────────
const SKIP = ["node_modules", ".next", "features/legacy-v1", "features\\legacy-v1", "app/(app)/showcase", "app\\(app)\\showcase"];

function walk(dir, results = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    const rel  = relative("src", full);
    if (e.isDirectory()) {
      if (!["node_modules", ".next"].includes(e.name)) walk(full, results);
    } else if (e.isFile() && /\.(tsx|ts)$/.test(e.name)) {
      if (!SKIP.some((s) => rel.includes(s))) results.push(full);
    }
  }
  return results;
}

const files = SINGLE ? [SINGLE] : walk("src");

let totalChanged = 0;
let filesChanged = 0;

for (const f of files) {
  let content = readFileSync(f, "utf8");
  let changed = 0;

  for (const { from, to, re } of REPLACEMENTS) {
    const newContent = content.replace(re, to);
    const diff = (content.match(re) || []).length;
    if (diff > 0) changed += diff;
    content = newContent;
  }

  if (changed > 0) {
    totalChanged += changed;
    filesChanged++;
    const rel = relative("src", f);
    if (!DRY) {
      writeFileSync(f, content, "utf8");
      console.log(`  wrote  [${String(changed).padStart(3)}] ${rel}`);
    } else {
      console.log(`  would  [${String(changed).padStart(3)}] ${rel}`);
    }
  }
}

console.log(`\n${DRY ? "Dry-run" : "Applied"}: ${filesChanged} files, ${totalChanged} replacements`);
if (DRY) console.log("Run with --write to apply.");
