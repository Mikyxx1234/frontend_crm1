import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const palette = ["slate","gray","zinc","neutral","stone","red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose"];
const shades = "(?:50|100|200|300|400|500|600|700|800|900|950)";
const utilities = "(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|caret|accent|shadow|decoration)";
const re = new RegExp(
  `\\b(?:${utilities})-(?:${palette.join("|")})-${shades}(?:/\\d+)?\\b`,
  "g"
);

function walk(dir, results = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && e.name !== ".next") walk(full, results);
    else if (e.isFile() && /\.(tsx|ts|css)$/.test(e.name)) results.push(full);
  }
  return results;
}

const freq = {};
for (const f of walk("src")) {
  const content = readFileSync(f, "utf8");
  for (const m of content.matchAll(re)) {
    const k = m[0];
    freq[k] = (freq[k] || 0) + 1;
  }
}

const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 50);
sorted.forEach(([k, n]) => console.log(String(n).padStart(5), k));
