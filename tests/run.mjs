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
  return { page, context, errors };
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
  for (const id of ['erintesvedelem', 'napelem', 'menete', 'kapcsolat']) {
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

await test('nyitószekció választói a megfelelő szakaszra visznek', async () => {
  const { page, context } = await open({ width: 390, height: 844 });
  await page.click('.chooser >> text=Napelemet szeretnék');
  await page.waitForTimeout(900);
  assert(page.url().endsWith('#napelem'), page.url());
  await page.click('.chooser >> text=Érintésvédelem érdekel').catch(async () => {
    await page.goto(BASE);
    await page.click('.chooser >> text=Érintésvédelem érdekel');
  });
  await page.waitForTimeout(900);
  assert(page.url().endsWith('#erintesvedelem'), page.url());
  await context.close();
});

console.log('\nAjánlatkérés');
await test('CTA-gomb az űrlaphoz görget és kiválasztja a szolgáltatást; módosítható', async () => {
  const { page, context } = await open({ width: 390, height: 844 });
  await page.click('text=Napelemes rendszerre kérek ajánlatot');
  await page.waitForTimeout(900);
  const s = await page.evaluate(() => ({
    checked: document.querySelector('input[name="szolgaltatas"]:checked')?.value,
    active: document.activeElement.value,
    top: document.getElementById('kapcsolat').getBoundingClientRect().top,
  }));
  assert(s.checked === 'napelem', `kijelölve: ${s.checked}`);
  assert(s.active === 'napelem', 'a fókusz nem a kijelölt lehetőségen');
  assert(s.top < 200 && s.top > -10, `az űrlap szakasz nincs a nézetben (${s.top})`);
  await page.click('text=Felülvizsgálatra kérek ajánlatot');
  await page.waitForTimeout(900);
  assert((await page.evaluate(() => document.querySelector('input[name="szolgaltatas"]:checked').value)) === 'erintesvedelem', 'második CTA nem váltott');
  await page.click('label.choice >> text=Mindkettő érdekel');
  assert((await page.evaluate(() => document.querySelector('input[name="szolgaltatas"]:checked').value)) === 'mindketto', 'nem módosítható');
  await context.close();
});

await test('?szolgaltatas=mindketto URL-paraméter előválaszt', async () => {
  const { page, context } = await open({ width: 1280, height: 800 }, { url: `${BASE}?szolgaltatas=mindketto#kapcsolat` });
  const v = await page.evaluate(() => document.querySelector('input[name="szolgaltatas"]:checked')?.value);
  assert(v === 'mindketto', `kijelölve: ${v}`);
  await context.close();
});

async function fill(page, overrides = {}) {
  const data = { nev: 'Teszt Elek', telefon: '+36 30 123 4567', email: 'teszt@pelda.hu', telepules: 'Kecskemét', uzenet: 'Régi ház, 1970-es villanyhálózat.', ...overrides };
  if (!(await page.evaluate(() => document.querySelector('input[name="szolgaltatas"]:checked')))) {
    await page.check('input[value="erintesvedelem"]');
  }
  for (const [k, v] of Object.entries(data)) await page.fill(`#${k}`, v);
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
    done: !document.getElementById('urlap-kesz').hidden,
  }));
  assert(s.summaryVisible && s.focus === 'urlap-hibak', 'a hibalista nem látszik / nincs fókuszban');
  assert(s.items === 5, `hibák száma: ${s.items} (5 kötelező mező)`);
  assert(['nev', 'telefon', 'email', 'telepules'].every((id) => s.invalid.includes(id)), `aria-invalid: ${s.invalid}`);
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

await test('bekötetlen űrlap (üres action): hibaállapot, SOHA nem mutat sikert', async () => {
  const { page, context } = await open({ width: 1280, height: 800 });
  await fill(page);
  await page.click('.form__submit');
  const s = await page.evaluate(() => ({
    status: document.querySelector('.form__status').textContent,
    done: !document.getElementById('urlap-kesz').hidden,
    kept: document.getElementById('nev').value,
  }));
  assert(/nincs bekötve/.test(s.status), `státusz: ${s.status}`);
  assert(!s.done, 'sikeres állapot jelent meg továbbítás nélkül');
  assert(s.kept === 'Teszt Elek', 'elvesztek a beírt adatok');
  await context.close();
});

