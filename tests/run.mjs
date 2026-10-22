// Végponttól végpontig tartó ellenőrzések: elrendezés, akadálymentesség, menü,
// CTA-előválasztás, űrlapállapotok, elrendezésugrás.
// Futtatás: npm test   (képernyőképek: tests/output/)
import { mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
import { startServer } from '../scripts/serve.mjs';

const require = createRequire(import.meta.url);
const AXE = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
const OUT = new URL('./output/', import.meta.url).pathname;
await mkdir(OUT, { recursive: true });

const CANDIDATES = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => existsSync(p));

const server = await startServer(0);
const BASE = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch(executablePath ? { executablePath } : {});

let failed = 0;
let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n      ${String(err.message || err).split('\n').join('\n      ')}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function open(viewport, { url = BASE, reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion, locale: 'hu-HU' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('requestfailed', (r) => errors.push(`kérés sikertelen: ${r.url()}`));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await settle(page);
  return { page, context, errors };
}

// Megvárja az időalapú (belépő) animációk végét; a görgetéshez kötöttek sosem „érnek véget”
async function settle(page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.timeline === document.timeline && Number.isFinite(a.effect?.getComputedTiming().endTime))
        .map((a) => a.finished.catch(() => {})),
    ),
  );
}

async function axe(page, label) {
  await page.addScriptTag({ content: AXE });
  const res = await page.evaluate(async () =>
    // eslint-disable-next-line no-undef
    axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } }),
  );
  const bad = res.violations;
  assert(
    bad.length === 0,
    `${label}: ${bad.length} akadálymentességi hiba\n` +
      bad.map((v) => `[${v.impact}] ${v.id}: ${v.help}\n        ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n        ')}`).join('\n'),
  );
}

const WIDTHS = [320, 360, 390, 414, 768, 1024, 1280, 1440, 1920];

console.log('\nElrendezés');
for (const width of WIDTHS) {
  await test(`nincs vízszintes görgetés @${width}px`, async () => {
    const { page, context, errors } = await open({ width, height: 900 });
    const overflow = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > docW + 1 || r.left < -1) && !el.closest('.hp, .sprite, .skip-link, .hero__lines, .pv__lines');
        })
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
      return { scroll: document.documentElement.scrollWidth, docW, wide };
    });
    assert(overflow.scroll <= overflow.docW, `scrollWidth ${overflow.scroll} > ${overflow.docW}; kilógó: ${overflow.wide.join(', ')}`);
    assert(errors.length === 0, `konzolhibák: ${errors.join(' | ')}`);
    if ([320, 390, 768, 1440].includes(width)) {
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo({ top: y, behavior: 'instant' });
          await new Promise((r) => setTimeout(r, 40));
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}teljes-${width}.png`, fullPage: true });
      await page.screenshot({ path: `${OUT}elso-kepernyo-${width}.png` });
    }
    await context.close();
  });
}

await test('mobilon a főcím és a két szolgáltatásválasztó megelőzi a képeket, és az első képernyőn van', async () => {
  const { page, context } = await open({ width: 390, height: 844 });
  const box = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    return { h1: r('.hero__title'), chooser: r('.chooser'), media: r('.hero__media') };
  });
  assert(box.h1.bottom <= box.media.top && box.chooser.bottom <= box.media.top, 'a képek a szöveg előtt vannak');
  assert(box.chooser.bottom <= 844, `a választók nem férnek az első képernyőre (alja: ${Math.round(box.chooser.bottom)}px)`);
  await context.close();
});

await test('asztali nézetben a főcím, a választók és a fő fotó az első képernyőn', async () => {
  const { page, context } = await open({ width: 1440, height: 900 });
  const box = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    return { chooser: r('.chooser'), media: r('.hero__media'), h1: r('.hero__title') };
  });
  assert(box.chooser.bottom <= 900, `választók alja ${box.chooser.bottom}`);
  assert(box.media.left >= box.h1.right - 1, 'a fotó nem a szöveg mellett van');
  assert(box.media.top < 900, 'a fotó nem látszik');
  await context.close();
});

for (const width of [1024, 1280, 1440, 1920]) {
  await test(`asztali főcím pontosan két sorban, szóelválasztás nélkül @${width}px`, async () => {
    const { page, context } = await open({ width, height: 900 });
    const lines = await page.evaluate(() => {
      const h = document.querySelector('.hero__title');
      return Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight));
    });
    assert(lines === 2, `a főcím ${lines} soros`);
    await context.close();
  });
}

await test('a 320px-es nézetben a főcím szavai nem lógnak ki', async () => {
  const { page, context } = await open({ width: 320, height: 640 });
  const ok = await page.evaluate(() => {
    const h = document.querySelector('.hero__title');
    return h.scrollWidth <= h.clientWidth;
  });
  assert(ok, 'a főcím túlcsordul');
  await context.close();
});

console.log('\nAkadálymentesség');
for (const width of [390, 1440]) {
  await test(`axe: nincs WCAG 2.2 AA hiba @${width}px`, async () => {
    const { page, context } = await open({ width, height: 900 }, { reducedMotion: 'reduce' });
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    await axe(page, `${width}px`);
    await context.close();
  });
}

await test('axe: nyitott mobilmenü és hibás űrlap', async () => {
  const { page, context } = await open({ width: 390, height: 844 }, { reducedMotion: 'reduce' });
  await page.click('.nav-toggle');
  await axe(page, 'nyitott menü');
  await page.keyboard.press('Escape');
  await page.click('.form__submit');
  await axe(page, 'hibás űrlap');
  await context.close();
});

await test('ugrólink: első Tab a „Ugrás a tartalomra” linkre, Enterrel a fő tartalomra kerül a fókusz', async () => {
  const { page, context } = await open({ width: 1280, height: 800 });
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement.textContent.trim());
  assert(first === 'Ugrás a tartalomra', `első fókusz: ${first}`);
  const visible = await page.evaluate(() => document.activeElement.getBoundingClientRect().top >= 0);
  assert(visible, 'az ugrólink fókuszban sem látszik');
  await page.keyboard.press('Enter');
  const id = await page.evaluate(() => document.activeElement.id);
  assert(id === 'tartalom', `fókusz: ${id}`);
  await context.close();
});

await test('minden képnek van alt szövege, mérete, és betöltődik', async () => {
  const { page, context } = await open({ width: 1440, height: 900 });
  await page.evaluate(async () => {
    for (const img of document.images) {
      img.scrollIntoView({ block: 'center', behavior: 'instant' });
      const t0 = performance.now();
      while (!(img.complete && img.naturalWidth) && performance.now() - t0 < 5000) {
        await new Promise((r) => setTimeout(r, 50));
      }
    }
  });
  const imgs = await page.evaluate(() =>
    [...document.images].map((i) => ({ src: i.currentSrc, alt: i.getAttribute('alt'), w: i.getAttribute('width'), h: i.getAttribute('height'), ok: i.complete && i.naturalWidth > 0 })),
  );
  for (const i of imgs) {
    assert(i.alt && i.alt.length > 5, `hiányzó alt: ${i.src}`);
    assert(i.w && i.h, `hiányzó width/height: ${i.src}`);
    assert(i.ok, `nem töltődött be: ${i.src}`);
  }
  await context.close();
});

await test('a magyar ékezetes betűkhöz betöltődik a saját betűkészlet (ő, ű)', async () => {
  const { page, context } = await open({ width: 1280, height: 800 });
  const s = await page.evaluate(() => ({
    loaded: [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Archivo' && f.status === 'loaded'),
    glyphs: document.fonts.check('800 20px Archivo', 'őŐűŰ'),
    used: performance.getEntriesByType('resource').filter((r) => r.name.endsWith('.woff2')).length,
  }));
  assert(s.loaded && s.glyphs, `Archivo betöltve: ${s.loaded}, ő/ű: ${s.glyphs}`);
  assert(s.used === 1, `betűfájl-letöltések: ${s.used} (1 kellene)`);
  await context.close();
});

console.log('\nNavigáció');
await test('mobilmenü: nyitás, menüpont, bezáródás, Esc visszaadja a fókuszt', async () => {
  const { page, context } = await open({ width: 390, height: 844 });
  assert(!(await page.isVisible('#fomenu')), 'a menü alapból nyitva');
  await page.click('.nav-toggle');
  assert((await page.getAttribute('.nav-toggle', 'aria-expanded')) === 'true', 'aria-expanded nem true');
  assert(await page.isVisible('#fomenu'), 'a menü nem nyílt ki');
  await page.click('#fomenu >> text=Napelemes rendszerek');
  await page.waitForTimeout(900);
  assert(!(await page.isVisible('#fomenu')), 'a menü nem zárult be');
  const top = await page.evaluate(() => document.getElementById('napelem').getBoundingClientRect().top);
  assert(top >= 50 && top <= 90, `a szakasz teteje: ${top}px (fejléc alatt kellene lennie)`);
  await page.click('.nav-toggle');
  await page.keyboard.press('Escape');
  assert(!(await page.isVisible('#fomenu')), 'Esc nem zárta be');
  const focused = await page.evaluate(() => document.activeElement.classList.contains('nav-toggle'));
  assert(focused, 'Esc után nem a menügombon a fókusz');
  await context.close();
});

await test('a szakaszcímet nem takarja el a ragadós fejléc (asztali)', async () => {
  const { page, context } = await open({ width: 1440, height: 900 });
  for (const id of ['napelem', 'mukodes', 'menete', 'kapcsolat']) {
    await page.click(`.site-nav__list a[href="#${id}"]`);
    await page.waitForTimeout(1000);
    const r = await page.evaluate((i) => {
      const s = document.getElementById(i).getBoundingClientRect();
      const h = document.querySelector('.site-header').getBoundingClientRect();
      return { top: s.top, header: h.bottom };
    }, id);
    assert(r.top >= r.header - 1, `#${id} a fejléc alá csúszik (${r.top} < ${r.header})`);
  }
  await context.close();
});

