# Prompt: VILLKIV érintésvédelmi landing oldal

Az alábbi szöveget egy új projektbe / munkamenetbe kell bemásolni.

---

Készíts egy magyar nyelvű, egyoldalas lakossági landing oldalt a **VILLKIV Mérnökiroda Kft.** **érintésvédelmi és villamos biztonsági felülvizsgálat** szolgáltatásához. A dizájn, a felépítés, a komponensek és a technikai megoldások legyenek **pontosan ugyanolyanok**, mint a cég napelemes landing oldalán. Csak a tartalom szóljon kizárólag az érintésvédelemről.

## Kiinduló kód (ha eléred, ebből dolgozz)
- Repó: `github.com/delvionkft/Villkiv`, ág: `claude/hungarian-electrical-landing-aa8ac1`.
- **Dizájn, felépítés, űrlap (EmailJS) és jogi oldalak:** az ág legfrissebb állapota (napelemes landing).
  - Vedd át változtatás nélkül: `assets/css/styles.css`, `assets/js/main.js`, `assets/fonts/`, logó, favicon, `scripts/` (köztük a `build-pages.mjs` aloldal-generátor), `tests/run.mjs`, `package.json`.
  - A `pages/` mappából: `koszonjuk.html` (a tanácsot cseréld), `adatvedelem.html`, `cookie.html`, `impresszum.html` (a cégadatok ugyanazok; az adatkezelésnél a kezelt adatokat az érintésvédelmi űrlap mezőihez igazítsd).
- **Érintésvédelmi szövegek, ikonok és űrlaplogika:** a `bee9b8b` commit (a korábbi, kétszolgáltatásos változat).
  - Itt van a mérési pontok mezőcsoport és az ellenőrzése.
  - Itt van a négylépéses felülvizsgálati idővonal.
  - Itt van a köszönőoldal érintésvédelmi tanácsa.
- Ha a repót nem éred el, a lenti leírás alapján építsd fel ugyanígy.

## Technika
- Statikus HTML + CSS + JS, keretrendszer és futásidejű függőség nélkül.
- Oldalak: `index.html`, valamint a `pages/` mappából generált `koszonjuk.html`, `adatvedelem.html`, `cookie.html`, `impresszum.html` (`npm run pages`; a fejléc és a lábléc az `index.html`-ből jön).
- `npm run build` → aloldalak generálása + `dist/` mappa Netlify Drophoz.
- `npm run images`: a képeket a sharp alakítja AVIF + WebP formátumra, több szélességben, fix képarányra vágva. Minden képnek van width/height attribútuma, hogy betöltéskor ne ugráljon az elrendezés.
- Betűtípus: Archivo változó betű (wght 400–800, wdth 75–112), saját tárhelyről, magyar karakterekre szűkítve (~65 KB). A tartalék betűk méretre hangoltak (size-adjust), így a CLS < 0,02.
- `npm run check:placeholders` kilistázza a kitöltetlen helyőrzőket.

## Dizájnrendszer (ne térj el tőle)
- **Színek:**
  - sötétkék `#0b1e3a`, `#132a4c`, `#1d3a63`, `#4a6289`;
  - arany kiemelés `#E2C45B` (hover `#d3b247`, halvány változat `#f8f1dc`);
  - oldalháttér `#f3f5f9`, fehér szakaszok `#ffffff`;
  - szövegszínek `#2b3a52` és `#5b6a81`, vonalak `#dde3eb` és `#b9c4d3`.
  - Arany felületen sötétkék szöveg.