async function withEndpoint(handler, run) {
  const { page, context } = await open({ width: 390, height: 844 });
  const endpoint = 'https://urlap.example.test/f/teszt';
  await page.evaluate((u) => document.getElementById('ajanlat-urlap').setAttribute('action', u), endpoint);
  const posts = [];
  await page.route(endpoint, async (route) => {
    posts.push(route.request().postData() || '');
    await handler(route);
  });
  await run(page, posts);
  await context.close();
}

await test('sikeres továbbítás (HTTP 200): köszönő állapot, fókusz, adatok a kérésben', async () => {
  await withEndpoint(
    (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
    async (page, posts) => {
      await page.click('text=Napelemes rendszerre kérek ajánlatot');
      await fill(page);
      await page.click('.form__submit');
      await page.waitForSelector('#urlap-kesz:not([hidden])');
      const focus = await page.evaluate(() => document.activeElement.id);
      assert(focus === 'urlap-kesz', `fókusz: ${focus}`);
      assert(posts.length === 1, `kérések: ${posts.length}`);
      for (const needle of ['name="szolgaltatas"', 'napelem', 'Teszt Elek', '+36 30 123 4567', 'teszt@pelda.hu', 'Kecskemét']) {
        assert(posts[0].includes(needle), `hiányzik a kérésből: ${needle}`);
      }
    },
  );
});

await test('szerverhiba (HTTP 500): hibaállapot, űrlap és adatok megmaradnak, újraküldhető', async () => {
  let n = 0;
  await withEndpoint(
    (route) => (n++ === 0 ? route.fulfill({ status: 500, body: 'hiba' }) : route.fulfill({ status: 200, body: '{}' })),
    async (page, posts) => {
      await fill(page);
      await page.click('.form__submit');
      await page.waitForSelector('.form__status.is-error');
      const s = await page.evaluate(() => ({
        done: !document.getElementById('urlap-kesz').hidden,
        formVisible: !document.getElementById('ajanlat-urlap').hidden,
        btn: document.querySelector('.form__submit').disabled,
      }));
      assert(!s.done && s.formVisible && !s.btn, JSON.stringify(s));
      await page.click('.form__submit');
      await page.waitForSelector('#urlap-kesz:not([hidden])');
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
      assert(await page.isHidden('#urlap-kesz'), 'sikerjelzés hálózati hibánál');
    },
  );
});

await test('küldés közben a gomb letiltva, dupla kattintás egy kérést küld', async () => {
  await withEndpoint(
    async (route) => {
      await new Promise((r) => setTimeout(r, 700));
      await route.fulfill({ status: 200, body: '{}' });
    },
    async (page, posts) => {
      await fill(page);
      await page.click('.form__submit');
      const disabled = await page.evaluate(() => document.querySelector('.form__submit').disabled);
      await page.click('.form__submit', { force: true }).catch(() => {});
      await page.waitForSelector('#urlap-kesz:not([hidden])');
      assert(disabled, 'a gomb nem tiltott küldés közben');
      assert(posts.length === 1, `kérések: ${posts.length}`);
    },
  );
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
  const s = await page.evaluate(() => ({
    ready: document.documentElement.classList.contains('reveal-ready'),
    hidden: [...document.querySelectorAll('[data-reveal]')].filter((e) => getComputedStyle(e).opacity !== '1').length,
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
  }));
  assert(!s.ready && s.hidden === 0 && s.scroll === 'auto', JSON.stringify(s));
  await context.close();
});

await test('JavaScript nélkül minden tartalom és a menü látható', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const s = await page.evaluate(() => ({
    nav: getComputedStyle(document.getElementById('fomenu')).display,
    hidden: [...document.querySelectorAll('[data-reveal]')].filter((e) => getComputedStyle(e).opacity !== '1').length,
  }));
  assert(s.nav !== 'none' && s.hidden === 0, JSON.stringify(s));
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
  await page.waitForTimeout(700);
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal]')].filter((e) => !e.classList.contains('is-visible')).length);
  assert(hidden === 0, `${hidden} elem rejtve maradt`);
  await context.close();
});

await browser.close();
server.close();
console.log(`\n${passed} sikeres, ${failed} sikertelen\n`);
process.exitCode = failed ? 1 : 0;
