import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

function ensureApiImport(content) {
  if (!content.includes("apiUrl(")) return content;
  if (/from\s+["']@\/lib\/api["']/.test(content)) return content;
  const line = `import { apiUrl } from "@/lib/api";\n`;
  const m = content.match(/^("use client"|"use server");\s*\n/);
  if (m) {
    return content.slice(0, m[0].length) + line + content.slice(m[0].length);
  }
  return line + content;
}

for (const file of walk(root)) {
  let s = fs.readFileSync(file, "utf8");
  const orig = s;

  // fetch("/api/..." [, opts])
  s = s.replace(/\bfetch\s*\(\s*"(\/api\/[^"]+)"(\s*\))/g, 'fetch(apiUrl("$1")$2');
  s = s.replace(/\bfetch\s*\(\s*"(\/api\/[^"]+)"(\s*,)/g, 'fetch(apiUrl("$1")$2');

  s = s.replace(/\bfetch\s*\(\s*'(\/api\/[^']+)'(\s*\))/g, "fetch(apiUrl('$1')$2");
  s = s.replace(/\bfetch\s*\(\s*'(\/api\/[^']+)'(\s*,)/g, "fetch(apiUrl('$1')$2");

  // fetch(`/api/...`) — template sem vírgula antes do )
  s = s.replace(/\bfetch\s*\(\s*`(\/api\/[^`]+)`(\s*\))/g, "fetch(apiUrl(`$1`)$2");

  // fetch(`/api/...`, options)
  s = s.replace(/\bfetch\s*\(\s*`(\/api\/[^`]+)`(\s*,)/g, "fetch(apiUrl(`$1`)$2");

  if (s !== orig) {
    s = ensureApiImport(s);
    fs.writeFileSync(file, s, "utf8");
    console.log("patched", path.relative(process.cwd(), file));
  }
}