- **Tipográfia:** hat szint. A címsorok Archivo 88% szélességgel, 650–680-as súllyal, negatív betűközzel. A főcím a hasábszélességhez igazodik (container query), mindig két sorban; a második sora arany.
- **Formák:** lekerekítés 8/12/16 px, árnyék nincs, üvegfelület nincs, erős színátmenet nincs.
- **Fejléc:** sötétkék, ragadós. Világos változatú VILLKIV logó, alján arany görgetéscsík. A menüpontok alatt arany aláhúzás jelenik meg egérrámutatáskor és az aktuális szakasznál. Mobilon „Menü” gomb nyitja a menüt.
- **Nyitószekció:** sötétkék, finom 56 px-es rácsháttérrel.
  - Bal oldalt: pill-címke, kétsoros főcím, rövid alcím, két választócsempe.
  - Jobb oldalt: álló, lekerekített fotó, rálógó kis részletfotóval és arany felirat-címkével.
  - Díszítés: napív-ívek és pontrács.
- **Arany sáv** a nyitószekció alatt, négy ikonos állítással.
- **Sötét szakaszok:** lekerekített, beljebb húzott panelek a világos oldalon, nincs éles fehér–sötétkék váltás.
- **Díszítőelemek:** napív (koncentrikus arany ívek), kapcsolási rajz (vonalas áramkör), pontrács, eltolt arany képkeret a fotók mögött. Mind halvány marad, és mobilon kisebb.
- **Mozgás:**
  - Dinamikus idővonal: a vezeték görgetésre töltődik, egy arany „szikra” halad előtte, az elért lépések felkapcsolnak.
  - Finom megjelenés görgetéskor.
  - `prefers-reduced-motion` esetén minden statikus.
- **Szöveg:** kevés, tegező, közérthető. Szakaszonként egy cím és egy egymondatos bevezető, a többi címke vagy kártya.

## Felépítés és tartalom
1. **Fejléc menü:** Érintésvédelem (`#erintesvedelem`), Így zajlik (`#folyamat`), A munka menete (`#menete`), Kapcsolat (`#kapcsolat`), valamint egy „Ajánlatot kérek” gomb.
2. **Nyitószekció**
   - Pill-címke: „VILLKIV Mérnökiroda · érintésvédelem”.
   - Főcím: „Biztonságos elektromos hálózat.” / arany második sor: „Mérve, dokumentálva.”
   - Alcím: „Érintésvédelmi és villamos biztonsági felülvizsgálat családi házakra és lakásokra – hivatalos mérésekkel, részletes jegyzőkönyvvel.”
   - Csempék: „Ajánlatot kérek – 48 órán belül jelentkezünk” (az űrlaphoz visz, a Név mezőre teszi a fókuszt); „Hogyan zajlik? – Négy lépés a jegyzőkönyvig” (`#folyamat`).
3. **Arany sáv:** Villamosmérnöki háttér · Hivatalos mérési jegyzőkönyv · Regisztrált felülvizsgálók · Hibajavítást is vállalunk.
4. **01 Érintésvédelem** (fehér)
   - Cím: „Tudd meg, milyen állapotban van otthonod elektromos hálózata.”
   - Bevezető: „Feltárjuk a veszélyes hibákat, hogy csökkenjen az áramütés és a villamos eredetű tűz kockázata.”
   - Címkék: Műszeres mérések · Részletes jegyzőkönyv · Javítási javaslatok · Fotódokumentáció, ha kell.
   - Gomb: „Felülvizsgálatra kérek ajánlatot”.
   - Mellette keretezett fotó: elosztószekrény mérés közben.
   - Számcsempék:
     - 20–60 ezer Ft – lakossági felülvizsgálat;
     - 30–120 perc – a vizsgálat időtartama;
     - 48 órán belül – kapcsolatfelvétel.
   - Lábjegyzet: „Az ár és az időtartam a mérési pontok számától és a helyszíntől függ.”
   - „Mikor érdemes?”, négy ikonos kártya:
     - Régebbi ingatlant vettél vagy örököltél;
     - Új építés vagy átalakítás után;
     - Eladás vagy bérbeadás előtt;
     - Időszakos ellenőrzésként.
   - Figyelmeztető doboz: „Szikrázás, égett szag, áramütés? Kapcsold le az áramkört, és ne használd.”
   - Megjegyzés: „A feltárt hibák javítását is vállaljuk. Ha hatóság észrevételt tesz, a jegyzőkönyvünk pontosításában díjmentesen segítünk.”
   - Ne állítsd, hogy a felülvizsgálat bármelyik helyzetben automatikusan kötelező.
