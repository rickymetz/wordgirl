#!/usr/bin/env python3
"""
Bake Typeset's glyph outlines into src/games/typeset/glyphs.json.

The game ships PATHS, never font files: the cards work offline, render
identically everywhere, and are untouched by the Font setting (they are
art, not text). This script is run by hand whenever the pool, a face or a
weight changes, and its output is committed — CI and the app need no
Python.

For every (face, character) pair the pool uses (scripts/typeset-glyph-
manifest.mts prints them), it:
  1. fetches the face's static TTF at its weight from Google Fonts (all
     faces are OFL),
  2. fails loudly if the character is missing,
  3. REMOVES OVERLAPS (skia-pathops). Variable-font instances build many
     letters from overlapping contours; the cross-hatch's keyline and the
     open fill's outline would trace those seams inside the letter,
  4. writes the outline as an SVG path at 1000 units per em, y down,
     baseline at 0, with its advance and ink box.

Setup (once):  python3 -m venv .venv && .venv/bin/pip install fonttools skia-pathops
Run:           .venv/bin/python scripts/bake-typeset-glyphs.py
"""
import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.removeOverlaps import removeOverlaps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src/games/typeset/glyphs.json"
CACHE = ROOT / "node_modules/.cache/typeset-fonts"
UPM = 1000
# A non-browser user agent makes Google Fonts serve one full TTF per
# weight instead of unicode-range WOFF2 subsets.
UA = "Wget/1.21"


def manifest():
    out = subprocess.run(
        ["npx", "vite-node", "scripts/typeset-glyph-manifest.mts"],
        cwd=ROOT, check=True, capture_output=True, text=True,
    ).stdout
    return json.loads(out.strip().splitlines()[-1])


def fetch_font(family: str, weight: int) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{family.replace(' ', '-')}-{weight}.ttf"
    if path.exists():
        return path
    q = urllib.parse.quote(family) + f":wght@{weight}" if weight != 400 else urllib.parse.quote(family)
    css_url = f"https://fonts.googleapis.com/css2?family={q}"
    css = urllib.request.urlopen(urllib.request.Request(css_url, headers={"User-Agent": UA})).read().decode()
    urls = re.findall(r"url\((https://[^)]+\.ttf)\)", css)
    if not urls:
        sys.exit(f"no TTF for {family} {weight}: {css[:200]}")
    path.write_bytes(urllib.request.urlopen(urls[0]).read())
    return path


def fmt(v: float) -> str:
    return str(int(round(v)))


def main():
    m = manifest()
    by_face: dict[str, list[str]] = {}
    for face, char in m["glyphs"]:
        by_face.setdefault(face, []).append(char)

    glyphs = {}
    missing = []
    for face, chars in sorted(by_face.items()):
        spec = m["faces"][face]
        font = TTFont(fetch_font(spec["family"], spec["weight"]))
        cmap = font.getBestCmap()
        names = []
        for c in chars:
            gid = cmap.get(ord(c))
            if gid is None:
                missing.append(f"{face}:{c}")
            else:
                names.append(gid)
        if "glyf" in font:
            removeOverlaps(font, names)
        gs = font.getGlyphSet()
        scale = UPM / font["head"].unitsPerEm
        for c in chars:
            gid = cmap.get(ord(c))
            if gid is None:
                continue
            svg = SVGPathPen(gs, ntos=fmt)
            gs[gid].draw(TransformPen(svg, (scale, 0, 0, -scale, 0, 0)))
            bounds = BoundsPen(gs)
            gs[gid].draw(TransformPen(bounds, (scale, 0, 0, -scale, 0, 0)))
            x0, y0, x1, y1 = (round(v) for v in bounds.bounds)
            glyphs[f"{face}:{c}"] = {
                "d": svg.getCommands(),
                "adv": round(gs[gid].width * scale),
                "box": [x0, y0, x1, y1],
            }
    if missing:
        sys.exit("characters missing from their face: " + ", ".join(missing))

    OUT.write_text(json.dumps({"upm": UPM, "glyphs": dict(sorted(glyphs.items()))}, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"wrote {len(glyphs)} glyphs, {OUT.stat().st_size // 1024} KB -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
