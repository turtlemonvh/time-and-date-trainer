import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { buildMountainGlyphSvg } from './pixelIcon.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(scriptDir, '../public');
const iconsDir = path.join(outDir, 'icons');

async function renderPng(svg: string, filePath: string) {
  await sharp(Buffer.from(svg)).png().toFile(filePath);
}

async function main() {
  await mkdir(iconsDir, { recursive: true });

  await writeFile(path.join(outDir, 'favicon.svg'), buildMountainGlyphSvg(64));
  await renderPng(buildMountainGlyphSvg(32), path.join(outDir, 'favicon-32x32.png'));
  await renderPng(buildMountainGlyphSvg(180), path.join(outDir, 'apple-touch-icon.png'));
  await renderPng(buildMountainGlyphSvg(192), path.join(iconsDir, 'icon-192.png'));
  await renderPng(buildMountainGlyphSvg(512), path.join(iconsDir, 'icon-512.png'));
  await renderPng(
    buildMountainGlyphSvg(512, { maskable: true }),
    path.join(iconsDir, 'icon-512-maskable.png'),
  );

  console.log('Generated icons in public/ and public/icons/');
}

main();