await test('nyitószekció: „Ajánlatot kérek” az űrlaphoz, „Hogyan működik?” a működéshez visz', async () => {
  const { page, context } = await open({ width: 390, height: 844 });
  await page.click('.chooser >> text=Hogyan működik?');
  await page.waitForTimeout(900);
  assert(page.url().endsWith('#mukodes'), page.url());
  await page.goto(BASE);
  await page.click('.chooser >> text=Ajánlatot kérek');
  await page.waitForTimeout(900);
  const s = await page.evaluate(() => ({ active: document.activeElement.id, top: document.getElementById('kapcsolat').getBoundingClientRect().top }));
  assert(s.active === 'nev' && s.top < 200 && s.top > -10, JSON.stringify(s));
  await context.close();
});

console.log('\nAjánlatkérés');
await test('CTA-gombok az űrlaphoz görgetnek és az első mezőre teszik a fókuszt', async () => {
  for (const label of ['Napelemes rendszerre kérek ajánlatot', 'Rendszertervet kérek']) {
    const { page, context } = await open({ width: 390, height: 844 });
    await page.click(`text=${label}`);
    await page.waitForTimeout(900);
    const s = await page.evaluate(() => ({
      active: document.activeElement.id,
      top: document.getElementById('kapcsolat').getBoundingClientRect().top,
      hash: location.hash,
    }));
    assert(s.active === 'nev', `fókusz (${label}): ${s.active}`);
    assert(s.top < 200 && s.top > -10, `az űrlap szakasz nincs a nézetben (${s.top})`);
    assert(s.hash === '#kapcsolat', `hash: ${s.hash}`);
    await context.close();
  }
});

await test('egyszolgáltatásos űrlap: nincs szolgáltatásválasztó, a szolgáltatás rejtett mezőben „napelem”', async () => {
  const { page, context } = await open({ width: 1280, height: 800 });
  const s = await page.evaluate(() => ({
    radios: document.querySelectorAll('input[type="radio"][name="szolgaltatas"]').length,
    hidden: document.querySelector('input[type="hidden"][name="szolgaltatas"]')?.value,
    text: document.body.innerText,
  }));
  assert(s.radios === 0 && s.hidden === 'napelem', JSON.stringify({ radios: s.radios, hidden: s.hidden }));
  assert(!/érintésvédel|felülvizsgálat/i.test(s.text), 'érintésvédelmi tartalom maradt az oldalon');
  await context.close();
});

async function fill(page, { adatkezeles = true, ...overrides } = {}) {
  const data = { nev: 'Teszt Elek', telefon: '+36 30 123 4567', email: 'teszt@pelda.hu', telepules: 'Kecskemét', fogyasztas: '3 500 kWh', uzenet: 'Délre néző cseréptető, klíma jön.', ...overrides };
  for (const [k, v] of Object.entries(data)) await page.fill(`#${k}`, v);
  if (adatkezeles) await page.check('#adatkezeles');
}

await test('üres beküldés: hibalista fókuszban, mezők jelölve, nincs kérés', async () => {
  const { page, context } = await open({ width: 390, height: 844 });
  let requests = 0;
  page.on('request', (r) => r.method() === 'POST' && requests++);
  await page.click('.form__submit');
  const s = await page.evaluate(() => ({
    summaryVisible: !document.getElementById('urlap-hibak').hidden,
    focus: document.activeElement.id,
    items: document.querySelectorAll('#urlap-hibak li').length,
    invalid: [...document.querySelectorAll('[aria-invalid="true"]')].map((e) => e.id || e.name),
    done: location.pathname.endsWith('koszonjuk.html'),
  }));
  assert(s.summaryVisible && s.focus === 'urlap-hibak', 'a hibalista nem látszik / nincs fókuszban');
  assert(s.items === 5, `hibák száma: ${s.items} (4 kötelező mező + adatkezelési jelölőnégyzet)`);
  assert(['nev', 'telefon', 'email', 'telepules', 'adatkezeles'].every((id) => s.invalid.includes(id)), `aria-invalid: ${s.invalid}`);
  assert(!s.done && requests === 0, 'sikeres állapot vagy kérés hibás űrlapnál');
  // A hibalista linkje a mezőre visz
  await page.click('#urlap-hibak a[href="#telefon"]');
  assert((await page.evaluate(() => document.activeElement.id)) === 'telefon', 'a hibalink nem fókuszál');
  await context.close();
});