5. **02 Így zajlik** (sötét panel, `#folyamat`)
   - Cím: „Négy lépés a jegyzőkönyvig.”
   - Egymondatos magyarázat: „Érintésvédelem: a védővezető, a fi-relé és a kismegszakítók hiba esetén időben lekapcsolnak, így nem ér áramütés.”
   - Fotó (pl. műszer a kézben).
   - Sötét, ikonos dinamikus idővonal:
     1. Felmérés – a hálózat, az elosztók és a berendezések átvizsgálása;
     2. Mérés – földelés, hurokellenállás, fi-relé működése;
     3. Kiértékelés – összevetés a követelményekkel, a hibás pontok megjelölése;
     4. Jegyzőkönyv – mérési eredmények és javítási javaslatok.
   - Ajánlatkérő doboz: „48 órán belül jelentkezünk, kötelezettség nélkül.” / „Add meg a mérési pontok számát – így pontosabb ajánlatot adunk.” + gomb.
6. **03 A munka menete** (világos, dinamikus idővonal):
   1. Megírod, mi érdekel – Település és mérési pontok;
   2. 48 órán belül keresünk – Egyeztetjük az időpontot;
   3. Helyszíni vizsgálat – Általában 30–120 perc;
   4. Jegyzőkönyv – Eredmények és javítási javaslatok.
7. **04 Rólunk** (ugyanaz, mint a napelemes oldalon)
   - Cím: „Mérnöki háttér minden munkához.”
   - Csapat: villamosmérnökök, regisztrált villanyszerelők, villamos biztonsági felülvizsgálók.
   - Négy vállalás: egyedi felmérés, dokumentált átadás, legalább 2 év garancia, biztosítás és jogosultság.
   - „Munkáinkból” fotósor, csak valódi érintésvédelmi munkafotókkal.
8. **05 Ajánlatkérés** (sötét panel)
   - Cím: „Kérj ajánlatot felülvizsgálatra.”
   - Bevezető: „Írd meg, hol van az ingatlan – 48 órán belül jelentkezünk, kötelezettség nélkül.”
   - Elérhetőség: +36 20 504 33 00, mernok@villkiv.hu.
   - Űrlap:
     - kötelező mezők: Név, Telefonszám, E-mail-cím, Ingatlan települése;
     - **Mérési pontok (nem kötelező):** dugalj, lámpa, kapcsoló (0–999), elosztó (0–99), egész szám, érthető hibaüzenettel;
     - Rövid üzenet (nem kötelező, max. 1000 karakter);
     - rejtett mezők: `szolgaltatas=erintesvedelem`, `targy=Új érintésvédelmi ajánlatkérés a weboldalról`, `_gotcha` spamcsapda.
     - Szolgáltatásválasztó nem kell.
9. **Lábléc:** a logó, alatta kiírva „VILLKIV Mérnökiroda Kft.” és a tevékenység. Cégadatok: VILLKIV Mérnökiroda Kft., székhely 5630 Békés, Kossuth Lajos utca 23. B. lház. 2. em. 21., adószám 32746031-2-04, cégjegyzékszám 04 09 017656. Menü; alul linkek: Adatkezelési tájékoztató, Süti tájékoztató, Impresszum.

## Űrlap és köszönőoldal (ugyanúgy, mint a napelemes oldalon)
- **Ellenőrzés:**
  - hibaüzenet csak az után, hogy a látogató elhagyta a mezőt;
  - beküldéskor fókuszba kerülő hibalista, a mezőkre mutató linkekkel;
  - `aria-invalid` a hibás mezőkön.
