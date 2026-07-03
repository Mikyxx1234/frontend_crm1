import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const DRY = !process.argv.includes("--write");
const SKIP = ["node_modules", ".next", "legacy-v1", "showcase"];

// Mapeamentos ordenados do mais específico para o mais geral
const MAP = [
  // bg-white opacity variants → glass tokens
  [/\bbg-white\/(?:95|97|100)\b/g, "bg-[var(--glass-bg-modal)]"],
  [/\bbg-white\/(?:80|82|85)\b/g,  "bg-[var(--glass-bg-base)]"],
  [/\bbg-white\/(?:55|58|60|65)\b/g, "bg-[var(--glass-bg-overlay)]"],
  [/\bbg-white\/(?:28|30|32|35|40)\b/g, "bg-[var(--glass-bg-panel)]"],
  [/\bbg-white\/(?:8|10|12|15)\b/g, "bg-[var(--glass-bg-subtle)]"],

  // border-white opacity variants → glass-border
  [/\bborder-white\/(?:40|45|50|55|60)\b/g, "border-[var(--glass-border)]"],
  [/\bborder-white\/(?:10|12|15|20)\b/g, "border-[var(--glass-border-subtle)]"],

  // hover variants (ex: hover:bg-white/40)
  [/\bhover:bg-white\/(?:28|30|32|35|40)\b/g, "hover:bg-[var(--glass-bg-panel)]"],
  [/\bhover:bg-white\/(?:8|10|12|15|20)\b/g, "hover:bg-[var(--glass-bg-subtle)]"],

  // dark: variants (ex: dark:bg-white/5)
  [/\bdark:bg-white\/(?:3|4|5)\b/g, "dark:bg-[var(--glass-bg-subtle)]"],
  [/\bdark:border-white\/(?:10|12|15)\b/g, "dark:border-[var(--glass-border-subtle)]"],
];

const PATTERN_LABELS = [
  "bg-white/95|97|100  → glass-bg-modal",
  "bg-white/80|82|85   → glass-bg-base",
  "bg-white/55|58|60|65 → glass-bg-overlay",
  "bg-white/28|30|32|35|40 → glass-bg-panel",
  "bg-white/8|10|12|15  → glass-bg-subtle",
  "border-white/40..60 → glass-border",
  "border-white/10..20 → glass-border-subtle",
  "hover:bg-white/28..40 → hover:glass-bg-panel",
  "hover:bg-white/8..20 → hover:glass-bg-subtle",
  "dark:bg-white/3..5  → dark:glass-bg-subtle",
  "dark:border-white/10..15 → dark:glass-border-subtle",
];

function walk(dir, results = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    const rel = relative(".", full).replace(/\\/g, "/");
    if (e.isDirectory() && !["node_modules", ".next"].includes(e.name)) walk(full, results);
    else if (e.isFile() && /\.(tsx|ts)$/.test(e.name)) {
      if (!SKIP.some(s => rel.includes(s))) results.push(full);
    }
  }
  return results;
}

const patternCounts = new Array(MAP.length).fill(0);
let total = 0, files = 0;

for (const f of walk("src")) {
  let content = readFileSync(f, "utf8");
  let count = 0;
  for (let i = 0; i < MAP.length; i++) {
    const [re, to] = MAP[i];
    const prev = content;
    const matches = (prev.match(re) || []).length;
    content = content.replace(re, to);
    if (matches > 0) {
      patternCounts[i] += matches;
      count += matches;
    }
  }
  if (count > 0) {
    total += count; files++;
    const rel = relative("src", f);
    if (!DRY) { writeFileSync(f, content, "utf8"); console.log(`  wrote [${count}] ${rel}`); }
    else console.log(`  would [${count}] ${rel}`);
  }
}

console.log(`\n${DRY ? "Dry-run" : "Applied"}: ${files} files, ${total} replacements`);

console.log("\nBreakdown by pattern:");
for (let i = 0; i < MAP.length; i++) {
  if (patternCounts[i] > 0) {
    console.log(`  [${String(patternCounts[i]).padStart(3)}]  ${PATTERN_LABELS[i]}`);
  }
}

if (DRY) console.log("\nRun with --write to apply.");