await test('hibás telefonszám és e-mail egyértelmű üzenetet kap; javítás után eltűnik', async () => {
  const { page, context } = await open({ width: 1280, height: 800 });
  await fill(page, { telefon: '123', email: 'nem-email' });
  await page.click('.form__submit');
  const t = await page.textContent('#telefon-hiba');
  const e = await page.textContent('#email-hiba');
  assert(/Ellenőrizd a telefonszámot/.test(t), `telefon üzenet: ${t}`);
  assert(/Ellenőrizd az e-mail-címet/.test(e), `email üzenet: ${e}`);
  await page.fill('#telefon', '06 1 234 5678');
  await page.fill('#email', 'kiss.anna@pelda.co.hu');
  const after = await page.evaluate(() => [document.getElementById('telefon-hiba').textContent, document.getElementById('email-hiba').textContent]);
  assert(after.every((x) => x === ''), `megmaradt hibák: ${after}`);
  await context.close();
});

await test('bekötetlen űrlap (nincs EmailJS-azonosító): hibaállapot, SOHA nem mutat sikert', async () => {
  const { page, context } = await open({ width: 1280, height: 800 });
  await fill(page);
  await page.click('.form__submit');
  const s = await page.evaluate(() => ({
    status: document.querySelector('.form__status').textContent,
    done: location.pathname.endsWith('koszonjuk.html'),
    kept: document.getElementById('nev').value,
  }));
  assert(/nincs bekötve/.test(s.status), `státusz: ${s.status}`);
  assert(!s.done, 'sikeres állapot jelent meg továbbítás nélkül');
  assert(s.kept === 'Teszt Elek', 'elvesztek a beírt adatok');
  await context.close();
});

const EMAILJS = 'https://api.emailjs.com/api/v1.0/email/send';
const EMAILJS_IDS = { emailjsPublicKey: 'pub_teszt', emailjsService: 'service_teszt', emailjsTemplate: 'template_teszt' };

// Alapból EmailJS-módban köti be az űrlapot (ez az éles beállítás);
// mode: 'action' esetén egy teljes https:// action URL-re küld (pl. Formspree).
async function withEndpoint(handler, run, { mode = 'emailjs' } = {}) {
  const { page, context } = await open({ width: 390, height: 844 });
  const endpoint = mode === 'emailjs' ? EMAILJS : 'https://urlap.example.test/f/teszt';
  await page.evaluate(
    ({ mode, endpoint, ids }) => {
      const form = document.getElementById('ajanlat-urlap');
      if (mode === 'emailjs') Object.assign(form.dataset, ids);
      else form.setAttribute('action', endpoint);
    },
    { mode, endpoint, ids: EMAILJS_IDS },
  );
  const posts = [];
  await page.route(endpoint, async (route) => {
    const req = route.request();
    posts.push({ body: req.postData() || '', type: req.headers()['content-type'] || '' });
    await handler(route);
  });
  await run(page, posts);
  await context.close();
}

await test('EmailJS: sikeres küldés (HTTP 200) → köszönőoldal; a kérés JSON-törzse helyes', async () => {
  await withEndpoint(
    (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: 'OK' }),
    async (page, posts) => {
      await page.click('text=Napelemes rendszerre kérek ajánlatot');
      await fill(page);
      await page.click('.form__submit');
      await page.waitForURL(/koszonjuk\.html\?szolgaltatas=napelem$/);
      const h1 = await page.textContent('h1');
      assert(/Köszönjük/.test(h1), `köszönőoldal címe: ${h1}`);
      assert(posts.length === 1, `kérések: ${posts.length}`);
      assert(posts[0].type.includes('application/json'), `típus: ${posts[0].type}`);
      const b = JSON.parse(posts[0].body);
      assert(b.service_id === 'service_teszt' && b.template_id === 'template_teszt' && b.user_id === 'pub_teszt', `azonosítók: ${posts[0].body}`);
      assert(!('accessToken' in b), 'privát kulcs a kérésben');
      const t = b.template_params;
      const expected = { adatkezeles: 'tudomásul vette', nev: 'Teszt Elek', telefon: '+36 30 123 4567', email: 'teszt@pelda.hu', telepules: 'Kecskemét', fogyasztas: '3 500 kWh', uzenet: 'Délre néző cseréptető, klíma jön.', szolgaltatas: 'napelem', reply_to: 'teszt@pelda.hu' };
      for (const [k, v] of Object.entries(expected)) assert(t[k] === v, `${k}: ${t[k]}`);
      assert(/Új napelemes ajánlatkérés/.test(t.targy), `tárgy: ${t.targy}`);
      assert(/^http:\/\/localhost:\d+\/$/.test(t.oldal), `oldal: ${t.oldal}`);
      assert(!Object.keys(t).some((k) => k.startsWith('_')), `belső mező a sablonban: ${Object.keys(t)}`);
    },
  );
});

await test('adatkezelési jelölőnégyzet nélkül nem küld; bejelölés után eltűnik a hiba és elküldhető', async () => {
  await withEndpoint(
    (route) => route.fulfill({ status: 200, body: 'OK' }),
    async (page, posts) => {
      await fill(page, { adatkezeles: false });
      // Puszta átlépéskor még nem jelez hibát
      await page.focus('#adatkezeles');
      await page.keyboard.press('Tab');
      assert((await page.textContent('#adatkezeles-hiba')) === '', 'átlépéskor már hibát jelzett');
      await page.click('.form__submit');
      const s = await page.evaluate(() => ({
        error: document.getElementById('adatkezeles-hiba').textContent,
        invalid: document.getElementById('adatkezeles').getAttribute('aria-invalid'),
        summary: document.getElementById('urlap-hibak').innerText,
        required: document.getElementById('adatkezeles').required,
        label: document.querySelector('label[for="adatkezeles"]').innerText,
        newTab: document.querySelector('label[for="adatkezeles"] a').target,
      }));
      assert(/adatkezelési tájékoztatót/.test(s.error) && s.invalid === 'true' && /Adatkezelési tájékoztató/.test(s.summary), JSON.stringify(s));
      assert(posts.length === 0 && !page.url().includes('koszonjuk'), `kérések: ${posts.length}`);
      assert(s.required && /tudomásul vettem/.test(s.label) && !/hozzájárulok/i.test(s.label), `felirat: ${s.label}`);
      assert(s.newTab === '_blank', 'a tájékoztató linkje nem új lapon nyílik (elveszne a kitöltött űrlap)');
      // A hibalista linkje a jelölőnégyzetre visz
      await page.click('#urlap-hibak a[href="#adatkezeles"]');
      assert((await page.evaluate(() => document.activeElement.id)) === 'adatkezeles', 'a hibalink nem fókuszál');
      await page.check('#adatkezeles');
      assert((await page.textContent('#adatkezeles-hiba')) === '', 'bejelölés után megmaradt a hiba');
      await page.click('.form__submit');
      await page.waitForURL(/koszonjuk\.html/);
      assert(posts.length === 1, `kérések: ${posts.length}`);
    },
  );
});

