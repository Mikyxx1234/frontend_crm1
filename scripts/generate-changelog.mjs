#!/usr/bin/env node
/**
 * Parseia CHANGELOG.md → public/changelog.json
 *
 * Executado em predev/prebuild. Gera artefato estático que o componente
 * UpdateAvailableBanner consome via fetch('/changelog.json').
 *
 * Estrutura do JSON:
 *   {
 *     releases: [
 *       { version, date, label?, sections: { feat: [...], fix: [...], ... } }
 *     ]
 *   }
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHANGELOG_PATH = resolve(__dirname, "..", "CHANGELOG.md");
const OUT_PATH = resolve(__dirname, "..", "public", "changelog.json");

function parse(md) {
  const lines = md.split(/\r?\n/);
  const releases = [];
  let current = null;
  let currentSection = null;

  const reH2 = /^##\s+\[([^\]]+)\](?:\s*[—-]\s*(.+))?$/;
  const reH3 = /^###\s+(.+?)\s*$/;
  const reBullet = /^[-*]\s+(.+)$/;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const h2 = line.match(reH2);
    if (h2) {
      if (current) releases.push(current);
      const version = h2[1].trim();
      const tail = (h2[2] ?? "").trim();
      // tail pode ser "2026-05-21" ou "branch DEV_BRANCH" etc.
      const dateMatch = tail.match(/(\d{4}-\d{2}-\d{2})/);
      current = {
        version: version.toLowerCase(),
        date: dateMatch ? dateMatch[1] : null,
        label: !dateMatch && tail ? tail : null,
        sections: {},
      };
      currentSection = null;
      continue;
    }
    if (!current) continue;
    const h3 = line.match(reH3);
    if (h3) {
      // normaliza "feat (anteriores)" → "feat"
      const key = h3[1].toLowerCase().split(/\s+/)[0].replace(/[^a-z]/g, "");
      currentSection = key;
      if (!current.sections[key]) current.sections[key] = [];
      continue;
    }
    if (line.startsWith("---")) {
      currentSection = null;
      continue;
    }
    const bullet = line.match(reBullet);
    if (bullet && currentSection) {
      // Pega apenas a primeira linha do bullet (sub-bullets viram texto plano abaixo).
      const text = bullet[1]
        .replace(/`([^`]+)`/g, "$1") // remove backticks
        .replace(/\*\*([^*]+)\*\*/g, "$1") // remove bold
        .replace(/\s+\(`[0-9a-f]{6,}`(?:,\s*back\s+`[0-9a-f]{6,}`)?\)\s*$/i, "") // remove hashes finais
        .trim();
      current.sections[currentSection].push(text);
    }
  }
  if (current) releases.push(current);
  return { releases, generatedAt: new Date().toISOString() };
}

function main() {
  let md;
  try {
    md = readFileSync(CHANGELOG_PATH, "utf8");
  } catch {
    console.warn(`[generate-changelog] CHANGELOG.md não encontrado em ${CHANGELOG_PATH}; gerando JSON vazio.`);
    md = "";
  }
  const data = parse(md);
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`[generate-changelog] ${data.releases.length} releases → ${OUT_PATH}`);
}

main();
