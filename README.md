# VILLKIV – lakossági napelemes landing oldal

Egyoldalas, magyar nyelvű landing oldal a VILLKIV Mérnökiroda **lakossági napelemes rendszereihez**. Az érintésvédelmi szolgáltatás külön landinget kap (a közös, kétszolgáltatásos változat a `bee9b8b` commitban érhető el; a külön oldal promptja: `docs/erintesvedelem-landing-prompt.md`). Statikus HTML + CSS + JS, nincs keretrendszer és nincs futásidejű függőség. A mappa bármilyen tárhelyre feltölthető (`index.html` + `assets/`).

## Élesítés előtt – kötelező teendők

```bash
npm install
npm run check:placeholders   # kilistáz minden kitöltetlen helyőrzőt (főoldal + aloldalak), hiba esetén exit 1
```

1. **Űrlap bekötése (EmailJS).** Lásd lent. Amíg nincs bekötve, az űrlap hibaüzenetet ad, sikert soha nem mutat.
2. **Jogi oldalak ellenőrizendő pontjai** (`pages/adatvedelem.html`, `pages/impresszum.html`): megőrzési idő, az e-mail-szolgáltató neve, a tárhelyszolgáltató adatai. Élesítés előtt jogász nézze át.
3. **Árak.** A 2,5–4 M Ft bruttó (áfával) értendő-e – `ELLENŐRIZENDŐ` megjegyzés az `index.html`-ben.

## Oldalak

| Fájl | Forrás | Megjegyzés |
|---|---|---|
| `index.html` | maga | a landing oldal |
| `koszonjuk.html` | `pages/koszonjuk.html` | sikeres ajánlatkérés után, `noindex` |
| `adatvedelem.html` | `pages/adatvedelem.html` | adatkezelési tájékoztató, `noindex` |
| `cookie.html` | `pages/cookie.html` | süti tájékoztató, `noindex` |
| `impresszum.html` | `pages/impresszum.html` | impresszum, `noindex` |

Az aloldalakat **ne a gyökérben szerkeszd**: a tartalom a `pages/` mappában van, a fejléc, az ikonkészlet és a lábléc az `index.html`-ből jön. Szerkesztés után (és ha a főoldal láblécét módosítod):

```bash
npm run pages    # újragenerálja a gyökérben lévő aloldalakat
```

A teszt jelez, ha egy aloldal lábléce eltér a főoldalétól.

**Sütik:** az oldal nem használ sütit, analitikát és külső betűtípust, ezért sütisáv nem kell. Ha később analitika vagy beágyazott térkép/videó kerül fel, a sütisáv és a `cookie.html` frissítése kötelező.

## Fotók cseréje

Tedd a saját fotót az `assets/src/` mappába **ugyanazzal a névvel**, majd futtasd:

```bash
npm run images            # minden kép
npm run images hero-haz   # csak egy
```

| Fájl | Hol jelenik meg | Képarány (automatikus vágás) |
|---|---|---|
| `hero-haz.jpg` | nyitókép | 4:5 |
| `hero-meres.jpg` | nyitókép részletfotója | 4:3 |
| `napelem-otthon.jpg` | „Napelemes rendszerek” szakasz | 4:3 |
| `inverter.jpg` | „Így működik” szakasz | 3:2 |
| `munka-1.jpg`, `munka-2.jpg` | „Munkáinkból” sáv | 4:3 |

A szkript AVIF és WebP formátumot készít több méretben, középre vágva. A képek `alt` szövegét az `index.html`-ben igazítsd a valódi tartalomhoz.

## Az űrlap bekötése (EmailJS)

