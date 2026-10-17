# Következő kör

A megrendelő döntése (2026-10-06): **nem kell extra funkció** (helyzetválasztó,
többlépéses űrlap, ellenőrzőlista stb.). Az oldal maradjon letisztult és modern.
A gyakori kérdések szekciót kérésre eltávolítottuk.

## Elkészült ebben a körben
- Dinamikus vezeték „Az így zajlik a felülvizsgálat” és „A munka menete” szakaszban: görgetéskor töltődik, az elért lépések felkapcsolnak.
- Görgetést követő csík a fejléc alján.
- Menüpontok: sárga aláhúzás egérrámutatáskor és az épp látható szakasznál.

## Döntések
- A cég vállalja a hibajavítást, a napelemes rendszer tervezését, kivitelezését és az áramszolgáltatói ügyintézést (beépítve).
- Űrlap-feldolgozó: **EmailJS** (2026-10-17). Amíg a három azonosító nincs beírva, az űrlap hibát jelez, és sosem mutat sikert.
- Analitika nem kell. Meta Pixel igen (2026-10-17), kizárólag hozzájárulással, sütisávval.

## Teendő a következő munkamenet elején
1. Ellenőrizni, hogy a Canva elérhető-e: `curl -sS -o /dev/null -w "%{http_code}" https://www.canva.com/`. A hálózati engedély új munkamenetben lép életbe.
2. A négy demóképet teljes méretben letölteni, `assets/src/<név>.demo.jpg` néven elmenteni, majd: `npm run images`.
   - hero-haz – https://www.canva.com/M/MAHXOxjLfZI (MAHXOxjLfZI)
   - hero-meres – https://www.canva.com/M/MAHXO-ZuxT4 (MAHXO-ZuxT4)
   - ev-eloszto – https://www.canva.com/M/MAHXOzZUsow (MAHXOzZUsow)
   - napelem-otthon – https://www.canva.com/M/MAHXOydcYWg (MAHXOydcYWg)
3. Cégadatok, elérhetőségek és az átadott dokumentáció megnevezése: `npm run check:placeholders` kilistázza, mi hiányzik.

## Cégadatok (2026-10-13)
- Beépítve: VILLKIV Mérnökiroda Kft., csapat (villamosmérnökök, regisztrált villanyszerelők, villamos biztonsági felülvizsgálók), vállalások (egyedi felmérés, dokumentált átadás, legalább 2 év garancia, felelősségbiztosítás, ügyintézési jogosultság), 48 órás kapcsolatfelvétel, helyszíni felmérés utáni tételes ajánlat, telefon és e-mail.
- Szándékosan kimaradt: az új családi ház villanyszerelésének árai és határideje, valamint az ipari ügyfelek. Ez az oldal a két lakossági szolgáltatásra szól; az ár a nem itt tárgyalt szolgáltatásról szólna, és összezavarná a látogatót.
- Később pótolva: székhely, adószám, cégjegyzékszám, adatkezelési tájékoztató, impresszum, logó, fotók (lásd lent).

## Napelemes anyag (2026-10-13)
- Beépítve: vállalások (felmérés és méretezés, mérnöki tervezés, engedélyeztetés, pályázat és finanszírozás, kivitelezés és garancia, beüzemelés és monitoring), működés négy lépésben, tájékoztató ár (5 kWp: 2,5–4 M Ft), kivitelezés 1–3 nap, teljes folyamat 2–6 hét, 48 órás személyre szabott rendszerterv kötelezettség nélkül.
- Szándékosan kimaradt: az éves megtakarítás és a megtérülési idő számai. A forrásban ellentmondanak egymásnak (7–12 év és 8–12 év), és az elszámolási szabályok változása óta az új rendszereknél könnyen túlzónak bizonyulhatnak. Ezeket a személyre szabott rendszerterv tartalmazza.
- Ellenőrizendő: a 2,5–4 M Ft bruttó (áfával) értendő-e.