await test('EmailJS: elutasított kérés (HTTP 400, pl. rossz sablon) → hibaállapot, nincs átirányítás', async () => {
  await withEndpoint(
    (route) => route.fulfill({ status: 400, contentType: 'text/plain', body: 'The template ID is invalid' }),
    async (page, posts) => {
      await fill(page);
      await page.click('.form__submit');
      await page.waitForSelector('.form__status.is-error');
      assert(posts.length === 1 && !page.url().includes('koszonjuk'), `kérések: ${posts.length}, url: ${page.url()}`);
    },
  );
});

await test('spamcsapda kitöltve: nincs kérés, nincs siker', async () => {
  await withEndpoint(
    (route) => route.fulfill({ status: 200, body: 'OK' }),
    async (page, posts) => {
      await fill(page);
      await page.evaluate(() => { document.getElementById('weboldal').value = 'http://spam.example'; });
      await page.click('.form__submit');
      await page.waitForSelector('.form__status.is-error');
      assert(posts.length === 0 && !page.url().includes('koszonjuk'), `kérések: ${posts.length}`);
    },
  );
});

await test('részleges EmailJS-beállítás (hiányzó sablon) nem kapcsol be, nincs hamis siker', async () => {
  const { page, context } = await open({ width: 1280, height: 800 });
  let posted = 0;
  await page.route(EMAILJS, (route) => { posted++; return route.fulfill({ status: 200, body: 'OK' }); });
  await page.evaluate(() => Object.assign(document.getElementById('ajanlat-urlap').dataset, { emailjsPublicKey: 'pub', emailjsService: 'svc' }));
  await fill(page);
  await page.click('.form__submit');
  const status = await page.textContent('.form__status');
  assert(/nincs bekötve/.test(status) && posted === 0 && !page.url().includes('koszonjuk'), `állapot: ${status}, kérések: ${posted}`);
  await context.close();
});

await test('tartalék végpont (https:// action): FormData-küldés, 200 → köszönőoldal', async () => {
  await withEndpoint(
    (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
    async (page, posts) => {
      await fill(page);
      await page.click('.form__submit');
      await page.waitForURL(/koszonjuk\.html\?szolgaltatas=napelem$/);
      assert(posts.length === 1 && posts[0].type.includes('multipart/form-data'), `típus: ${posts[0]?.type}`);
      for (const needle of ['name="szolgaltatas"', 'napelem', 'Teszt Elek', 'name="fogyasztas"', '3 500 kWh']) {
        assert(posts[0].body.includes(needle), `hiányzik a kérésből: ${needle}`);
      }
    },
    { mode: 'action' },
  );
});

await test('szerverhiba (HTTP 500): hibaállapot, űrlap és adatok megmaradnak, újraküldhető', async () => {
  let n = 0;
  await withEndpoint(
    (route) => (n++ === 0 ? route.fulfill({ status: 500, body: 'hiba' }) : route.fulfill({ status: 200, body: 'OK' })),
    async (page, posts) => {
      await fill(page);
      await page.click('.form__submit');
      await page.waitForSelector('.form__status.is-error');
      const s = await page.evaluate(() => ({
        done: location.pathname.endsWith('koszonjuk.html'),
        formVisible: !document.getElementById('ajanlat-urlap').hidden,
        btn: document.querySelector('.form__submit').disabled,
        kept: document.getElementById('nev').value,
      }));
      assert(!s.done && s.formVisible && !s.btn && s.kept === 'Teszt Elek', JSON.stringify(s));
      await page.click('.form__submit');
      await page.waitForURL(/koszonjuk\.html/);
      assert(posts.length === 2, `kérések: ${posts.length}`);
    },
  );
});

await test('hálózati hiba: hibaállapot, nincs sikerjelzés', async () => {
  await withEndpoint(
    (route) => route.abort('internetdisconnected'),
    async (page) => {
      await fill(page);
      await page.click('.form__submit');
      await page.waitForSelector('.form__status.is-error');
      assert(!page.url().includes('koszonjuk'), 'átirányított hálózati hibánál');
    },
  );
});

await test('küldés közben a gomb letiltva, dupla kattintás egy kérést küld', async () => {
  await withEndpoint(
    async (route) => {
      await new Promise((r) => setTimeout(r, 700));
      await route.fulfill({ status: 200, body: 'OK' });
    },
    async (page, posts) => {
      await fill(page);
      await page.click('.form__submit');
      const disabled = await page.evaluate(() => document.querySelector('.form__submit').disabled);
      await page.click('.form__submit', { force: true }).catch(() => {});
      await page.waitForURL(/koszonjuk\.html/);
      assert(disabled, 'a gomb nem tiltott küldés közben');
      assert(posts.length === 1, `kérések: ${posts.length}`);
    },
  );
});

await test('éles index.html: nincs privát kulcs a forrásban', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert(!/accessToken|private[_-]?key/i.test(html.replace(/<!--[\s\S]*?-->/g, '')), 'privát kulcsra utaló szöveg az oldalban');
});

console.log('\nKöszönőoldal');
for (const [service, visible] of [['napelem', ['napelem']], ['', ['napelem']]]) {
  await test(`köszönőoldal: szolgáltatáshoz illő tanács (${service || 'paraméter nélkül'})`, async () => {
    const { page, context, errors } = await open({ width: 390, height: 844 }, { url: `${BASE}koszonjuk.html${service ? `?szolgaltatas=${service}` : ''}` });
    const shown = await page.evaluate(() => [...document.querySelectorAll('[data-tip]')].filter((t) => !t.hidden).map((t) => t.dataset.tip).sort());
    assert(JSON.stringify(shown) === JSON.stringify(visible.sort()), `látható tanácsok: ${shown}`);
    assert(errors.length === 0, errors.join(' | '));
    await context.close();
  });
}

