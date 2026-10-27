# VILLKIV – lakossági napelemes landing oldal

Egyoldalas, magyar nyelvű landing oldal a VILLKIV Mérnökiroda **lakossági napelemes rendszereihez**. Az érintésvédelmi szolgáltatás külön landinget kap (a közös, kétszolgáltatásos változat a `bee9b8b` commitban érhető el; a külön oldal promptja: `docs/erintesvedelem-landing-prompt.md`). Statikus HTML + CSS + JS, nincs keretrendszer és nincs futásidejű függőség. A mappa bármilyen tárhelyre feltölthető (`index.html` + `assets/`).

## Élesítés előtt – kötelező teendők

```bash
npm install
npm run check:placeholders   # kilistáz minden kitöltetlen helyőrzőt (főoldal + aloldalak), hiba esetén exit 1
```

1. **Űrlap bekötése (EmailJS).** Lásd lent. Amíg nincs bekötve, az űrlap hibaüzenetet ad, sikert soha nem mutat.
2. **Jogi oldalak ellenőrizendő pontjai** (`pages/adatvedelem.html`, `pages/impresszum.html`): megőrzési idő, az e-mail-szolgáltató neve, a tárhelyszolgáltató adatai. Élesítés előtt jogász nézze át.
3. **Meta Pixel ID.** Lásd lent. Ha mégsem lesz Pixel, a `data-meta-pixel` attribútumot töröld, és a süti- és adatkezelési oldalról vedd ki a Pixelről szóló részt (különben valótlant állítanak).
4. **Árak.** A 2,5–4 M Ft bruttó (áfával) értendő-e – `ELLENŐRIZENDŐ` megjegyzés az `index.html`-ben.

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

## Ajánlatkérő űrlap

- **Két példány:** a hero alatt (`#ajanlat`) és a lábléc felett (`#kapcsolat`). Mindkettő a `partials/urlap.html` egyetlen forrásából készül: a kérdéseket, válaszokat ott szerkeszd, majd `npm run pages`. Az `index.html`-ben a két jelölő (`<!-- urlap:felso -->`, `<!-- urlap:also -->`) közötti részt ne kézzel írd át.
- **7 lépés,** minden kérdés kötelező, a végén kötelező adatkezelési jelölőnégyzet. Egyszerre egy kérdés látszik; egérrel/érintéssel választott válasz után magától továbblép, billentyűzettel a „Tovább” gomb visz (a nyilak nem léptetnek – akadálymentesség).
- **A két példány együtt mozog:** amit az egyikben megadsz, a másik is tudja, és ugyanannál a kérdésnél tart.
- Az „Ajánlatot kérek” gombok (`data-lead-cta`) a látogatóhoz legközelebbi űrlaphoz visznek, az aktuális kérdésre.
- JavaScript nélkül az összes kérdés egymás alatt látszik, a küldés gomb helyett telefonszám és e-mail-cím jelenik meg.

## Meta Pixel és sütisáv

1. A Pixel ID-t (*Meta Events Manager → Adatforrások*, 15–16 számjegy) írd az `index.html` elején a `<html data-meta-pixel="">` attribútumba, majd: `npm run pages` (az aloldalak innen veszik át).
2. **Events Manager → a Pixel beállításai: kapcsold KI az „Automatic advanced matching” (automatikus speciális egyeztetés) opciót.** Bekapcsolva a Meta-kód az űrlapmezőkből (e-mail, telefon) is gyűjthet, ami ellentmond az adatkezelési tájékoztatónak.
3. Ellenőrzés: *Events Manager → Test events*. Elfogadás előtt nem jöhet esemény; elfogadás után `PageView`, sikeres ajánlatkérés után a köszönőoldalon egy `Lead`.

