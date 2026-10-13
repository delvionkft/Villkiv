// Feltölthető csomag készítése (pl. Netlify Drop): csak a weboldalhoz szükséges fájlok.
// Futtatás: npm run build  →  dist/ mappa (ezt kell feltölteni, vagy a belőle készült zip-et)
import { cp, mkdir, rm, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');

await rm(DIST, { recursive: true, force: true });
await mkdir(path.join(DIST, 'assets'), { recursive: true });

await cp(path.join(ROOT, 'index.html'), path.join(DIST, 'index.html'));
for (const f of ['favicon.png', 'apple-touch-icon.png']) await cp(path.join(ROOT, 'assets', f), path.join(DIST, 'assets', f));
for (const dir of ['css', 'js', 'img']) {
  await cp(path.join(ROOT, 'assets', dir), path.join(DIST, 'assets', dir), { recursive: true });
}
await mkdir(path.join(DIST, 'assets/fonts'), { recursive: true });
for (const f of await readdir(path.join(ROOT, 'assets/fonts'))) {
  if (f.endsWith('.woff2') || f === 'OFL.txt') await cp(path.join(ROOT, 'assets/fonts', f), path.join(DIST, 'assets/fonts', f));
}
console.log('Kész: dist/ – ezt a mappát kell feltölteni.');
