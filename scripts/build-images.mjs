// Reszponzív képek előállítása az assets/src mappából.
//
// Saját fotó cseréje: tedd a fotót az assets/src mappába ugyanazzal a névvel
// (pl. hero-haz.jpg), majd futtasd: npm run images
// A saját fotó elsőbbséget kap a demóképpel (név.demo.jpg) és az SVG helyőrzővel szemben.
// A kimenet mindig a megadott képarányra vágott AVIF és WebP, így az oldal
// elrendezése (és az index.html width/height értékei) nem változik.
import { readdir, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'assets/src');
const OUT = path.join(ROOT, 'assets/img');

// ratio: szélesség / magasság — egyezzen az index.html width/height arányával
export const IMAGES = {
  'hero-haz': { ratio: 4 / 5, widths: [480, 720, 960, 1200] },
  'hero-meres': { ratio: 4 / 3, widths: [320, 480, 640] },
  'ev-eloszto': { ratio: 3 / 2, widths: [640, 960, 1280] },
  'napelem-otthon': { ratio: 4 / 3, widths: [640, 960, 1280] },
};

const PHOTO_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'];

const files = await readdir(SRC);
await mkdir(OUT, { recursive: true });

for (const [name, { ratio, widths }] of Object.entries(IMAGES)) {
  // Sorrend: saját fotó (hero-haz.jpg) → demókép (hero-haz.demo.jpg) → SVG helyőrző
  const isPhoto = (f) => PHOTO_EXT.includes(path.extname(f).toLowerCase());
  const source =
    files.find((f) => path.parse(f).name === name && isPhoto(f)) ??
    files.find((f) => path.parse(f).name === `${name}.demo` && isPhoto(f)) ??
    files.find((f) => f === `${name}.svg`);
  if (!source) {
    console.warn(`! Nincs forrás: ${name} (assets/src/${name}.jpg)`);
    continue;
  }

  for (const f of await readdir(OUT)) {
    if (f.startsWith(`${name}-`)) await rm(path.join(OUT, f));
  }

  const input = path.join(SRC, source);
  const isSvg = source.endsWith('.svg');
  for (const w of widths) {
    const h = Math.round(w / ratio);
    const base = sharp(input, isSvg ? { density: 300 } : {})
      .rotate()
      .resize(w, h, { fit: 'cover', position: 'centre' })
      .toColourspace('srgb');
    await base.clone().avif({ quality: 52, effort: 6 }).toFile(path.join(OUT, `${name}-${w}.avif`));
    await base.clone().webp({ quality: 74, effort: 6 }).toFile(path.join(OUT, `${name}-${w}.webp`));
  }
  console.log(`✓ ${name}  ←  ${source}  (${widths.join(', ')} px)`);
}
