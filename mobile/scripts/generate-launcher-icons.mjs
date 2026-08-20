/**
 * Gera os PNGs de launcher do Android a partir da marca EduIT.
 *
 * O glifo ocupa ~55% do quadro: launchers como MIUI/POCO ainda encolhem o
 * ícone dentro de um círculo branco, e com menos que isso o "E" fica ilegível.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const resDir = path.join(root, "mobile/android/app/src/main/res");

const NAVY = "#0d1b3e";
const GLYPH_SPAN = 560;

const launcher = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

const foreground = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432,
};

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

const GLOW = `<radialGradient id="glow" cx="80%" cy="80%" r="55%">
    <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.32" />
    <stop offset="60%" stop-color="#06b6d4" stop-opacity="0.05" />
    <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
  </radialGradient>`;

function iconSvg({ round }) {
  const clip = round
    ? `<circle cx="512" cy="512" r="512" />`
    : `<rect x="0" y="0" width="1024" height="1024" rx="230" ry="230" />`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs><clipPath id="mask">${clip}</clipPath>${GLOW}</defs>
  <g clip-path="url(#mask)">
    <rect x="0" y="0" width="1024" height="1024" fill="${NAVY}" />
    <rect x="0" y="0" width="1024" height="1024" fill="url(#glow)" />
    ${eGlyph(GLYPH_SPAN)}
  </g>
</svg>`);
}

const foregroundSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  ${eGlyph(GLYPH_SPAN)}
</svg>`);

const square = iconSvg({ round: false });
const round = iconSvg({ round: true });

for (const [folder, size] of Object.entries(launcher)) {
  const dir = path.join(resDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  await sharp(square).resize(size, size).png().toFile(path.join(dir, "ic_launcher.png"));
  await sharp(round).resize(size, size).png().toFile(path.join(dir, "ic_launcher_round.png"));
}

for (const [folder, size] of Object.entries(foreground)) {
  const dir = path.join(resDir, folder);
  await sharp(foregroundSvg)
    .resize(size, size)
    .png()
    .toFile(path.join(dir, "ic_launcher_foreground.png"));
}

console.log("launcher icons gerados");