await test('köszönőoldal: noindex, nincs WCAG-hiba, nincs vízszintes görgetés, vissza link működik', async () => {
  for (const width of [320, 1440]) {
    const { page, context } = await open({ width, height: 900 }, { url: `${BASE}koszonjuk.html?szolgaltatas=napelem`, reducedMotion: 'reduce' });
    const r = await page.evaluate(() => ({
      robots: document.querySelector('meta[name="robots"]')?.content,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    assert(r.robots === 'noindex' && !r.overflow, JSON.stringify(r));
    await axe(page, `köszönőoldal ${width}px`);
    if (width === 1440) {
      await page.screenshot({ path: `${OUT}koszonjuk-1440.png`, fullPage: true });
      await page.click('header .btn');
      await page.waitForURL((u) => u.pathname === '/');
    } else {
      await page.screenshot({ path: `${OUT}koszonjuk-320.png`, fullPage: true });
    }
    await context.close();
  }
});

await test('lábléc: a cégnév nagy, látható díszfelirata a teljes szélességben, kilógás nélkül', async () => {
  for (const width of [320, 768, 1440, 1920]) {
    const { page, context } = await open({ width, height: 900 }, { reducedMotion: 'reduce' });
    const s = await page.evaluate(() => {
      const el = document.querySelector('.site-footer__wordmark');
      const r = el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      const t = range.getBoundingClientRect();
      return { text: el.textContent, hidden: el.getAttribute('aria-hidden'), left: t.left, right: t.right, fill: t.width / innerWidth, height: r.height, vw: innerWidth };
    });
    assert(s.text === 'VILLKIV' && s.hidden === 'true', JSON.stringify(s));
    assert(s.left >= 0 && s.right <= s.vw && s.fill > 0.75, `@${width}px: ${JSON.stringify(s)}`);
    await context.close();
  }
});

console.log('\nJogi oldalak');
const LEGAL = ['adatvedelem.html', 'cookie.html', 'impresszum.html'];
await test('a lábléc linkjei a jogi oldalakra visznek, az űrlap az adatkezelésre hivatkozik', async () => {
  const { page, context } = await open({ width: 1280, height: 800 });
  const links = await page.evaluate(() => ({
    footer: [...document.querySelectorAll('.site-footer__bottom a')].map((a) => a.getAttribute('href')),
    form: document.querySelector('label[for="adatkezeles"] a')?.getAttribute('href'),
  }));
  for (const f of LEGAL) assert(links.footer.includes(f), `hiányzó lábléclink: ${f} (${links.footer})`);
  assert(links.form === 'adatvedelem.html', `űrlap hivatkozás: ${links.form}`);
  await context.close();
});

for (const file of LEGAL) {
  await test(`${file}: noindex, egy h1, cégadatok, nincs WCAG-hiba és vízszintes görgetés, hibátlan linkek`, async () => {
    for (const width of [320, 1440]) {
      const { page, context, errors } = await open({ width, height: 900 }, { url: BASE + file, reducedMotion: 'reduce' });
      const r = await page.evaluate(() => ({
        robots: document.querySelector('meta[name="robots"]')?.content,
        h1: document.querySelectorAll('h1').length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        text: document.querySelector('main').innerText,
        footer: document.querySelector('.site-footer')?.innerText || '',
        local: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => !/^(https?:|mailto:|tel:)/.test(h)),
      }));
      assert(r.robots === 'noindex' && r.h1 === 1 && !r.overflow, JSON.stringify({ ...r, text: undefined, footer: undefined, local: undefined }));
      assert(/VILLKIV Mérnökiroda Kft\./.test(r.footer) && /32746031-2-04/.test(r.footer), 'hiányos lábléc');
      if (file !== 'cookie.html') {
        for (const needle of ['32746031-2-04', '04 09 017656', '5630 Békés']) assert(r.text.includes(needle), `hiányzik: ${needle}`);
      }
      // Belső linkek: létező oldal, és ha horgony, létező szakasz a főoldalon
      for (const href of new Set(r.local)) {
        const u = new URL(href, BASE + file);
        const res = await page.request.get(u.origin + u.pathname);
        assert(res.ok(), `törött link: ${href}`);
        if (u.hash && u.pathname === '/') {
          const html = await res.text();
          assert(html.includes(`id="${u.hash.slice(1)}"`), `nincs ilyen szakasz: ${href}`);
        }
      }
      await axe(page, `${file} ${width}px`);
      await page.screenshot({ path: `${OUT}${file.replace('.html', '')}-${width}.png`, fullPage: true });
      assert(errors.length === 0, errors.join(' | '));
      await context.close();
    }
  });
}

await test('az aloldalak lábléce megegyezik a főoldaléval (csak a linkek alakja tér el)', async () => {
  const norm = (h) => h.replace(/href="\.\/#?/g, 'href="#').replace(/href="#"/g, 'href="#top"').replace(/alt="[^"]*"/g, '').replace(/\s+/g, ' ');
  const read = async (f) => (await readFile(new URL(`../${f}`, import.meta.url), 'utf8')).match(/<footer[\s\S]*?<\/footer>/)[0];
  const main = norm(await read('index.html'));
  for (const f of [...LEGAL, 'koszonjuk.html']) assert(norm(await read(f)) === main, `${f}: eltérő lábléc – futtasd: npm run pages`);
});

console.log('\nSütisáv és Meta Pixel');
const PIXEL = '123456789012345';
// A Pixel ID-t a kiszolgált HTML-be írjuk; a Meta szkriptjét üres csonkkal helyettesítjük és számoljuk.
async function openWithPixel(viewport, { url = BASE, id = PIXEL, init } = {}) {
  const context = await browser.newContext({ viewport, locale: 'hu-HU' });
  const fb = [];
  await context.route(/facebook\.(net|com)/, (route) => {
    fb.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
  });
  await context.route((u) => u.href.startsWith(BASE) && (u.pathname.endsWith('/') || u.pathname.endsWith('.html')), async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace('data-meta-pixel=""', `data-meta-pixel="${id}"`);
    return route.fulfill({ response: res, body });
  });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  return { page, context, fb };
}
const fbQueue = (page) => page.evaluate(() => (window.fbq ? window.fbq.queue.map((a) => Array.from(a)) : null));

await test('Pixel ID nélkül: nincs sütisáv, nincs Süti-beállítások gomb, nincs Meta-kérés', async () => {
  for (const url of [BASE, `${BASE}koszonjuk.html`, `${BASE}cookie.html`]) {
    const { page, context } = await open({ width: 1280, height: 800 }, { url });
    const s = await page.evaluate(() => ({
      banner: document.querySelectorAll('.consent').length,
      btn: document.querySelector('[data-consent-only]')?.hidden,
      fbq: typeof window.fbq,
      fb: performance.getEntriesByType('resource').filter((r) => /facebook/.test(r.name)).length,
    }));
    assert(s.banner === 0 && s.btn === true && s.fbq === 'undefined' && s.fb === 0, `${url}: ${JSON.stringify(s)}`);
    await context.close();
  }
});

await test('Pixel ID-vel: sütisáv jelenik meg, választás előtt nincs Meta-kérés; az aloldalak is átveszik az ID-t', async () => {
  const html = await readFile(new URL('../koszonjuk.html', import.meta.url), 'utf8');
  assert(/<html[^>]*data-meta-pixel=""/.test(html), 'az aloldal nem kapta meg a data-meta-pixel attribútumot (npm run pages)');
  for (const width of [320, 1440]) {
    const { page, context, fb } = await openWithPixel({ width, height: 800 });
    const s = await page.evaluate(() => ({
      visible: !!document.querySelector('.consent:not([hidden])')?.offsetHeight,
      buttons: [...document.querySelectorAll('.consent [data-consent]')].map((b) => [b.textContent, getComputedStyle(b).backgroundColor, b.offsetHeight]),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      link: document.querySelector('.consent a')?.getAttribute('href'),
    }));
    assert(s.visible && !s.overflow && s.link === 'cookie.html', JSON.stringify(s));
    assert(fb.length === 0 && (await page.evaluate(() => typeof window.fbq)) === 'undefined', `Meta-kérés hozzájárulás előtt: ${fb}`);
    // Az elutasítás ugyanolyan feltűnő, mint az elfogadás
    const [deny, grant] = s.buttons;
    assert(deny[0] === 'Elutasítom' && grant[0] === 'Elfogadom' && deny[1] === grant[1] && deny[2] === grant[2], JSON.stringify(s.buttons));
    await axe(page, `sütisáv ${width}px`);
    await page.screenshot({ path: `${OUT}sutisav-${width}.png` });
    await context.close();
  }
});

await test('Elutasítom: nincs Pixel, a döntés megmarad; a láblécből újra megnyitható', async () => {
  const { page, context, fb } = await openWithPixel({ width: 1280, height: 800 });
  await page.click('[data-consent="deny"]');
  assert(await page.locator('.consent').isHidden(), 'a sáv nem tűnt el');
  await page.reload({ waitUntil: 'networkidle' });
  const s = await page.evaluate(() => ({ banner: !!document.querySelector('.consent:not([hidden])'), fbq: typeof window.fbq }));
  assert(!s.banner && s.fbq === 'undefined' && fb.length === 0, JSON.stringify({ ...s, fb }));
  await page.click('[data-consent-open]');
  assert(await page.locator('.consent').isVisible(), 'a Süti-beállítások gomb nem nyitja meg a sávot');
  assert((await page.evaluate(() => document.activeElement.dataset.consent)) === 'deny', 'a fókusz nem került a sávba');
  await page.click('[data-consent="deny"]');
  assert((await page.evaluate(() => document.activeElement.hasAttribute('data-consent-open'))), 'a fókusz nem tért vissza a gombra');
  await context.close();
});

await test('Elfogadom: Pixel betölt (init + PageView, automatikus események ki), és a következő oldalon is', async () => {
  const { page, context, fb } = await openWithPixel({ width: 1280, height: 800 });
  await page.click('[data-consent="grant"]');
  await page.waitForFunction(() => window.fbq);
  const q = await fbQueue(page);
  assert(fb.some((u) => u.includes('connect.facebook.net/en_US/fbevents.js')), `szkript: ${fb}`);
  assert(JSON.stringify(q) === JSON.stringify([['set', 'autoConfig', false, PIXEL], ['init', PIXEL], ['track', 'PageView']]), JSON.stringify(q));
  const next = await context.newPage();
  await next.goto(`${BASE}cookie.html`, { waitUntil: 'networkidle' });
  const s = await next.evaluate(() => ({ banner: !!document.querySelector('.consent:not([hidden])'), fbq: typeof window.fbq }));
  assert(!s.banner && s.fbq === 'function', JSON.stringify(s));
  await context.close();
});

await test('visszavonás: a Meta-sütik törlődnek, újratöltés után nincs Pixel', async () => {
  const { page, context, fb } = await openWithPixel({ width: 1280, height: 800 });
  await page.click('[data-consent="grant"]');
  await page.waitForFunction(() => window.fbq);
  await page.evaluate(() => { document.cookie = '_fbp=fb.1.123.456; path=/'; document.cookie = '_fbc=fb.1.123.abc; path=/'; });
  const before = fb.length;
  await page.click('[data-consent-open]');
  await Promise.all([page.waitForEvent('load'), page.click('[data-consent="deny"]')]);
  await page.waitForLoadState('networkidle');
  const s = await page.evaluate(() => ({ cookies: document.cookie, fbq: typeof window.fbq, banner: !!document.querySelector('.consent:not([hidden])') }));
  assert(!/_fbp|_fbc/.test(s.cookies) && s.fbq === 'undefined' && !s.banner && fb.length === before, JSON.stringify({ ...s, fb: fb.length - before }));
  await context.close();
});

await test('lejárt (180 napnál régebbi) döntésnél újra megkérdez', async () => {
  const { page, context } = await openWithPixel({ width: 1280, height: 800 });
  await page.evaluate(() => localStorage.setItem('villkiv-suti', JSON.stringify({ v: 1, marketing: true, t: Date.now() - 181 * 864e5 })));
  await page.reload({ waitUntil: 'networkidle' });
  const s = await page.evaluate(() => ({ banner: !!document.querySelector('.consent:not([hidden])'), fbq: typeof window.fbq }));
  assert(s.banner && s.fbq === 'undefined', JSON.stringify(s));
  await context.close();
});

await test('Lead-esemény: csak valódi beküldés után, egyszer; közvetlen megnyitásnál és frissítésnél nem', async () => {
  const { page, context } = await openWithPixel({ width: 390, height: 844 });
  await page.click('[data-consent="grant"]');
  await page.route(EMAILJS, (route) => route.fulfill({ status: 200, body: 'OK' }));
  await page.evaluate((ids) => Object.assign(document.getElementById('ajanlat-urlap').dataset, ids), EMAILJS_IDS);
  await fill(page);
  await page.click('.form__submit');
  await page.waitForURL(/koszonjuk\.html/);
  await page.waitForFunction(() => window.fbq);
  const q1 = await fbQueue(page);
  assert(q1.filter((a) => a[1] === 'Lead').length === 1, `beküldés után: ${JSON.stringify(q1)}`);
  await page.reload({ waitUntil: 'networkidle' });
  const q2 = await fbQueue(page);
  assert(q2 && !q2.some((a) => a[1] === 'Lead'), `frissítés után: ${JSON.stringify(q2)}`);
  const direct = await context.newPage();
  await direct.goto(`${BASE}koszonjuk.html?szolgaltatas=napelem`, { waitUntil: 'networkidle' });
  const q3 = await fbQueue(direct);
  assert(q3 && !q3.some((a) => a[1] === 'Lead'), `közvetlen megnyitás: ${JSON.stringify(q3)}`);
  await context.close();
});

await test('ha a köszönőoldalon fogad el először, a Lead akkor is beérkezik', async () => {
  const { page, context } = await openWithPixel({ width: 390, height: 844 }, {
    url: `${BASE}koszonjuk.html?szolgaltatas=napelem`,
    // Az első betöltéskor úgy, mintha épp most küldte volna be az űrlapot
    init: () => { if (!sessionStorage.getItem('teszt-kesz')) { sessionStorage.setItem('villkiv-lead', '1'); sessionStorage.setItem('teszt-kesz', '1'); } },
  });
  assert((await page.evaluate(() => typeof window.fbq)) === 'undefined', 'Pixel hozzájárulás előtt');
  await page.click('[data-consent="grant"]');
  const q = await fbQueue(page);
  assert(q && q.filter((a) => a[1] === 'Lead').length === 1, JSON.stringify(q));
  await context.close();
});

console.log('\nGörgetéskövetés');
await test('a gyakori kérdések szekció nincs az oldalon', async () => {
  const { page, context } = await open({ width: 1280, height: 800 });
  const n = await page.evaluate(() => document.querySelectorAll('#gyik, .faq, a[href="#gyik"]').length);
  assert(n === 0, `maradt GYIK-elem: ${n}`);
  await context.close();
});

await test('fejléccsík: tetején 0, közepén részleges, alján teljes', async () => {
  const { page, context } = await open({ width: 1280, height: 800 });
  const at = async (frac) => {
    await page.evaluate((f) => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * f, behavior: 'instant' }), frac);
    await page.waitForTimeout(120);
    return page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.scroll-progress__bar')).transform).a);
  };
  const [a, b, c] = [await at(0), await at(0.5), await at(1)];
  assert(a < 0.01 && b > 0.4 && b < 0.6 && c > 0.99, `arányok: ${a}, ${b}, ${c}`);
  const visible = await page.evaluate(() => {
    const r = document.querySelector('.scroll-progress__bar').getBoundingClientRect();
    return r.height >= 2 && r.top >= 0;
  });
  assert(visible, 'a csík nem látszik');
  await context.close();
});

