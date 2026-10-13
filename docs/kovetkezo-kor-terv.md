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
- Űrlap-feldolgozó egyelőre nincs. **Élesítés előtt kötelező** (javaslat: Formspree, a cég saját fiókjával). Addig az űrlap hibát jelez, és sosem mutat sikert.
- Analitika nem kell, ezért sem követőkód, sem sütisáv nem kerül fel.

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
- Még hiányzik: székhely, adószám, nyilvántartási szám, adatkezelési tájékoztató, impresszum, logó, űrlap-feldolgozó, fotók.

## Napelemes anyag (2026-10-13)
- Beépítve: vállalások (felmérés és méretezés, mérnöki tervezés, engedélyeztetés, pályázat és finanszírozás, kivitelezés és garancia, beüzemelés és monitoring), működés négy lépésben, tájékoztató ár (5 kWp: 2,5–4 M Ft), kivitelezés 1–3 nap, teljes folyamat 2–6 hét, 48 órás személyre szabott rendszerterv kötelezettség nélkül.
- Szándékosan kimaradt: az éves megtakarítás és a megtérülési idő számai. A forrásban ellentmondanak egymásnak (7–12 év és 8–12 év), és az elszámolási szabályok változása óta az új rendszereknél könnyen túlzónak bizonyulhatnak. Ezeket a személyre szabott rendszerterv tartalmazza.
- Ellenőrizendő: a 2,5–4 M Ft bruttó (áfával) értendő-e.

## Érintésvédelmi anyag (2026-10-13)
- Beépítve: cél (veszélyes hibák feltárása, áramütés- és tűzkockázat csökkentése), amit kap az ügyfél (mérések, részletes jegyzőkönyv, javítási javaslatok, fotódokumentáció), mikor érdemes (új építés, átalakítás, időszakos ellenőrzés is), négylépéses menet (felmérés, mérés, kiértékelés, jegyzőkönyv), ár 20 000–60 000 Ft, időtartam 30–120 perc, díjmentes jegyzőkönyv-pontosítás hatósági észrevételnél.
- Űrlap: opcionális mérési pontok (dugalj, lámpa, kapcsoló, elosztó), csak érintésvédelemnél vagy „mindkettő” esetén látszik és csak ekkor kerül elküldésre.
- Szándékosan kimaradt: ipari felülvizsgálat (lakossági oldal), és a „néhány percen belüli ajánlat” ígérete (űrlap-feldolgozó és automatizmus nélkül nem tartható).
- Ellenőrizendő: a 20 000–60 000 Ft bruttó (áfával) értendő-e.