Működés:
- **Üres ID-nél nincs sütisáv és nincs Pixel** – az oldal sütimentes.
- Kitöltött ID-nél minden oldalon sütisáv jelenik meg. **A Pixel csak az „Elfogadom” után töltődik be**; az „Elutasítom” ugyanolyan gomb, ugyanakkora – ez jogi követelmény, ne változtasd kiemeltebbre az elfogadást.
- A döntést 180 napig jegyezzük meg (`localStorage`), utána újra kérdezünk. A lábléc *Süti-beállítások* gombjával bármikor módosítható; visszavonáskor a `_fbp`/`_fbc` sütik törlődnek, és az oldal újratölt.
- `Lead` csak valódi beküldés után, egyszer fut le: a köszönőoldal közvetlen megnyitása vagy frissítése nem számít konverziónak.
- A kódban az automatikus eseményfelismerés ki van kapcsolva (`autoConfig: false`), csak `PageView` és `Lead` megy.
- Más mérőkódot (Google Analytics, Tag Manager stb.) csak a sütisávon keresztül, a `cookie.html` és az `adatvedelem.html` frissítésével együtt szabad feltenni.

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
     Miben segíthetünk: {{segitseg}}
     Cél: {{cel}}
     Ingatlan: {{ingatlan}}
     Havi villanyszámla: {{szamla}}
     Mikorra: {{idozites}}
     Település / irányítószám: {{telepules}}

     Név: {{nev}}
     Telefon: {{telefon}}
     E-mail: {{email}}
     Adatkezelési tájékoztató: {{adatkezeles}}

     Melyik űrlapról: {{urlap}} (felső = hero alatti, alsó = lábléc feletti)
     Beküldve innen: {{oldal}}
     ```
   → **Template ID**
4. **Account → General:** **Public Key**.
5. A három értéket írd az `index.html` elején a `<html>` elembe (mindkét űrlap ezeket használja):
   ```html
   <html lang="hu" … data-emailjs-public-key="..." data-emailjs-service="service_..." data-emailjs-template="template_...">
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

## Közzététel Vercelen

A repó Vercelhez kötve automatikusan települ. A beállításokat a `vercel.json` tartalmazza: `npm ci`, majd `npm run build`, a kimenet a **`dist`** mappa. Ha ez hiányzik, a Vercel a `public` mappát keresi, és a telepítés „No Output Directory” hibával elszáll.

- A *Project Settings → Build and Deployment* felületen ne írd felül a build- és kimeneti beállításokat (vagy ugyanezt add meg).
- *Settings → Git → Production Branch*: az az ág legyen, amelyikről élesíteni akarsz.
- Vercel esetén az impresszumba a Vercel Inc. adatai kerülnek tárhelyszolgáltatóként.

## Közzététel Netlify Drop-pal

```bash
npm run build      # aloldalak generálása + dist/ mappa: csak a weboldalhoz szükséges fájlok
```

A `dist` mappát (vagy a belőle készült zip-et) húzd be ide: https://app.netlify.com/drop. A tárhelyszolgáltató adatait írd be az impresszumba.

## Mozgás

Minden effekt a CSS végén, a *Mozgás* szakaszban van, és csak akkor fut, ha a látogató nem kért csökkentett mozgást (akkor semmi nem mozog, és minden tartalom azonnal látszik).

- **Belépés:** a nyitóképernyő elemei lépcsőzetesen érkeznek (< 1,8 mp). A főcím azonnal látszik, hogy a betöltési mutató (LCP) ne romoljon.
- **Görgetéshez kötött:** a fotók parallaxisa, a sötét panelek oldalra „kinyílása”, a díszítő ívek és pontrácsok mozgása. Ezek a görgetést követik, maguktól nem mozognak; ahol a böngésző nem támogatja (pl. Firefox), statikusak.
- **Rámutatás:** a kártyák megemelkednek, a gombokon fényvillanás fut végig, a munkafotók nagyítanak. Egérrel a sötét felületeken a mutatót arany fény követi (érintőképernyőn nincs).
- **Végtelenített, magától futó animáció nincs** – ez akadálymentességi követelmény (WCAG 2.2.2), ne tegyél fel ilyet (pl. futószalagos szöveget) megállítógomb nélkül.
- A fotókeretek `overflow: clip`-et használnak, nem `hidden`-t: a `hidden` görgetési konténerré tenné őket, és a parallaxis megállna.

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
- az adatkezelési jelölőnégyzet nélkül nem küld;
- a sütisáv: Pixel ID nélkül nincs; ID-vel elfogadás előtt nincs Meta-kérés, az elutasítás egyenrangú, a döntés megmarad, lejár, visszavonható, és a `Lead` csak valódi beküldés után fut;
- a jogi oldalak hibátlanok (noindex, WCAG, linkek), és a láblécük megegyezik a főoldaléval;
- a mozgás: a főcím nem animált, a belépő rövid, nincs végtelen animáció; a parallaxis a görgetést követi; csökkentett mozgásnál és érintőképernyőn a megfelelő effektek nem futnak;
- az elrendezésugrás (CLS) lassú képekkel és betűkkel is < 0,02;
- működik a csökkentett mozgás beállítás és a JavaScript nélküli megjelenítés.

A Chromium útvonala a `CHROMIUM_PATH` környezeti változóval adható meg.

**Betűtípus:** Archivo (SIL Open Font License 1.1, `assets/fonts/OFL.txt`). Saját tárhelyről töltődik, magyar karakterekre szűkítve, egyetlen 65 KB-os fájlban.
