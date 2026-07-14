/**
 * migrate-spacing-px.mjs
 * Substitui valores arbitrários em px nas classes de espaçamento Tailwind
 * pelos equivalentes semânticos do grid 4px.
 *
 * Uso:
 *   node scripts/migrate-spacing-px.mjs          → dry-run
 *   node scripts/migrate-spacing-px.mjs --write  → aplica mudanças
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const DRY = !process.argv.includes("--write");

// Mapa: valor px (string) → classe Tailwind equivalente
// Tailwind v4 tem fractional: 0.5=2px, 1.5=6px, 2.5=10px, 3.5=14px, 4.5=18px, 5.5=22px, 6.5=26px
const PX_TO_TW = {
  "1":  "px",   // 1px  → p-px (classe especial Tailwind)
  "2":  "0.5",  // 2px  → exato (Tailwind v4: 0.5=2px)
  "3":  "1",    // 3px  → arredonda para 4px
  "5":  "1",    // 5px  → arredonda para 4px
  "7":  "2",    // 7px  → arredonda para 8px
  "9":  "2",    // 9px  → arredonda para 8px
  "11": "3",    // 11px → arredonda para 12px
  "13": "3",    // 13px → arredonda para 12px
  "14": "3.5",  // 14px → exato (Tailwind v4: 3.5=14px)
  "18": "4.5",  // 18px → exato (Tailwind v4: 4.5=18px)
  "22": "5.5",  // 22px → exato (Tailwind v4: 5.5=22px)
  "25": "6",    // 25px → arredonda para 24px
  "26": "6.5",  // 26px → exato (Tailwind v4: 6.5=26px)
  "42": "11",   // 42px → arredonda para 44px
};

const SKIP = [
  "node_modules", ".next",
  "features/legacy-v1", "features\\legacy-v1",
  "app/(app)/showcase", "app\\(app)\\showcase",
];

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

// Captura: prop-[Npx] onde prop é qualquer utilidade de espaçamento Tailwind
// Funciona com variantes: hover:, dark:, [&>th]:, -mb- (negativo), etc.
const PATTERN = /\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap-x|gap-y|gap|space-x|space-y)-\[(\d+(?:\.\d+)?)px\]/g;

const files = walk("src");
let totalChanged = 0;
let filesChanged = 0;
const skippedValues = new Set();

for (const f of files) {
  let content = readFileSync(f, "utf8");
  let changed = 0;

  const newContent = content.replace(PATTERN, (match, prop, val) => {
    const tw = PX_TO_TW[val];
    if (!tw) {
      skippedValues.add(`${prop}-[${val}px]`);
      return match;
    }
    changed++;
    return `${prop}-${tw}`;
  });

  if (changed > 0) {
    totalChanged += changed;
    filesChanged++;
    const rel = relative("src", f);
    if (!DRY) {
      writeFileSync(f, newContent, "utf8");
      console.log(`  wrote  [${String(changed).padStart(3)}] ${rel}`);
    } else {
      console.log(`  would  [${String(changed).padStart(3)}] ${rel}`);
    }
  }
}

console.log(`\n${DRY ? "Dry-run" : "Applied"}: ${filesChanged} files, ${totalChanged} replacements`);
if (skippedValues.size > 0) {
  console.log(`Skipped (unmapped px values): ${[...skippedValues].join(", ")}`);
}
if (DRY) console.log("Run with --write to apply.");
