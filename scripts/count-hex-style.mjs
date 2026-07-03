import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const re = /"#[0-9a-fA-F]{3,8}"/g;
const SKIP = ["node_modules", ".next", "legacy-v1", "showcase"];

function walk(dir, results = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory() && !SKIP.some(s => e.name === s)) walk(full, results);
    else if (e.isFile() && /\.(tsx|ts)$/.test(e.name)) {
      if (!SKIP.some(s => full.includes(s))) results.push(full);
    }
  }
  return results;
}

const byFile = [];
for (const f of walk("src")) {
  const content = readFileSync(f, "utf8");
  const matches = content.match(re) || [];
  if (matches.length > 0) byFile.push([matches.length, relative("src", f), matches]);
}
byFile.sort((a, b) => b[0] - a[0]);
byFile.slice(0, 25).forEach(([n, f, matches]) => {
  const unique = [...new Set(matches)].join(", ");
  console.log(String(n).padStart(4), f);
  console.log("    Colors:", unique.slice(0, 120));
});
console.log("\nTotal files:", byFile.length);
console.log("Total occurrences:", byFile.reduce((s, [n]) => s + n, 0));
