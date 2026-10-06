// Élesítés előtti ellenőrzés: kilistázza a még ki nem töltött helyőrzőket.
// Kilépési kód 1, ha maradt helyőrző – így deploy-folyamatba is beköthető.
import { readFile, readdir } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
// A megjegyzéseket és a <template> sablonokat (pl. referenciák) nem vizsgáljuk
const visible = html.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/<template[\s\S]*?<\/template>/g, (m) => m.replace(/[^\n]/g, ' '));

const lines = visible.split('\n');
const hits = [];
lines.forEach((line, i) => {
  const found = new Set();
  for (const m of line.matchAll(/\[[^\]\n]{2,}\]/g)) found.add(m[0]);
  if (/data-placeholder/.test(line) && found.size === 0) found.add('data-placeholder');
  if (/href="(tel:|mailto:|#)"/.test(line)) found.add('üres hivatkozás (tel:/mailto:/#)');
  if (/action=""/.test(line)) found.add('űrlap-végpont (form action) nincs megadva');
  if (found.size) hits.push(`${String(i + 1).padStart(4)}: ${[...found].join(' | ')}`);
});

// Képek: amelyikhez még csak SVG helyőrző van az assets/src mappában
const srcFiles = await readdir(new URL('../assets/src/', import.meta.url));
const names = [...new Set(srcFiles.map((f) => f.replace(/\.[^.]+$/, '')))];
for (const name of names) {
  if (!srcFiles.some((f) => f.startsWith(`${name}.`) && !f.endsWith('.svg'))) {
    hits.push(`kép: assets/src/${name}.svg → cseréld saját fotóra (${name}.jpg), majd: npm run images`);
  }
}

if (hits.length) {
  console.log(`Kitöltendő helyőrzők (${hits.length}):\n`);
  console.log(hits.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Nincs kitöltetlen helyőrző.');
}
