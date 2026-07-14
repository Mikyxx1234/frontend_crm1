import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const re = /rounded(?:-[trblxy]{1,2})?-\[(\d+(?:\.\d+)?)px\]/g;

function walk(dir, results = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && e.name !== ".next") walk(full, results);
    else if (e.isFile() && /\.(tsx|ts)$/.test(e.name)) results.push(full);
  }
  return results;
}

const freq = {};
for (const f of walk("src")) {
  const content = readFileSync(f, "utf8");
  for (const m of content.matchAll(re)) {
    const full = m[0]; // e.g. "rounded-[10px]"
    freq[full] = (freq[full] || 0) + 1;
  }
}

Object.entries(freq).sort((a, b) => b[1] - a[1]).forEach(([k, n]) =>
  console.log(String(n).padStart(4), k)
);
console.log("total:", Object.values(freq).reduce((s, n) => s + n, 0));
