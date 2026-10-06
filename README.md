# Lakossági villamosipari landing oldal

Egyoldalas, magyar nyelvű landing oldal két szolgáltatásra: **érintésvédelmi / villamos biztonsági felülvizsgálat** és **napelemes rendszerek**. Statikus HTML + CSS + JS, nincs keretrendszer és nincs futásidejű függőség. A mappa bármilyen tárhelyre feltölthető (`index.html` + `assets/`).

## Élesítés előtt – kötelező teendők

```bash
npm install
npm run check:placeholders   # kilistáz minden kitöltetlen helyőrzőt, hiba esetén exit 1
```

1. **Cégadatok és elérhetőségek.** A `[szögletes zárójeles]`, sárga, szaggatott keretes szövegek helyőrzők: cégnév, terület, telefon, e-mail, adószám, székhely, nyilvántartási szám, adatkezelési tájékoztató, impresszum. A `tel:` és `mailto:` linkek `href` értékét is töltsd ki.
2. **Szolgáltatási kör.** Ezeket csak megerősített információ alapján írd át:
   - a napelemes „Amit vállalunk” lista (felmérés, tervezés, kivitelezés, ügyintézés): töröld, amit nem vállaltok;
   - a felülvizsgálat után átadott dokumentáció;
   - a hibajavítás és az ellenőrző mérés vállalása;
   - a helyszíni felmérés feltételei. **Ingyenes felmérést csak akkor írj, ha valóban az.**
3. **Logó és színek.** A sárga villám jel csak ideiglenes. Ha van arculati kézikönyv, írd át a `assets/css/styles.css` elején a `--navy` és `--yellow` tokent.
4. **Fotók.** Lásd lent. A helyőrző képeken jól láthatóan „HELYŐRZŐ” felirat van.
5. **Űrlap bekötése.** Lásd lent. Amíg nincs bekötve, az űrlap hibaüzenetet ad, sikert soha nem mutat.

## Fotók cseréje

Tedd a saját fotót az `assets/src/` mappába **ugyanazzal a névvel**, majd futtasd:

```bash
npm run images
```

| Fájl | Mi legyen rajta | Képarány (automatikus vágás) |
|---|---|---|
| `hero-haz.jpg` | Családi ház napelemekkel (valódi munka) | 6:5 |
| `hero-meres.jpg` | Részletfotó: mérés az elosztónál | 4:3 |
| `ev-eloszto.jpg` | Elosztószekrény, felülvizsgálat közben | 4:5 |
| `napelem-otthon.jpg` | Napelemes rendszer lakóházon, környezettel | 5:4 |

A szkript AVIF és WebP formátumot készít több méretben, középre vágva. A fotó elsőbbséget kap az azonos nevű SVG helyőrzővel szemben. Ha a fotó kész, az SVG törölhető. A képek `alt` szövegét az `index.html`-ben igazítsd a valódi tartalomhoz. Ne használj mosolygó, kamerába néző stock szerelőket.

## Az űrlap bekötése

Az `index.html`-ben a `<form id="ajanlat-urlap" action="">` `action` attribútumába írd a feldolgozó végpont teljes URL-jét. Ez lehet például Formspree, Getform vagy saját szerveroldali végpont.

- A beküldés `POST`, `multipart/form-data`, `Accept: application/json` fejléccel.
- Mezők: `szolgaltatas` (`erintesvedelem` | `napelem` | `mindketto`), `nev`, `telefon`, `email`, `telepules`, `uzenet`, továbbá `_subject` és `_gotcha` (spamcsapda; a szerveroldalon kell eldobni, ha ki van töltve).
- **Sikeres állapot csak 2xx válasz után jelenik meg.** Nem 2xx válasz, hálózati hiba vagy 15 mp-es időtúllépés esetén hibaüzenet jelenik meg, és a beírt adatok megmaradnak.
- A szolgáltatások CTA-gombjai előválasztják a szolgáltatást. Hirdetésből is előválaszthatsz, például: `/?szolgaltatas=napelem#kapcsolat`.

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
- a CTA előválasztja a szolgáltatást;
- az űrlap minden állapota helyes (üres, hibás, bekötetlen, 200, 500, hálózati hiba, dupla kattintás);
- az elrendezésugrás (CLS) lassú képekkel és betűkkel is < 0,02;
- működik a csökkentett mozgás beállítás és a JavaScript nélküli megjelenítés.

A Chromium útvonala a `CHROMIUM_PATH` környezeti változóval adható meg.

**Betűtípus:** Archivo (SIL Open Font License 1.1, `assets/fonts/OFL.txt`). Saját tárhelyről töltődik, magyar karakterekre szűkítve, egyetlen 65 KB-os fájlban.