await test('aktív menüpont követi a görgetést; egerezéskor is megjelenik a csík', async () => {
  const { page, context } = await open({ width: 1440, height: 900 });
  const active = () => page.evaluate(() => [...document.querySelectorAll('.site-nav__list a[aria-current="true"]')].map((a) => a.getAttribute('href')));
  assert((await active()).length === 0, `a nyitószekciónál nem lehet aktív menüpont: ${await active()}`);
  for (const id of ['napelem', 'mukodes', 'menete', 'kapcsolat']) {
    await page.evaluate((i) => document.getElementById(i).scrollIntoView({ behavior: 'instant' }), id);
    await page.waitForTimeout(150);
    const a = await active();
    assert(a.length === 1 && a[0] === `#${id}`, `#${id} helyett aktív: ${a}`);
  }
  await page.waitForTimeout(400);
  const underline = async (sel) => page.evaluate((s) => new DOMMatrix(getComputedStyle(document.querySelector(s), '::after').transform).a, sel);
  assert((await underline('.site-nav__list a[href="#kapcsolat"]')) > 0.99, 'az aktív menüpont alatt nincs csík');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.hover('.site-nav__list a[href="#napelem"]');
  await page.waitForTimeout(400);
  assert((await underline('.site-nav__list a[href="#napelem"]')) > 0.99, 'egerezéskor nincs csík');
  await context.close();
});

