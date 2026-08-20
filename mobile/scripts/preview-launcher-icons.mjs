/**
 * Gera PNGs de prévia do ícone (atual x proposto) nas máscaras usadas pelos
 * launchers: círculo, squircle e o embrulho branco que MIUI/POCO aplica.
 * Saída em .tmp-icon-preview/ (fora do Git).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = path.join(root, ".tmp-icon-preview");
fs.mkdirSync(outDir, { recursive: true });

const SIZE = 512;
const NAVY = "#0d1b3e";

/** Glifo "E" centrado em 1024x1024, com `span` = largura total do E. */
function eGlyph(span) {
  const stemW = span * 0.327;
  const barH = span * 0.265;
  const height = span * 1.184;
  const x = (1024 - span) / 2;
  const y = (1024 - height) / 2;
  const midW = span * 0.806;
  const r = span * 0.036;
  return `
    <g fill="#ffffff">
      <rect x="${x}" y="${y}" width="${stemW}" height="${height}" rx="${r}" />
      <rect x="${x}" y="${y}" width="${span}" height="${barH}" rx="${r}" />
      <rect x="${x}" y="${(1024 - barH) / 2}" width="${midW}" height="${barH}" rx="${r}" />
      <rect x="${x}" y="${y + height - barH}" width="${span}" height="${barH}" rx="${r}" />
    </g>`;
}

function iconSvg(span, { shape }) {
  const clip =
    shape === "circle"
      ? `<circle cx="512" cy="512" r="512" />`
      : `<rect x="0" y="0" width="1024" height="1024" rx="230" ry="230" />`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${SIZE}" height="${SIZE}">
  <defs>
    <clipPath id="mask">${clip}</clipPath>
    <radialGradient id="glow" cx="80%" cy="80%" r="55%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.32" />
      <stop offset="60%" stop-color="#06b6d4" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
    </radialGradient>
  </defs>
  <g clip-path="url(#mask)">
    <rect x="0" y="0" width="1024" height="1024" fill="${NAVY}" />
    <rect x="0" y="0" width="1024" height="1024" fill="url(#glow)" />
    ${eGlyph(span)}
  </g>
</svg>`);
}

/** Embrulho branco do MIUI: encolhe o ícone e centraliza num círculo branco. */
function miuiSvg(span) {
  const inner = 0.68;
  const off = (1024 * (1 - inner)) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${SIZE}" height="${SIZE}">
  <defs>
    <clipPath id="innerMask">
      <rect x="0" y="0" width="1024" height="1024" rx="230" ry="230" />
    </clipPath>
  </defs>
  <circle cx="512" cy="512" r="512" fill="#ffffff" />
  <g transform="translate(${off} ${off}) scale(${inner})">
    <g clip-path="url(#innerMask)">
      <rect x="0" y="0" width="1024" height="1024" fill="${NAVY}" />
      ${eGlyph(span)}
    </g>
  </g>
</svg>`);
}

const ATUAL = 392;
const PROPOSTO = 560;

const jobs = [
  ["atual-circulo.png", iconSvg(ATUAL, { shape: "circle" })],
  ["atual-miui.png", miuiSvg(ATUAL)],
  ["proposto-circulo.png", iconSvg(PROPOSTO, { shape: "circle" })],
  ["proposto-squircle.png", iconSvg(PROPOSTO, { shape: "squircle" })],
  ["proposto-miui.png", miuiSvg(PROPOSTO)],
];

for (const [name, svg] of jobs) {
  await sharp(svg).png().toFile(path.join(outDir, name));
}

console.log("previa em", outDir);