## Érintésvédelmi anyag (2026-10-13)
- Beépítve: cél (veszélyes hibák feltárása, áramütés- és tűzkockázat csökkentése), amit kap az ügyfél (mérések, részletes jegyzőkönyv, javítási javaslatok, fotódokumentáció), mikor érdemes (új építés, átalakítás, időszakos ellenőrzés is), négylépéses menet (felmérés, mérés, kiértékelés, jegyzőkönyv), ár 20 000–60 000 Ft, időtartam 30–120 perc, díjmentes jegyzőkönyv-pontosítás hatósági észrevételnél.
- Űrlap: opcionális mérési pontok (dugalj, lámpa, kapcsoló, elosztó), csak érintésvédelemnél vagy „mindkettő” esetén látszik és csak ekkor kerül elküldésre.
- Szándékosan kimaradt: ipari felülvizsgálat (lakossági oldal), és a „néhány percen belüli ajánlat” ígérete (űrlap-feldolgozó és automatizmus nélkül nem tartható).
- Ellenőrizendő: a 20 000–60 000 Ft bruttó (áfával) értendő-e.

## Fotók (2026-10-13)
- Beépítve 5 saját munkafotó: nyitókép (tetőablak melletti rendszer), részletkép (szerelés közben), napelemes szakasz (családi ház, a kamera-vízjel kivágva), és két kép a „Munkáinkból” sávban.
- Hiányzik: érintésvédelmi fotó (elosztószekrény, mérés). Az érintésvédelmi szakaszban még helyőrző van.
- Érintésvédelmi szakasz: a feltöltött fotó (inverter, elosztódoboz, akkumulátor) vágott változata került be. Erősebb lenne egy nyitott elosztószekrény mérés közben, mérőműszerrel.

## Szétválasztás (2026-10-17)
- Ügyfélkérésre a két szolgáltatás külön landinget kapott. Ez a repó mostantól csak a lakossági napelemes rendszerekről szól.
- A kétszolgáltatásos változat utolsó állapota: `bee9b8b` commit (ebben megvan az érintésvédelmi szakasz, a mérési pontok az űrlapon és a köszönőoldal tanácsai).
- Az érintésvédelmi landing promptja: `docs/erintesvedelem-landing-prompt.md`.

## Jogi oldalak és EmailJS (2026-10-17)
- Elkészült: `adatvedelem.html`, `cookie.html`, `impresszum.html` (forrás: `pages/`, generálás: `npm run pages`). A lábléc a valódi cégadatokat mutatja: 5630 Békés, Kossuth Lajos utca 23. B. lház. 2. em. 21., adószám 32746031-2-04, cégjegyzékszám 04 09 017656.
- Az űrlap EmailJS-en keresztül küld (beállítás: README). Privát kulcs nincs és nem is lehet a frontendben.
- Ellenőrizendő (`npm run check:placeholders` listázza):
  - EmailJS Public Key, Service ID, Template ID;
  - megőrzési idő az adatkezelési tájékoztatóban;
  - a mernok@villkiv.hu e-mail-szolgáltatója;
  - a tárhelyszolgáltató adatai az impresszumban;
  - a megrendelő által küldött „Kft.2025” jelentése (alapítás éve?) – az oldalon nem szerepel.
- A jogi szövegeket élesítés előtt jogásznak kell átnéznie.

## Ellenőrzőlista-kör (2026-10-17)
- Adatkezelési jelölőnégyzet az űrlapon („Elolvastam és tudomásul vettem…”), kötelező; nélküle nem küld. Szándékosan nem „hozzájárulok”: az ajánlatkérés jogalapja a szerződés előtti lépés, nem a hozzájárulás.
- Meta Pixel + sütisáv: a Pixel ID-re vár (`data-meta-pixel`). Az Events Managerben az automatikus speciális egyeztetést ki kell kapcsolni.
- Lábléc: nagy „VILLKIV” díszfelirat a lábléc alján.
- Az űrlap helye nem változott: a hero és a footer között van, közvetlenül a footer felett; a hero CTA-ja odavisz.
