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
