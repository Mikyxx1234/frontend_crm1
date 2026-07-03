/**
 * migrate-radius.mjs — substitui rounded-[Npx] com tokens exatos do DS.
 * Só toca valores com correspondência 1:1:
 *   6px = --radius-sm, 8px = --radius-md, 12px = --radius-lg,
 *   16px = --radius-xl, 32px = --radius-2xl
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const DRY = !process.argv.includes("--write");
const SKIP = ["node_modules", ".next", "features/legacy-v1", "features\\legacy-v1",
              "app/(app)/showcase", "app\\(app)\\showcase"];

// Only exact-match tokens — no approximations
const MAP = [
  [/\brounded-\[6px\]/g,    "rounded-[var(--radius-sm)]"],
  [/\brounded-\[8px\]/g,    "rounded-[var(--radius-md)]"],
  [/\brounded-\[12px\]/g,   "rounded-[var(--radius-lg)]"],
  [/\brounded-\[16px\]/g,   "rounded-[var(--radius-xl)]"],
  [/\brounded-\[32px\]/g,   "rounded-[var(--radius-2xl)]"],
  // directional variants
  [/\brounded-t-\[6px\]/g,  "rounded-t-[var(--radius-sm)]"],
  [/\brounded-b-\[6px\]/g,  "rounded-b-[var(--radius-sm)]"],
  [/\brounded-l-\[6px\]/g,  "rounded-l-[var(--radius-sm)]"],
  [/\brounded-r-\[6px\]/g,  "rounded-r-[var(--radius-sm)]"],
];

function walk(dir, results = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    const rel  = relative("src", full);
    if (e.isDirectory() && e.name !== "node_modules" && e.name !== ".next") walk(full, results);
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
    const count = (content.match(re) || []).length;
    if (count > 0) { content = content.replace(re, to); changed += count; }
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
