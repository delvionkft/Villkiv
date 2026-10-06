# Következő kör: modernizálás és „okos” elemek

Ez a dokumentum a következő munkamenet kiindulópontja. Az aktuális állapot a
`claude/hungarian-electrical-landing-aa8ac1` ágon van (újratervezett, rendezett
alap, 39 zöld teszt).

## Alapelv

Egy „okos” elem csak akkor kerül az oldalra, ha legalább az egyiket teljesíti:

1. gyorsabban eldönti a látogató, melyik szolgáltatás kell neki;
2. jobb minőségű ajánlatkérés érkezik (több használható adat, kevesebb visszakérdezés);
3. csökkenti a bizonytalanságot (mi fog történni, mire készüljek).

Ami csak „látványos”, az kimarad.

## Kötelező elemek (prioritási sorrendben)

### 1. Helyzetválasztó mini-asszisztens (a nyitószekció alatt)
- 2–3 kattintás: „Mi a helyzet?” → vásárlás / öröklés · felújítás · eladás / bérbeadás · bizonytalan vagyok a hálózatban · napelemen gondolkodom · klíma / autótöltő jön.
- Eredmény: javasolt szolgáltatás egy mondatos indoklással, és egy gomb, ami az űrlapot előtölti (szolgáltatás + helyzet címke).
- Jogi állítás nincs benne (nem mondja, hogy kötelező a vizsgálat).
- Billentyűzettel és képernyőolvasóval is használható (radio csoportok, `aria-live` eredmény).

### 2. Többlépéses ajánlatkérő űrlap
- 1. lépés: szolgáltatás · 2. lépés: ingatlan (település, típus, helyzet-címkék) · 3. lépés: elérhetőség.
- Lépésjelző sáv, vissza gomb, lépésenkénti mezőellenőrzés.
- Napelemnél opcionális mezők: éves fogyasztás (kWh) vagy havi számla, egy/háromfázisú, tervezett fogyasztók (címkék).
- Piszkozat mentése a böngészőben (`localStorage`, try/catch), elküldés után törlés.
- Siker továbbra is csak igazolt (2xx) továbbítás után.

### 3. Interaktív „Mit készíts elő?” lista
- Szolgáltatásonként pipálható lista (elosztóhoz hozzáférés, korábbi jegyzőkönyv; villanyszámlák, tetőfotók, mérőhely fotó).
- A GYIK válaszaiból épül, nem új állításokból.

### 4. Élő kapcsolási rajz a folyamatnál
- A lépések közötti vezeték görgetés közben „feltöltődik” (CSS scroll-driven animation, támogatás hiányában statikus).
- `prefers-reduced-motion` esetén nincs animáció.

### 5. Navigáció
- Aktív menüpont jelölése görgetés közben.
- Mobilon kompakt alsó CTA-sáv, ami csak a nyitószekció után jelenik meg, és az űrlapnál eltűnik. Nem takarhat tartalmat (a lap aljára ugyanakkora térköz).

## Vizuális irány
- Valódi képek: a Canva-demóképek beépítése (lásd előfeltételek), majd saját fotók.
- Nyitószekció „bento” elrendezésben: nagy fotó + részletfotó + a két szolgáltatásválasztó egy rácsban.
- Sötétkék szekciókban finom, egyszínű képkezelés; nincs erős színátmenet, üvegfelület, indokolatlan árnyék.
- Mikro-interakciók: gombok, kártyák, harmonika – rövid, 150–250 ms.

## Kifejezetten kerülendő
- Megtakarítás- vagy megtérülés-kalkulátor, „becsült kWp” szám ígéretként.
- Kitalált számlálók („500+ elégedett ügyfél”), értékelések, minősítések.
- Chatbot-utánzat, automatikus képváltó, erős parallax.
- Analitika hozzájárulás nélkül (GA4 csak sütihozzájárulás után).

## Előfeltételek a következő munkamenet elején
1. **Képek:** a felhőkörnyezet hálózati beállításában `canva.com` és `*.canva.com` engedélyezése, vagy a négy demókép letöltése és feltöltése:
   - Családi ház napelemekkel – https://www.canva.com/M/MAHXOxjLfZI
   - Mérés az elosztónál – https://www.canva.com/M/MAHXO-ZuxT4
   - Elosztószekrény – https://www.canva.com/M/MAHXOzZUsow
   - Ház napelemmel és autótöltővel – https://www.canva.com/M/MAHXOydcYWg
2. **Döntések:**
   - Vállalja-e a cég a hibajavítást, a napelem tervezését, kivitelezését, ügyintézését?
   - Van-e űrlap-feldolgozó (Formspree, saját szerver)?
   - Kell-e analitika?

## Elfogadási feltételek
- A meglévő 39 teszt zöld, és új tesztek fedik a helyzetválasztót, a többlépéses űrlapot (lépésváltás, vissza, piszkozat, előtöltés), az aktív menüt és az alsó CTA-sávot.
- Nincs vízszintes görgetés 320–1920 px között, nincs WCAG 2.2 AA hiba, a CLS < 0,02.
- JavaScript nélkül is minden tartalom olvasható, és az űrlap egy lépésben kitölthető.
