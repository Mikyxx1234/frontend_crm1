import { readFileSync, readdirSync } from "fs";
import { join, extname } from "path";

const icons = new Map();
const files = [];

function scanDir(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) { scanDir(full); continue; }
    if (![".tsx", ".ts"].includes(extname(e.name))) continue;
    const src = readFileSync(full, "utf8");
    const m = src.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
    if (!m) continue;
    files.push(full.replace(process.cwd() + "\\", "").replace(process.cwd() + "/", ""));
    const names = m[1].split(",").map(s => s.trim().split(" as ")[0].trim()).filter(Boolean);
    names.forEach(n => icons.set(n, (icons.get(n) || 0) + 1));
  }
}

scanDir(join(process.cwd(), "src"));

const sorted = [...icons.entries()].sort((a, b) => b[1] - a[1]);
console.log(`Total arquivos: ${files.length}`);
console.log(`Total ícones únicos: ${sorted.length}`);
console.log("\n=== ÍCONES (nome:ocorrências) ===");
sorted.forEach(([n, c]) => console.log(`${n}:${c}`));