for (const [width, height] of [[1440, 900], [390, 844]]) {
  await test(`idővonalak: görgetéssel töltődnek, a lépések sorban kapcsolnak fel @${width}px`, async () => {
    const { page, context } = await open({ width, height });
    const state = () => page.evaluate(() => [...document.querySelectorAll('[data-timeline]')].map((w) => ({
      ready: w.querySelector('.timeline__track').classList.contains('is-ready'),
      p: parseFloat(w.querySelector('.timeline__track').style.getPropertyValue('--p') || '0'),
      on: [...w.querySelectorAll('.timeline__item')].map((i) => i.classList.contains('is-on')),
    })));
    let s = await state();
    assert(s.length === 2 && s.every((t) => t.ready), `a vezeték nem készült el (${s.length})`);
    assert(s.every((t) => t.p === 0 && t.on.every((x) => !x)), `betöltéskor már töltve: ${JSON.stringify(s)}`);
    // Végiggörgetés kis lépésekben: a kitöltés sosem csökken, a felkapcsolt lépések mindig elöl vannak
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const prev = s.map(() => 0);
    let sawPartial = false;
    for (let y = 0; y <= max; y += 120) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(30);
      s = await state();
      s.forEach((t, i) => {
        assert(t.p + 1e-6 >= prev[i], `visszafelé töltődött (${i}. idővonal)`);
        prev[i] = t.p;
        const firstOff = t.on.indexOf(false);
        assert(firstOff === -1 || t.on.slice(firstOff).every((x) => !x), `nem sorban kapcsolt: ${t.on}`);
        if (t.p > 0.1 && t.p < 0.9) sawPartial = true;
      });
    }
    assert(sawPartial, 'nem volt köztes (részlegesen töltött) állapot');
    s = await state();
    assert(s.every((t) => t.p === 1 && t.on.every(Boolean)), `a végén nincs teljesen töltve: ${JSON.stringify(s)}`);
    // A vezeték a számok középpontján fut
    const aligned = await page.evaluate(() => [...document.querySelectorAll('[data-timeline]')].every((w) => {
      const tr = w.querySelector('.timeline__track').getBoundingClientRect();
      const nums = [...w.querySelectorAll('.timeline__num')].map((n) => n.getBoundingClientRect());
      const vertical = tr.height > tr.width;
      return nums.every((n) => vertical
        ? Math.abs(n.left + n.width / 2 - (tr.left + tr.width / 2)) < 2
        : Math.abs(n.top + n.height / 2 - (tr.top + tr.height / 2)) < 2);
    }));
    assert(aligned, 'a vezeték nem a lépésszámok közepén fut');
    await context.close();
  });
}

await test('csökkentett mozgásnál az idővonalak statikusan, teljesen kitöltve jelennek meg', async () => {
  const { page, context } = await open({ width: 1280, height: 800 }, { reducedMotion: 'reduce' });
  const s = await page.evaluate(() => [...document.querySelectorAll('[data-timeline]')].map((w) => ({
    p: w.querySelector('.timeline__track').style.getPropertyValue('--p'),
    on: [...w.querySelectorAll('.timeline__item')].every((i) => i.classList.contains('is-on')),
  })));
  assert(s.every((t) => t.p === '1.0000' && t.on), JSON.stringify(s));
  await context.close();
});

