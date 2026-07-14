/**
 * migrate-hex-class.mjs — substitui cores hex diretas em classes Tailwind
 * por tokens do DS (--channel-*, --color-*).
 *
 * Apenas substituições 1:1 com token exato; não aproxima.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const DRY = !process.argv.includes("--write");

const SKIP = [
  "node_modules", ".next",
  join("features", "legacy-v1"), join("app", "(app)", "showcase"),
  // Windows paths
  "features\\legacy-v1", "app\\(app)\\showcase",
];

// Each entry: [regex, replacement]
// Ordered most-specific first.
const MAP = [
  // ── Canal WhatsApp ────────────────────────────────────────────────────────
  // Handles bg-[#25D366], text-[#25D366], border-[#25D366], ring-[#25D366]
  // AND opacity variants like bg-[#25D366]/15, border-[#25D366]/20
  [/(?<=\b(?:bg|text|border|ring|from|to|via)-)\[#25[Dd]366\]/g,
   "[var(--channel-whatsapp)]"],
  // opacity variants: bg-[#25D366]/15 → bg-[var(--channel-whatsapp)]/15
  [/\[#25[Dd]366\]\//g,  "[var(--channel-whatsapp)]/"],
  [/\[#22c55e\]\//g,     "[var(--color-success)]/"],
  [/(?<=\b(?:bg|text|border|ring|from|to|via)-)\[#22c55e\]/g,
   "[var(--color-success)]"],

  // ── Canal Facebook ─────────────────────────────────────────────────────────
  [/\[#1877[Ff]2\]\//g,  "[var(--channel-facebook)]/"],
  [/(?<=\b(?:bg|text|border|ring|from|to|via)-)\[#1877[Ff]2\]/g,
   "[var(--channel-facebook)]"],
  [/\[#166[Ff][Ee]5\]\//g, "[var(--channel-facebook)]/"],
  [/(?<=\b(?:bg|text|border|ring|from|to|via)-)\[#166[Ff][Ee]5\]/g,
   "[var(--channel-facebook)]"],

  // ── Badge success text ─────────────────────────────────────────────────────
  [/\[#065f46\]/g,       "[var(--color-success-text)]"],

  // ── Success dark ──────────────────────────────────────────────────────────
  [/\[#0f7a5a\]/g,       "[var(--color-success-dark)]"],

  // ── Warning badge text (amber-800) ────────────────────────────────────────
  [/\[#92600a\]/g,       "[var(--color-warn-text)]"],

  // ── Danger (red-500) ──────────────────────────────────────────────────────
  [/\[#ef4444\]\//g,     "[var(--color-danger)]/"],
  [/(?<=\b(?:bg|text|border|ring|from|to|via)-)\[#ef4444\]/g,
   "[var(--color-danger)]"],

  // ── Brand gradient end (indigo-900) ───────────────────────────────────────
  [/\[#1e3a8a\]/g,       "[var(--brand-gradient-end)]"],

  // ── Brand hover ────────────────────────────────────────────────────────────
  [/\[#4466d6\]/g,       "[var(--brand-primary-hover)]"],

  // ── Brand secondary + accent (gradient badge) ─────────────────────────────
  [/\[#a78bfa\]\//g,     "[var(--brand-secondary)]/"],
  [/(?<=\b(?:bg|text|border|ring|from|to|via)-)\[#a78bfa\]/g,
   "[var(--brand-secondary)]"],
  [/\[#f472b6\]\//g,     "[var(--brand-accent)]/"],
  [/(?<=\b(?:bg|text|border|ring|from|to|via)-)\[#f472b6\]/g,
   "[var(--brand-accent)]"],

  // ── Brand primary by hex (used in gradients with opacity) ─────────────────
  // #5B6FF5 == --brand-primary but needs case-insensitive match
  [/\[#5[Bb]6[Ff][Ff]5\]\//g,  "[var(--brand-primary)]/"],
  [/(?<=\b(?:bg|text|border|ring|from|to|via)-)\[#5[Bb]6[Ff][Ff]5\]/g,
   "[var(--brand-primary)]"],
];

function walk(dir, results = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    const rel  = relative(".", full);
    if (e.isDirectory() && !["node_modules", ".next"].includes(e.name)) walk(full, results);
    else if (e.isFile() && /\.(tsx|ts)$/.test(e.name)) {
      if (!SKIP.some((s) => rel.includes(s))) results.push(full);
    }
  }
  return results;
}

let totalChanged = 0, filesChanged = 0;

for (const f of walk("src")) {
  let content = readFileSync(f, "utf8");
  let changed = 0;

  for (const [re, to] of MAP) {
    const before = content;
    content = content.replace(re, to);
    if (content !== before) {
      const count = (before.match(re) || []).length;
      changed += count;
    }
  }

  if (changed > 0) {
    totalChanged += changed;
    filesChanged++;
    const rel = relative("src", f);
    if (!DRY) { writeFileSync(f, content, "utf8"); console.log(`  wrote [${changed}] ${rel}`); }
    else       { console.log(`  would [${changed}] ${rel}`); }
  }
}

console.log(`\n${DRY ? "Dry-run" : "Applied"}: ${filesChanged} files, ${totalChanged} replacements`);
if (DRY) console.log("Run with --write to apply.");
