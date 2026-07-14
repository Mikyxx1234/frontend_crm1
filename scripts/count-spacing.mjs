import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

// Matches p-[Npx], gap-[Npx], m-[Npx], text-[Npx], h-[Npx], w-[Npx] etc.
const re = /\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|text|leading|tracking|h|w|min-h|max-h|min-w|max-w|size|top|right|bottom|left|inset)-\[(\d+(?:\.\d+)?)px\]/g;

function walk(dir, results = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && e.name !== ".next") walk(full, results);
    else if (e.isFile() && /\.(tsx|ts)$/.test(e.name)) results.push(full);
  }
  return results;
}

const byClass = {};
const byFile = [];

for (const f of walk("src")) {
  const content = readFileSync(f, "utf8");
  const matches = [...content.matchAll(re)];
  if (matches.length) {
    byFile.push([matches.length, relative("src", f)]);
    for (const m of matches) {
      byClass[m[0]] = (byClass[m[0]] || 0) + 1;
    }
  }
}

console.log("── TOP CLASSES ──");
Object.entries(byClass).sort((a, b) => b[1] - a[1]).slice(0, 30)
  .forEach(([k, n]) => console.log(String(n).padStart(4), k));

console.log("\n── TOP FILES ──");
byFile.sort((a, b) => b[0] - a[0]).slice(0, 20)
  .forEach(([n, f]) => console.log(String(n).padStart(4), f));

console.log("\nTotal classes:", Object.values(byClass).reduce((s, n) => s + n, 0));