console.log('\nTeljesítmény és mozgás');
for (const width of [390, 1440]) {
  await test(`elrendezésugrás (CLS) lassú képekkel és betűkkel < 0,02 @${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.route(/\.(webp|avif|woff2)$/, async (route) => {
      await new Promise((r) => setTimeout(r, 600));
      await route.continue();
    });
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const cls = await page.evaluate(() => window.__cls);
    assert(cls < 0.02, `CLS = ${cls.toFixed(4)}`);
    await context.close();
  });
}

await test('csökkentett mozgás: nincs rejtett/animált tartalom, nincs sima görgetés', async () => {
  const { page, context } = await open({ width: 1280, height: 800 }, { reducedMotion: 'reduce' });
  // Végiggörgetünk és az egeret is mozgatjuk: semmi nem indulhat el
  await page.mouse.move(400, 300);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 20));
    }
  });
  await page.mouse.move(420, 320);
  const s = await page.evaluate(() => ({
    ready: document.documentElement.classList.contains('reveal-ready'),
    hidden: [...document.querySelectorAll('[data-reveal], [data-stagger] > *')].filter((e) => getComputedStyle(e).opacity !== '1').length,
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
    // Mozgásnak számít minden CSS-animáció és a helyzetet/méretet/átlátszóságot változtató átmenet
    animations: document
      .getAnimations()
      .filter((a) => !(a instanceof CSSTransition) || /transform|translate|scale|rotate|opacity|clip/.test(a.transitionProperty))
      .map((a) => a.animationName || a.transitionProperty),
    spotlight: document.querySelectorAll('.spotlight').length,
  }));
  assert(!s.ready && s.hidden === 0 && s.scroll === 'auto' && s.animations.length === 0 && s.spotlight === 0, JSON.stringify(s));
  await context.close();
});

await test('JavaScript nélkül minden tartalom és a menü látható', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const s = await page.evaluate(() => ({
    nav: getComputedStyle(document.getElementById('fomenu')).display,
    hidden: [...document.querySelectorAll('[data-reveal]')].filter((e) => getComputedStyle(e).opacity !== '1').length,
    submit: getComputedStyle(document.querySelector('.form__submit')).display,
    notice: document.querySelector('.form__noscript')?.offsetHeight || 0,
  }));
  assert(s.nav !== 'none' && s.hidden === 0, JSON.stringify(s));
  // JS nélkül nem tud küldeni: a gomb rejtve, helyette elérhetőség
  assert(s.submit === 'none' && s.notice > 0, `küldés gomb: ${s.submit}, értesítés: ${s.notice}px`);
  await page.screenshot({ path: `${OUT}js-nelkul-390.png` });
  await context.close();
});

await test('görgetés közben megjelenő elemek a végére mind láthatók', async () => {
  const { page, context } = await open({ width: 1440, height: 900 });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 300) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 30));
    }
  });
  await page.waitForTimeout(1300);
  const s = await page.evaluate(() => ({
    hidden: [...document.querySelectorAll('[data-reveal]')].filter((e) => !e.classList.contains('is-visible')).length,
    staggered: [...document.querySelectorAll('[data-stagger] > *')].filter((e) => getComputedStyle(e).opacity !== '1').map((e) => e.textContent.trim().slice(0, 30)),
  }));
  assert(s.hidden === 0 && s.staggered.length === 0, JSON.stringify(s));
  await context.close();
});

console.log('\nMozgás');
await test('nyitóképernyő: a főcím azonnal látszik, a többi elem rövid belépővel érkezik (< 1,8 mp)', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  const s = await page.evaluate(() => {
    const h1 = document.querySelector('.hero__title');
    const anims = document.getAnimations().filter((a) => a.timeline === document.timeline);
    return {
      h1: getComputedStyle(h1).opacity,
      h1Animated: h1.getAnimations().length,
      names: [...new Set(anims.map((a) => a.animationName))],
      longest: Math.max(...anims.map((a) => a.effect.getComputedTiming().endTime)),
      infinite: document.getAnimations().filter((a) => a.effect.getComputedTiming().iterations === Infinity).length,
    };
  });
  assert(s.h1 === '1' && s.h1Animated === 0, `főcím: ${JSON.stringify(s)}`);
  assert(s.names.includes('rise') && s.names.includes('settle'), `belépők: ${s.names}`);
  assert(s.longest <= 1800 && s.infinite === 0, `leghosszabb: ${s.longest} ms, végtelen: ${s.infinite}`);
  await context.close();
});

await test('görgetéshez kötött mozgás: fotók parallaxisa, panelek és díszek – csak a görgetést követik', async () => {
  const { page, context } = await open({ width: 1440, height: 900 });
  const s = await page.evaluate(() => {
    const by = (sel) => document.querySelector(sel).getAnimations().map((a) => [a.animationName, a.timeline?.constructor.name]);
    return { pv: by('.media--pv img'), work: by('.media--work img'), panel: by('.contact'), deco: by('.deco--pv-arcs') };
  });
  assert(JSON.stringify(s.pv) === '[["parallax","ViewTimeline"]]' && JSON.stringify(s.work) === '[["parallax","ViewTimeline"]]', JSON.stringify(s));
  assert(JSON.stringify(s.panel) === '[["panel-in","ViewTimeline"]]' && JSON.stringify(s.deco) === '[["orbit","ViewTimeline"]]', JSON.stringify(s));
  // A parallaxis görgetéssel változik
  const shift = async (y) => {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
    await page.waitForTimeout(120);
    return page.evaluate(() => getComputedStyle(document.querySelector('.media--pv img')).translate);
  };
  const top = await page.evaluate(() => document.querySelector('.media--pv').getBoundingClientRect().top + scrollY);
  const a = await shift(top - 800);
  const b = await shift(top);
  assert(a !== b, `parallaxis nem mozdult: ${a} → ${b}`);
  // Kinyílt állapotban a panel nincs megvágva
  await page.evaluate(() => document.getElementById('kapcsolat').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(150);
  const clip = await page.evaluate(() => getComputedStyle(document.getElementById('kapcsolat')).clipPath);
  assert(/^inset\(0(px|%)?( 0(px|%)?)* round/.test(clip) || clip === 'none', `panel vágása: ${clip}`);
  await context.close();
});

await test('kártyák rámutatáskor megemelkednek; a fény követi az egeret a sötét felületen', async () => {
  const { page, context } = await open({ width: 1440, height: 900 });
  await page.locator('.promise').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await page.hover('.promise >> nth=0');
  await page.waitForTimeout(400);
  const lift = await page.evaluate(() => getComputedStyle(document.querySelector('.promise')).translate);
  assert(lift === '0px -4px', `emelkedés: ${lift}`);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.mouse.move(300, 300);
  await page.mouse.move(340, 330);
  await page.waitForTimeout(600);
  const g = await page.evaluate(() => {
    const el = document.querySelector('.hero > .spotlight');
    const cs = getComputedStyle(el);
    return { aria: el.getAttribute('aria-hidden'), opacity: Number(cs.opacity), mx: cs.getPropertyValue('--mx'), pe: cs.pointerEvents };
  });
  assert(g.aria === 'true' && g.opacity > 0.9 && g.mx === '340px' && g.pe === 'none', JSON.stringify(g));
  await context.close();
});

await test('érintőképernyőn nincs egérkövető fény', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  assert((await page.evaluate(() => document.querySelectorAll('.spotlight').length)) === 0, 'érintőképernyőn is létrejött');
  await context.close();
});

await browser.close();
server.close();
console.log(`\n${passed} sikeres, ${failed} sikertelen\n`);
process.exitCode = failed ? 1 : 0;
