/**
 * migrate-lucide.mjs
 * DS-001: migra imports de lucide-react → @tabler/icons-react
 *
 * Uso:
 *   node scripts/migrate-lucide.mjs                  # dry-run (mostra o que mudaria)
 *   node scripts/migrate-lucide.mjs --write           # aplica as alterações
 *   node scripts/migrate-lucide.mjs --write --dir src/features/legacy-v1
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";
import { ICON_MAP, TYPE_MAP } from "./lucide-tabler-map.mjs";

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--write");
const TARGET_DIR = (() => {
  const idx = args.indexOf("--dir");
  if (idx !== -1 && args[idx + 1]) return join(process.cwd(), args[idx + 1]);
  return join(process.cwd(), "src");
})();

let totalFiles = 0;
let changedFiles = 0;
let unknownIcons = new Set();

function collectFiles(dir) {
  const result = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) { result.push(...collectFiles(full)); continue; }
    if ([".tsx", ".ts"].includes(extname(e.name))) result.push(full);
  }
  return result;
}

function migrateFile(filePath) {
  const src = readFileSync(filePath, "utf8");

  // Only process files with lucide-react imports
  if (!src.includes("lucide-react")) return null;

  let out = src;

  // Match all lucide-react import statements (may span multiple lines)
  const importRegex = /import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g;
  let match;

  while ((match = importRegex.exec(src)) !== null) {
    const isTypeImport = !!match[1];
    const importBody = match[2];
    const fullMatch = match[0];

    // Parse individual imports: "IconA, IconB as AliasB, type IconC"
    const imports = importBody.split(",").map(s => s.trim()).filter(Boolean);

    const tablerImports = [];
    const typeImports = [];

    for (const imp of imports) {
      // Handle "type X" and "X as Y"
      const isType = imp.startsWith("type ");
      const cleanImp = imp.replace(/^type\s+/, "");
      const [origName, alias] = cleanImp.split(/\s+as\s+/).map(s => s.trim());

      if (origName === "LucideIcon" || origName === "LucideProps") {
        // Type-level import — always keep original name as alias to avoid code changes
        const mapped = TYPE_MAP[origName] || origName;
        if (alias) {
          typeImports.push(`${mapped} as ${alias}`);
        } else {
          // Preserve original name: Icon as LucideIcon
          typeImports.push(`${mapped} as ${origName}`);
        }
        continue;
      }

      const tablerName = ICON_MAP[origName];
      if (!tablerName) {
        unknownIcons.add(origName);
        // Keep the original name as a guess (add Icon prefix)
        const guessName = `Icon${origName}`;
        if (alias) {
          (isType || isTypeImport ? typeImports : tablerImports).push(`${guessName} as ${alias}`);
        } else {
          (isType || isTypeImport ? typeImports : tablerImports).push(`${guessName} as ${origName}`);
        }
        continue;
      }

      if (isType || isTypeImport) {
        if (alias) {
          typeImports.push(`${tablerName} as ${alias}`);
        } else {
          typeImports.push(`${tablerName} as ${origName}`);
        }
      } else {
        if (alias) {
          tablerImports.push(`${tablerName} as ${alias}`);
        } else {
          // No alias: replace usages too
          tablerImports.push(`${tablerName} as ${origName}`);
        }
      }
    }

    // Build replacement import statement(s)
    let replacement = "";
    if (tablerImports.length > 0) {
      replacement += `import { ${tablerImports.join(", ")} } from "@tabler/icons-react"`;
    }
    if (typeImports.length > 0) {
      if (replacement) replacement += "\n";
      replacement += `import type { ${typeImports.join(", ")} } from "@tabler/icons-react"`;
    }

    out = out.replace(fullMatch, replacement);
  }

  // If nothing changed, skip
  if (out === src) return null;

  return out;
}

// Main
const files = collectFiles(TARGET_DIR);
totalFiles = files.length;

for (const file of files) {
  const result = migrateFile(file);
  if (!result) continue;

  const rel = relative(process.cwd(), file);
  changedFiles++;

  if (DRY_RUN) {
    console.log(`[DRY] ${rel}`);
  } else {
    writeFileSync(file, result, "utf8");
    console.log(`[DONE] ${rel}`);
  }
}

console.log(`\n${"─".repeat(60)}`);
console.log(`Arquivos escaneados : ${totalFiles}`);
console.log(`Arquivos ${DRY_RUN ? "a alterar" : "alterados"}: ${changedFiles}`);

if (unknownIcons.size > 0) {
  console.log(`\n⚠ Ícones sem mapeamento (verifique manualmente):`);
  [...unknownIcons].sort().forEach(n => console.log(`  - ${n}`));
}

if (DRY_RUN && changedFiles > 0) {
  console.log(`\nRode com --write para aplicar as alterações.`);
}
