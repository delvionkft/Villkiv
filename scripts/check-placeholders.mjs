// Élesítés előtti ellenőrzés: kilistázza a még ki nem töltött helyőrzőket.
// Kilépési kód 1, ha maradt helyőrző – így deploy-folyamatba is beköthető.
import { readFile, readdir } from 'node:fs/promises';

// A főoldal és az aloldalak forrásai (a gyökérben lévő aloldalak ezekből generálódnak)
const pageFiles = ['index.html', ...(await readdir(new URL('../pages/', import.meta.url))).filter((f) => f.endsWith('.html')).map((f) => `pages/${f}`)];
const hits = [];
for (const file of pageFiles) {
  const html = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  // A megjegyzéseket és a <template> sablonokat (pl. referenciák) nem vizsgáljuk
  const visible = html.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<template[\s\S]*?<\/template>/g, (m) => m.replace(/[^\n]/g, ' '));

  visible.split('\n').forEach((line, i) => {
    const found = new Set();
    for (const m of line.matchAll(/\[[^\]\n]{2,}\]/g)) found.add(m[0]);
    if (/data-placeholder/.test(line) && found.size === 0) found.add('data-placeholder');
    if (/href="(tel:|mailto:|#)"/.test(line)) found.add('üres hivatkozás (tel:/mailto:/#)');
    if (/<form\b/.test(line)) {
      const attr = (n) => (line.match(new RegExp(`${n}="([^"]*)"`)) || [])[1]?.trim() || '';
      const emailjs = ['data-emailjs-public-key', 'data-emailjs-service', 'data-emailjs-template'];
      const missing = emailjs.filter((n) => !attr(n));
      if (missing.length && !/^https:\/\//.test(attr('action'))) {
        found.add(`űrlap nincs bekötve – hiányzik: ${missing.join(', ')}`);
      }
    }
    if (found.size) hits.push(`${file}:${i + 1}: ${[...found].join(' | ')}`);
  });
}

// Képek: amelyikhez még nincs saját fotó (csak demókép vagy SVG helyőrző)
const srcFiles = await readdir(new URL('../assets/src/', import.meta.url));
const names = [...new Set(srcFiles.map((f) => f.split('.')[0]))];
for (const name of names) {
  const own = srcFiles.some((f) => /\.(jpe?g|png|webp|avif|tiff?)$/i.test(f) && f.startsWith(`${name}.`) && !f.includes('.demo.'));
  if (!own) hits.push(`kép: ${name} → tedd be a saját fotót (assets/src/${name}.jpg), majd: npm run images`);
}

if (hits.length) {
  console.log(`Kitöltendő helyőrzők (${hits.length}):\n`);
  console.log(hits.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Nincs kitöltetlen helyőrző.');
}
