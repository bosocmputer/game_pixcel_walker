#!/usr/bin/env python3
"""
Battle status icons shown above a unit's head (ROADMAP ⚔️ 2.6). 12x12 each on a dark round badge
so they read over any backdrop; one horizontal strip in STATUS order.

    python pixel-art/status-icons/build.py

Outputs apps/game/public/assets/ui/status.png (1x strip) and preview.png here.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite  # noqa: E402
from PIL import Image  # noqa: E402

OUT = os.path.join(ROOT, "apps", "game", "public", "assets", "ui", "status.png")
# Keep in sync with STATUS_ICONS in apps/game/src/scenes/battleOverlay.ts
STATUS = ["STUN", "FREEZE", "POISON", "BURN", "BLEED", "SLOW", "TAUNTING", "ROOT", "SHIELD"]
S = 12
INK = "#0c0818"


def badge(ring):
    s = Sprite(S, S)
    s.circle(5, 5, 5, "#1c1a28", fill=True)
    s.rect(1, 3, 10, 8, "#1c1a28")
    s.rect(3, 1, 8, 10, "#1c1a28")
    s.outline(ring, where="inside")
    return s


def stun():
    s = badge("#f2c230")
    for x, y in ((6, 5), (6, 4), (5, 4), (4, 5), (4, 6), (5, 7), (6, 7), (7, 6), (7, 5), (7, 4), (7, 3), (6, 3), (5, 3), (4, 3), (3, 4), (3, 5), (3, 6), (3, 7), (4, 8), (5, 8)):
        s.px(x, y, "#ffe45a")                                   # dizzy spiral
    s.px(8, 8, "#fff6c8"); s.px(2, 2, "#fff6c8"); s.px(9, 2, "#ffe45a")
    return s


def freeze():
    s = badge("#6ad0ff")
    for i in range(2, 10):
        s.px(i, 5, "#c8f6ff"); s.px(5, i, "#c8f6ff")
    for d in range(1, 4):
        s.px(5 - d, 5 - d, "#6ad0ff"); s.px(5 + d, 5 - d, "#6ad0ff"); s.px(5 - d, 5 + d, "#6ad0ff"); s.px(5 + d, 5 + d, "#6ad0ff")
    s.px(5, 5, "#ffffff")
    return s


def poison():
    s = badge("#58d06a")
    s.circle(5, 7, 2, "#58d06a", fill=True); s.px(5, 3, "#58d06a"); s.rect(4, 4, 6, 5, "#58d06a")
    s.px(4, 6, "#b6f28c"); s.px(8, 3, "#9ae88a"); s.px(2, 4, "#9ae88a")
    return s


def burn():
    s = badge("#ff8a2a")
    s.polygon([(3, 9), (3, 6), (5, 2), (6, 5), (8, 3), (8, 9)], "#e0303a")
    s.polygon([(4, 9), (4, 7), (6, 5), (7, 7), (7, 9)], "#ff8a2a")
    s.rect(5, 8, 6, 9, "#ffe45a")
    return s


def bleed():
    s = badge("#e0303a")
    s.circle(5, 7, 2, "#e0303a", fill=True); s.rect(5, 3, 5, 4, "#e0303a"); s.rect(4, 5, 6, 5, "#e0303a")
    s.px(4, 6, "#ff8a8a")
    s.px(8, 8, "#b0283a")
    return s


def slow():
    s = badge("#6a8aff")
    s.rect(3, 2, 8, 2, "#c8d4ff"); s.rect(3, 9, 8, 9, "#c8d4ff")      # hourglass
    s.polygon([(3, 3), (8, 3), (5, 6)], "#6a8aff"); s.polygon([(5, 6), (3, 8), (8, 8)], "#6a8aff")
    s.px(5, 7, "#f2c230"); s.rect(4, 8, 7, 8, "#f2c230")
    return s


def taunting():
    s = badge("#ff5a5a")
    for x, y in ((3, 3), (3, 4), (4, 3), (7, 3), (8, 3), (8, 4), (3, 7), (3, 8), (4, 8), (7, 8), (8, 8), (8, 7)):
        s.px(x, y, "#ff5a5a")                                       # anger vein
    s.px(5, 5, "#ff8a8a"); s.px(6, 6, "#ff8a8a")
    return s


def root():
    s = badge("#b08a4a")
    s.line(2, 9, 9, 2, "#8a5a34"); s.line(2, 2, 9, 9, "#8a5a34")
    s.px(3, 5, "#58a04a"); s.px(8, 6, "#58a04a"); s.px(5, 3, "#58a04a"); s.px(6, 8, "#58a04a")
    return s


def shield():
    s = badge("#4fd8ff")
    s.polygon([(3, 2), (8, 2), (8, 6), (5, 9), (3, 6)], "#4fd8ff")
    s.polygon([(3, 2), (5, 2), (5, 9), (3, 6)], "#c8f6ff")
    s.px(5, 4, "#ffffff")
    return s


DRAW = {"STUN": stun, "FREEZE": freeze, "POISON": poison, "BURN": burn, "BLEED": bleed, "SLOW": slow,
        "TAUNTING": taunting, "ROOT": root, "SHIELD": shield}


def main():
    ims = [DRAW[k]().composite(1) for k in STATUS]
    strip = Image.new("RGBA", (S * len(ims), S), (0, 0, 0, 0))
    for i, im in enumerate(ims):
        strip.alpha_composite(im, (i * S, 0))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    strip.save(OUT)
    bg = Image.new("RGBA", (strip.width * 8 + 16, S * 8 + 16), (90, 110, 140, 255))
    bg.alpha_composite(strip.resize((strip.width * 8, S * 8), Image.NEAREST), (8, 8))
    bg.save(os.path.join(HERE, "preview.png"))
    print("OK", len(ims), "status icons")


if __name__ == "__main__":
    main()