- **EmailJS:** a `<form>` `data-emailjs-public-key`, `data-emailjs-service`, `data-emailjs-template` attribútumai alapján JSON POST a `https://api.emailjs.com/api/v1.0/email/send` címre (`template_params`: a mezők + `oldal` + `reply_to`; a `_` kezdetű mezők nem). Ha bármelyik azonosító hiányzik, az űrlap „nincs bekötve” hibát ad. **Privát kulcs soha nem kerül a frontendbe.** Kitöltött spamcsapdánál nincs küldés. JS nélkül a küldés gomb rejtve, helyette telefonszám és e-mail-cím. Mérési pontok sablonváltozói: `dugalj`, `lampa`, `kapcsolo`, `eloszto` (a mezőnevekkel egyezően).
- **Adatkezelési jelölőnégyzet:** „Elolvastam és tudomásul vettem az adatkezelési tájékoztatót.” (link új lapon), kötelező; nélküle nem küld.
- **Meta Pixel és sütisáv:** ugyanúgy, mint a napelemes oldalon (`data-meta-pixel` a `<html>` elemen; üresen nincs sáv; a Pixel csak elfogadás után; egyenrangú „Elutasítom”; 180 napos döntés; Süti-beállítások gomb a láblécben; `Lead` csak valódi beküldés után). Lehet ugyanaz a Pixel ID, mint a napelemes oldalé.
- **Lábléc:** nagy „VILLKIV” díszfelirat a lábléc alján, mint a napelemes oldalon.
- **Átirányítás:** csak 2xx válasz után, a `koszonjuk.html?szolgaltatas=erintesvedelem` oldalra. Hibánál az adatok megmaradnak. Küldés közben a gomb tiltott, 15 mp az időtúllépés. 
- **Köszönőoldal (`noindex`):**
  - megerősítés és a 48 órás ígéret;
  - „Mi következik?”, három lépés;
  - tanács: „Ha van korábbi jegyzőkönyv vagy villamos terv, tedd félre. A méréshez szabad hozzáférés kell az elosztóhoz.”;
  - telefonszám és e-mail-cím, „Vissza a főoldalra” gomb.

## Minőségi követelmények (Playwright + axe tesztekkel ellenőrizve)
- Nincs vízszintes görgetés 320–1920 px között.
- Nincs WCAG 2.2 AA hiba.
- Működik a billentyűzetes navigáció és az ugrólink.
- Mobilon a főcím és a csempék megelőzik a képeket.
- Lassú betöltésnél is CLS < 0,02.
- Az idővonalak sorban kapcsolnak fel.
- Az aktív menüpont és a fejléccsík jól működik.
- Az űrlap minden állapota helyes: üres, hibás, bekötetlen, HTTP 200, HTTP 500, hálózati hiba, dupla kattintás.
- EmailJS: a kérés törzse helyes; 400-nál hiba; részleges beállításnál nincs küldés; spamcsapdánál nincs kérés.
- Jogi oldalak: noindex, WCAG, működő linkek, a lábléc egyezik a főoldaléval.
- Csökkentett mozgásnál nincs animáció; JS nélkül is minden tartalom olvasható.

## Tilos
- Kitalált vélemény, minősítés, projektszám vagy számláló.
- Konkrét határidő vagy ingyenes felmérés ígérete, ha nincs megerősítve.
- A „néhány percen belüli ajánlat” ígérete.
- Ipari felülvizsgálat (ez lakossági oldal).
- Napelemes tartalom.

## Ellenőrizendő a megrendelővel
- A 20–60 ezer Ft bruttó (áfával) értendő-e.
- Az adatkezelési tájékoztató ellenőrizendő pontjai (megőrzési idő, e-mail- és tárhelyszolgáltató) – ugyanazok, mint a napelemes oldalon.
- Valódi érintésvédelmi fotók: elosztószekrény mérés közben, mérőműszer.
- EmailJS: külön sablon (Template ID) az érintésvédelmi kérésekhez, címzett: mernok@villkiv.hu.
