import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const svg = fs.readFileSync(path.join(root, "public/icon.svg"));
const resDir = path.join(root, "mobile/android/app/src/main/res");

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

async function circleMask(size) {
  const svgMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>` +
      `</svg>`,
  );
  return sharp(svgMask).png().toBuffer();
}

for (const [folder, size] of Object.entries(launcher)) {
  const dir = path.join(resDir, folder);
  const square = await sharp(svg).resize(size, size).png().toBuffer();
  await sharp(square).toFile(path.join(dir, "ic_launcher.png"));
  const mask = await circleMask(size);
  await sharp(square)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toFile(path.join(dir, "ic_launcher_round.png"));
}

const eOnly = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <g fill="#ffffff">
    <rect x="320" y="280" width="128" height="464" rx="14" />
    <rect x="320" y="280" width="392" height="104" rx="14" />
    <rect x="320" y="460" width="316" height="104" rx="14" />
    <rect x="320" y="640" width="392" height="104" rx="14" />
  </g>
</svg>`);

for (const [folder, size] of Object.entries(foreground)) {
  const dir = path.join(resDir, folder);
  await sharp(eOnly).resize(size, size).png().toFile(path.join(dir, "ic_launcher_foreground.png"));
}

console.log("launcher icons gerados");
