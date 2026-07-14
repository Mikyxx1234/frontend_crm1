import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const palette = ["slate","gray","zinc","neutral","stone","red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose"];
const shades = "(?:50|100|200|300|400|500|600|700|800|900|950)";
const utilities = "(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|caret|accent|shadow|decoration)";
const re = new RegExp(
  `(?:^|["' \`\\[{(])(?:[a-z-]+:)*(?:hover:|focus:|active:|disabled:|dark:|v2-dark:)*${utilities}-(?:${palette.join("|")})-${shades}(?:/[\\w.]+)?`,
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

const counts = [];
for (const f of walk("src")) {
  const content = readFileSync(f, "utf8");
  const matches = content.match(re);
  if (matches?.length) counts.push([matches.length, relative("src", f)]);
}

counts.sort((a, b) => b[0] - a[0]);
counts.slice(0, 25).forEach(([n, f]) => console.log(String(n).padStart(4), f));
console.log("---");
console.log("Top-25 subtotal:", counts.slice(0, 25).reduce((s, [n]) => s + n, 0));
console.log("Grand total:", counts.reduce((s, [n]) => s + n, 0));