Az űrlap az [EmailJS](https://www.emailjs.com/) szolgáltatáson keresztül küld e-mailt a `mernok@villkiv.hu` címre. Szerver nem kell.

1. **EmailJS-fiók** (a cég saját fiókja, ne a fejlesztőé).
2. **Email Services → Add New Service:** kösd be a `mernok@villkiv.hu` postafiókot. → **Service ID**
3. **Email Templates → Create New Template:**
   - *To Email:* `mernok@villkiv.hu`
   - *Reply To:* `{{reply_to}}` – így a válasz egyenesen az érdeklődőhöz megy
   - *Subject:* `{{targy}} – {{nev}}, {{telepules}}`
   - *Content* például:
     ```
     Név: {{nev}}
     Telefon: {{telefon}}
     E-mail: {{email}}
     Település: {{telepules}}
     Éves fogyasztás / havi számla: {{fogyasztas}}
     Üzenet: {{uzenet}}
     Szolgáltatás: {{szolgaltatas}}
     Beküldve innen: {{oldal}}
     ```
   → **Template ID**
4. **Account → General:** **Public Key**.
5. A három értéket írd az `index.html` `<form id="ajanlat-urlap">` elemébe:
   ```html
   data-emailjs-public-key="..." data-emailjs-service="service_..." data-emailjs-template="template_..."
   ```
6. **Biztonság (kötelező):**
   - **A Private Key-t SOHA ne írd az oldalba.** A Public Key, a Service ID és a Template ID nyilvános, ezek látszhatnak.
   - *Account → Security:* korlátozd a küldést a saját domainre (*Allowed origins*: pl. `https://villkiv.hu`, és a Netlify-cím, ha azt is használod).
   - Ha elérhető a csomagban, kapcsold be a *rate limit*-et (pl. 1 küldés / 10 mp).
   - A *Use Private Key* kapcsoló maradjon **kikapcsolva**: bekapcsolva minden böngészőből jövő küldés hibát ad (a privát kulcs a böngészőbe nem kerülhet).
   - A sablon *CAPTCHA* beállítását ne kapcsold be: az űrlap nem küld reCAPTCHA-választ, így minden beküldés hibára futna.
   - A spamcsapdát (`_gotcha`) a böngésző kezeli: ha ki van töltve, nem küld.
7. **Próba élesben:** küldj egy próbakérést, nézd meg, hogy megjött-e, és hogy a „Válasz” gomb az érdeklődő címére megy-e.

Működés:
- **A köszönőoldalra csak az EmailJS 2xx válasza után irányít** (`koszonjuk.html?szolgaltatas=napelem`). Nem 2xx válasz (rossz azonosító, lejárt keret), hálózati hiba vagy 15 mp-es időtúllépés esetén hibaüzenet jelenik meg, és a beírt adatok megmaradnak.
- Ha a három azonosító közül bármelyik hiányzik, az űrlap „nincs bekötve” hibát ad.
- JavaScript nélkül az EmailJS nem működik: ilyenkor a küldés gomb helyett a telefonszám és az e-mail-cím jelenik meg.
- Az ingyenes EmailJS-csomag havi kerete korlátozott. Ha elfogy, az űrlap hibát jelez (nem nyel el kérést), de érdemes figyelni.
- Tartalék: ha nincs EmailJS-azonosító, de az `action` attribútumban teljes `https://` URL van (pl. Formspree), arra küld `multipart/form-data` formában.

## Közzététel Netlify Drop-pal

```bash
npm run build      # aloldalak generálása + dist/ mappa: csak a weboldalhoz szükséges fájlok
```

A `dist` mappát (vagy a belőle készült zip-et) húzd be ide: https://app.netlify.com/drop. A tárhelyszolgáltató adatait írd be az impresszumba.

## Referenciák

A referencia- és jogosultságblokk **szándékosan nincs a publikus oldalon**, mert nincs még ellenőrizhető adat. A sablon az `index.html`-ben, a `<template id="referenciak-sablon">` elemben van. Csak valódi munkafotókkal, hozzájárulással közölt véleményekkel és tényleges jogosultsági adatokkal aktiváld.

## Fejlesztés és tesztek

```bash
npm run serve    # helyi előnézet: http://localhost:4173
npm test         # végponttól végpontig tartó tesztek, képernyőképek: tests/output/
npm run fonts    # betűkészlet újragenerálása (pip install fonttools brotli)
```

A tesztek (Playwright + axe-core) ezeket ellenőrzik:
- nincs vízszintes görgetés 320–1920 px között;
- mobilon a főcím és a választók megelőzik a képeket;
- nincs WCAG 2.2 AA hiba;
- működik a billentyűzetes navigáció és a mobilmenü;
- a CTA az űrlap első mezőjére viszi a fókuszt;
- az űrlap minden állapota helyes (üres, hibás, bekötetlen, EmailJS 200 és 400, 500, hálózati hiba, dupla kattintás, spamcsapda), és a kérés törzse a várt sablonváltozókat tartalmazza;
- a jogi oldalak hibátlanok (noindex, WCAG, linkek), és a láblécük megegyezik a főoldaléval;
- az elrendezésugrás (CLS) lassú képekkel és betűkkel is < 0,02;
- működik a csökkentett mozgás beállítás és a JavaScript nélküli megjelenítés.

A Chromium útvonala a `CHROMIUM_PATH` környezeti változóval adható meg.

**Betűtípus:** Archivo (SIL Open Font License 1.1, `assets/fonts/OFL.txt`). Saját tárhelyről töltődik, magyar karakterekre szűkítve, egyetlen 65 KB-os fájlban.
