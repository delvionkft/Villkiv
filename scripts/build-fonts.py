"""Archivo változó betűtípus előkészítése a weboldalhoz.

Futtatás:  npm run fonts   (előfeltétel: pip install fonttools brotli)
Forrás:    scripts/fonts-src/Archivo[wdth,wght].ttf
           (https://github.com/Omnibus-Type/Archivo, SIL Open Font License 1.1)
Kimenet:   assets/fonts/archivo-hu.woff2

1. A tengelyeket a ténylegesen használt tartományra szűkíti
   (szélesség 75–112%, vastagság 400–800).
2. Csak a magyar szöveghez szükséges karaktereket tartja meg.
Egyetlen fájl készül, így az ékezetes betűk sosem keverednek tartalék betűvel.
"""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts/fonts-src/Archivo[wdth,wght].ttf"
OUT = ROOT / "assets/fonts/archivo-hu.woff2"

UNICODES = (
    "U+0020-007E,U+00A0-00FF,"  # alap latin, Latin-1 (á é í ó ö ú ü …)
    "U+0150-0151,U+0170-0171,"  # Ő ő Ű ű
    "U+2013-2014,U+2018-201E,U+2022,U+2026,U+2190,U+2192-2193,U+20AC,U+2122,U+2212"
)

font = TTFont(SRC)
font = instancer.instantiateVariableFont(font, {"wdth": (75, 112), "wght": (400, 800)})

opts = subset.Options()
opts.flavor = "woff2"
opts.layout_features = ["kern", "liga", "calt", "tnum", "lnum", "case"]
opts.name_IDs = ["*"]
opts.notdef_outline = True
sub = subset.Subsetter(opts)
sub.populate(unicodes=subset.parse_unicodes(UNICODES))
sub.subset(font)
font.flavor = "woff2"
OUT.parent.mkdir(parents=True, exist_ok=True)
font.save(OUT)
print(f"{OUT.relative_to(ROOT)}  {OUT.stat().st_size / 1024:.1f} KB")
