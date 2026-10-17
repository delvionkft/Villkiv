// Aloldalak összeállítása a pages/ mappa tartalmából, az index.html közös
// fejlécével (ikonok), láblécével – így minden oldalon azonos marad.
// Futtatás: npm run pages
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const index = await readFile(path.join(ROOT, 'index.html'), 'utf8');
const pick = (re, label) => {
  const m = index.match(re);
  if (!m) throw new Error(`Nem található az index.html-ben: ${label}`);
  return m[0];
};
const sprite = pick(/  <svg class="sprite"[\s\S]*?\n  <\/svg>\n/, 'ikonkészlet');
const footer = pick(/  <footer class="site-footer">[\s\S]*?<\/footer>\n/, 'lábléc')
  .replace(/href="#(top)"/g, 'href="./"')
  .replace(/href="#([a-z-]+)"/g, 'href="./#$1"')
  .replace('alt="VILLKIV logó – az oldal teteje"', 'alt="VILLKIV logó – vissza a főoldalra"');

const meta = (src, key) => (src.match(new RegExp(`<!-- ${key}: (.*?) -->`)) || [])[1] || '';

for (const file of (await readdir(path.join(ROOT, 'pages'))).filter((f) => f.endsWith('.html'))) {
  const src = await readFile(path.join(ROOT, 'pages', file), 'utf8');
  const body = src.replace(/^<!-- [a-z]+: .*? -->\n/gm, '');
  const html = `<!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Ez a fájl generált: a pages/${file} és az index.html alapján (npm run pages). -->
  <title>${meta(src, 'title')}</title>
  <meta name="description" content="${meta(src, 'description')}">
  <meta name="robots" content="noindex">
  <link rel="icon" href="assets/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
  <link rel="preload" href="assets/fonts/archivo-hu.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="assets/css/styles.css">
  <script>document.documentElement.classList.add('js')</script>
  <script src="assets/js/main.js" defer></script>
</head>
<body class="page-sub ${meta(src, 'bodyclass')}">
${sprite}
  <a class="skip-link" href="#tartalom">Ugrás a tartalomra</a>

  <header class="site-header" id="top">
    <div class="site-header__inner wrap">
      <a class="brand" href="./">
        <img class="brand__logo" src="assets/img/logo-light.webp" width="439" height="124" alt="VILLKIV Mérnökiroda – vissza a főoldalra">
      </a>
      <a class="btn btn--primary btn--sm" href="./">
        <svg class="btn__icon btn__icon--back" aria-hidden="true"><use href="#i-arrow"/></svg>
        <span>Vissza<span class="btn__more"> a főoldalra</span></span>
      </a>
    </div>
    <div class="scroll-progress" aria-hidden="true"><span class="scroll-progress__bar"></span></div>
  </header>

  <main id="tartalom" tabindex="-1">
${body}  </main>

${footer}</body>
</html>
`;
  await writeFile(path.join(ROOT, file), html);
  console.log(`✓ ${file}`);
}
