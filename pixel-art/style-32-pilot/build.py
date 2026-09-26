#!/usr/bin/env python3
"""
32-bit style pilot (MASTER_SPEC art direction, 2026-09-25): three pieces redrawn at 2x
resolution to lock the new look before the whole game is converted.

32-bit rules used here:
- 2x art resolution (critter 64 px, boss 96-128 px, icon 32 px), shown 1 art px = 1 screen px
- 6-7 step hue-shifted ramps, 24-48 colours per piece
- light top-left; rim light (reflected, cool) on the lower-right edge; specular hot spots
- selective outline: darkest ramp shade inside the silhouette, lit side lifted one step
- manual AA only on the long curves; soft dither only for glass / glow / subsurface

    python pixel-art/style-32-pilot/build.py   → compare.png (old 16-bit vs new 32-bit)
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite, ramp, mix  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

ASSETS = os.path.join(ROOT, "apps", "game", "public", "assets")


def R(base, n=7, hs=22):
    return ramp(base, n, hue_shift=hs)


def selout(s, dark, lit):
    """Selective outline: dark inside edge, then lift the top/left edge pixels to `lit`."""
    s.outline(dark, where="inside")
    im = s._img()
    w, h = im.size
    px = im.load()
    d = tuple(int(dark[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    L = tuple(int(lit[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    for y in range(h):
        for x in range(w):
            if px[x, y] != d:
                continue
            up = y == 0 or px[x, y - 1][3] == 0
            left = x == 0 or px[x - 1, y][3] == 0
            if up or (left and y < h * 0.6):
                px[x, y] = L


# ============================================================================================
# Slime (critter, 64x64)

def slime():
    s = Sprite(64, 64)
    b = R("#3fb6e8", 7, 24)          # 0 darkest .. 6 lightest
    deep = "#1c2f6a"
    # silhouette: a soft dome that spreads at the base
    s.ellipse(6, 20, 57, 60, b[1])
    s.rect(8, 46, 55, 59, b[1], only="opaque")
    s.ellipse(4, 44, 59, 61, b[1])
    # restacked light (shifted up-left)
    s.ellipse(6, 19, 53, 56, b[2], only="opaque")
    s.ellipse(8, 20, 47, 50, b[3], only="opaque")
    s.ellipse(11, 22, 38, 42, b[4], only="opaque")
    s.ellipse(14, 23, 32, 36, b[5], only="opaque")
    # shadow side: a darker crescent on the lower right, and the underside
    s.ellipse(30, 40, 60, 62, b[0], only=b[1])
    s.ellipse(8, 54, 56, 62, b[0], only=b[1])
    # subsurface glow near the base (light passing through the jelly)
    s.ellipse(20, 47, 44, 58, b[2], only="opaque")
    s.ellipse(24, 49, 40, 57, b[3], only="opaque")
    s.ellipse(28, 51, 36, 55, b[4], only="opaque")
    # bubbles
    for cx, cy, r in ((44, 40, 3), (18, 50, 2), (36, 30, 2), (50, 50, 2)):
        s.circle(cx, cy, r, b[5], fill=True, only="opaque")
        s.px(cx - r // 2, cy - r // 2, b[6], only="opaque")
    # rim light on the lower right (cool reflected light)
    for y in range(34, 58):
        for x in range(63, 0, -1):
            if s.get(x, y) and s.get(x, y)[3]:
                s.px(x - 2, y, "#8ae8ff", only="opaque")
                break
    # specular streak + hot spot
    s.ellipse(14, 24, 24, 30, b[5], only="opaque")
    s.ellipse(15, 25, 21, 28, b[6], only="opaque")
    s.rect(26, 23, 28, 24, b[6], only="opaque")
    s.px(12, 33, b[6], only="opaque"); s.px(12, 34, b[5], only="opaque")
    # face
    for ex in (27, 41):
        s.ellipse(ex - 4, 33, ex + 3, 43, "#f4f8ff")
        s.ellipse(ex - 3, 35, ex + 3, 43, deep)
        s.ellipse(ex - 2, 36, ex + 2, 42, "#2a4ab0")
        s.rect(ex - 2, 36, ex - 1, 37, "#ffffff"); s.px(ex + 1, 40, "#c8e8ff")
        s.px(ex - 4, 34, b[1]); s.px(ex + 3, 34, b[1])   # AA into the body
    s.line(32, 46, 36, 46, deep); s.px(31, 45, deep); s.px(37, 45, deep)   # smile
    s.px(22, 45, "#ff9ac8"); s.px(23, 45, "#ff9ac8"); s.px(45, 45, "#ff9ac8"); s.px(46, 45, "#ff9ac8")   # blush
    selout(s, b[0], b[2])
    return s


# ============================================================================================
# Red potion (item icon, 32x32)

def potion():
    s = Sprite(32, 32)
    glass = R("#bfe6ff", 6, 10)
    red = R("#e0303a", 7, 18)
    cork = R("#b07a44", 5, 14)
    # flask: pale glass body + neck
    s.circle(16, 20, 10, glass[3], fill=True)
    s.rect(13, 6, 19, 12, glass[3])
    s.circle(17, 21, 9, glass[2], fill=True, only=glass[3])             # glass shadow side
    # liquid fills the lower two thirds (meniscus line at y=15)
    s.circle(16, 20, 9, red[3], fill=True)
    s.rect(6, 10, 26, 14, glass[3], only=red[3])
    s.line(8, 15, 24, 15, red[5], only=red[3])
    s.circle(18, 23, 8, red[2], fill=True, only=red[3])                 # shadow side of the liquid
    s.circle(20, 25, 6, red[1], fill=True, only=red[2])
    s.circle(14, 19, 3, red[4], fill=True, only=red[3])                 # inner glow
    for x, y in ((19, 24), (12, 25), (21, 19)):
        s.px(x, y, red[5])                                              # bubbles
    # glass reflections + cool rim light
    s.line(14, 7, 14, 11, glass[5])
    s.line(10, 14, 10, 20, "#ffffff"); s.px(11, 13, "#ffffff"); s.px(11, 21, glass[5])
    s.px(24, 23, glass[5]); s.px(23, 25, glass[5])
    # cork + gold string
    s.rect(13, 3, 19, 6, cork[2]); s.rect(13, 3, 15, 6, cork[3]); s.line(13, 6, 19, 6, cork[1])
    s.line(12, 8, 20, 8, "#f2c230"); s.px(20, 9, "#f2c230"); s.px(21, 10, "#d8a020")
    # small icons read best with one even outline
    s.outline("#3a1a2a", where="outside")
    return s


# ============================================================================================
# Goblin King (boss, 96x96)

def goblin_king():
    s = Sprite(96, 96)
    skin = R("#58b040", 7, 26)
    cape = R("#7a2aa0", 7, 22)
    gold = R("#f2c230", 7, 26)
    club = R("#e8a078", 7, 16)       # the frozen sausage club
    leather = R("#8a5a34", 6, 14)
    eyes = "#ffe45a"
    # cape behind
    s.polygon([(20, 40), (76, 40), (86, 90), (10, 90)], cape[1])
    s.polygon([(20, 40), (48, 40), (42, 90), (10, 90)], cape[2], only="opaque")
    s.polygon([(22, 44), (34, 44), (24, 88), (12, 88)], cape[3], only="opaque")
    for x in range(14, 84, 7):                                   # cape folds: dark crease + lit edge
        s.line(x, 58, x + 2, 88, cape[0], only="opaque")
        s.line(x + 1, 58, x + 3, 88, cape[3], only="opaque")
    s.rect(10, 86, 86, 90, gold[2], only="opaque"); s.line(10, 86, 86, 86, gold[4], only="opaque")   # gold hem
    # legs + feet
    for x in (34, 54):
        s.rect(x, 74, x + 9, 86, skin[1]); s.rect(x, 74, x + 4, 86, skin[2])
        s.ellipse(x - 3, 84, x + 12, 91, leather[1]); s.ellipse(x - 2, 84, x + 8, 89, leather[3])
    # belly body
    s.ellipse(26, 40, 72, 80, skin[1])
    s.ellipse(26, 40, 68, 76, skin[2], only="opaque")
    s.ellipse(29, 44, 60, 70, skin[3], only="opaque")
    s.ellipse(33, 48, 50, 62, skin[4], only="opaque")
    s.ellipse(34, 50, 46, 58, skin[5], only="opaque")                 # belly highlight
    s.ellipse(52, 52, 74, 82, skin[0], only=skin[1])                  # shadow side
    s.ellipse(40, 38, 64, 50, skin[1], only="opaque")                 # chin cast shadow on the chest
    # belt with a gold buckle
    s.rect(26, 64, 72, 69, leather[2], only="opaque"); s.line(26, 64, 72, 64, leather[4], only="opaque")
    s.rect(44, 62, 53, 71, gold[3]); s.rect(46, 64, 51, 69, leather[1]); s.line(44, 62, 53, 62, gold[5])
    # arms
    s.ellipse(17, 46, 33, 72, skin[1]); s.ellipse(18, 47, 30, 66, skin[3], only="opaque"); s.ellipse(19, 48, 25, 58, skin[4], only="opaque")
    s.ellipse(24, 62, 33, 72, skin[0], only=skin[1])
    s.ellipse(20, 66, 32, 76, skin[2]); s.ellipse(21, 67, 28, 72, skin[4], only="opaque")   # left fist
    s.ellipse(66, 44, 80, 66, skin[1]); s.ellipse(67, 45, 76, 60, skin[2], only="opaque"); s.ellipse(68, 46, 73, 54, skin[3], only="opaque")
    # head with big ears
    s.polygon([(28, 20), (6, 10), (12, 26), (30, 36)], skin[2])       # left ear (broad, pointed)
    s.polygon([(26, 22), (11, 14), (15, 25), (28, 31)], skin[4], only="opaque")
    s.polygon([(24, 24), (15, 17), (18, 24)], "#e89a9a", only="opaque")   # inner ear
    s.polygon([(68, 20), (90, 10), (84, 26), (66, 36)], skin[1])      # right ear (shadow side)
    s.polygon([(70, 22), (85, 14), (81, 24), (68, 31)], skin[2], only="opaque")
    s.polygon([(72, 24), (81, 17), (78, 24)], "#b86a78", only="opaque")
    s.ellipse(26, 16, 70, 50, skin[1])
    s.ellipse(26, 16, 66, 47, skin[2], only="opaque")
    s.ellipse(29, 18, 58, 40, skin[3], only="opaque")
    s.ellipse(32, 20, 48, 32, skin[4], only="opaque")
    s.ellipse(34, 21, 42, 26, skin[5], only="opaque")
    s.ellipse(52, 30, 72, 52, skin[0], only=skin[1])                  # head shadow side
    # brow, eyes (glowing), nose, grin with a gold tooth
    s.polygon([(33, 28), (46, 31), (46, 33), (33, 31)], skin[0])
    s.polygon([(51, 31), (63, 28), (63, 31), (51, 33)], skin[0])
    for ex in (38, 57):
        s.ellipse(ex - 3, 32, ex + 4, 37, "#1c1a28")
        s.ellipse(ex - 2, 33, ex + 3, 36, eyes); s.px(ex, 34, "#ffffff")
    s.ellipse(44, 34, 53, 42, skin[1]); s.ellipse(45, 35, 51, 40, skin[3], only="opaque"); s.px(46, 36, skin[5])
    s.polygon([(34, 42), (62, 42), (58, 48), (38, 48)], "#3a1a1a")
    s.rect(37, 42, 59, 43, "#f4ecd8"); s.rect(52, 42, 54, 45, gold[4])
    # crown
    s.rect(30, 12, 66, 18, gold[2])
    for x, h in ((30, 8), (39, 12), (48, 15), (57, 12), (66, 8)):
        s.polygon([(x - 3, 13), (x, 13 - h), (x + 3, 13)], gold[3])
        s.px(x, 13 - h, gold[6])
    s.rect(30, 12, 66, 13, gold[5]); s.line(30, 18, 66, 18, gold[1])
    for x, c in ((37, "#e0303a"), (48, "#4f7fe0"), (59, "#38b764")):
        s.rect(x - 2, 14, x + 1, 16, c); s.px(x - 2, 14, "#ffffff")
    # the frozen sausage club over the right shoulder
    s.polygon([(70, 58), (80, 60), (94, 8), (84, 4)], club[2])
    s.polygon([(70, 58), (74, 59), (88, 6), (84, 4)], club[4], only="opaque")
    for y in range(12, 56, 7):
        x = 72 + int((56 - y) * 0.26)
        s.line(x, y, x + 8, y + 2, club[1], only="opaque")
    for x, y in ((85, 12), (80, 30), (76, 44)):
        s.px(x, y, "#ffffff"); s.px(x + 1, y, "#d8f0ff")                # frost glints
    s.ellipse(66, 54, 80, 66, skin[2]); s.ellipse(67, 55, 76, 62, skin[4], only="opaque")   # fist on top
    # rim light (cool) down the right edge of the body/head
    for y in range(20, 84):
        for x in range(95, 0, -1):
            c = s.get(x, y)
            if c and c[3]:
                if y > 36 and x < 80:
                    s.px(x - 1, y, "#9ae8c8", only="opaque")
                break
    selout(s, "#1c1428", "#3a4a2a")
    return s


def main():
    pieces = [
        ("Slime", slime(), os.path.join(ASSETS, "monsters", "mob_slime.png"), 2),
        ("Goblin King", goblin_king(), os.path.join(ASSETS, "monsters", "boss_goblin_king.png"), 2),
        ("Red potion", potion(), os.path.join(ASSETS, "items", "red_potion.png"), 1),
    ]
    for name, sp, _, _ in pieces:
        sp.save_png(os.path.join(HERE, f"{name.lower().replace(' ', '_')}_32.png"))
        sp.stats()
    # Old (16-bit, scaled so it shows at the same size) vs new (32-bit), both at 4x zoom.
    Z = 4
    cells = []
    for name, sp, old_path, _ in pieces:
        new = sp.composite(1)
        old = Image.open(old_path).convert("RGBA") if os.path.exists(old_path) else None
        if name == "Red potion" and old is None:
            old = Image.new("RGBA", (24, 24))
        k = new.width / old.width
        old_big = old.resize((int(old.width * k * Z), int(old.height * k * Z)), Image.NEAREST)
        new_big = new.resize((new.width * Z, new.height * Z), Image.NEAREST)
        cells.append((name, old_big, new_big))
    W = sum(max(o.width, n.width) + 40 for _, o, n in cells) + 20
    H = max(o.height + n.height for _, o, n in cells) + 110
    sheet = Image.new("RGBA", (W, H), (60, 70, 90, 255))
    d = ImageDraw.Draw(sheet)
    x = 20
    for name, old, new in cells:
        d.text((x, 8), f"{name} - 16-bit (old)", fill=(220, 220, 220, 255))
        sheet.alpha_composite(old, (x, 26))
        d.text((x, 40 + old.height), f"{name} - 32-bit (new)", fill=(255, 230, 120, 255))
        sheet.alpha_composite(new, (x, 58 + old.height))
        x += max(old.width, new.width) + 40
    sheet.save(os.path.join(HERE, "compare.png"))
    # 1x strip = how big they really are on screen
    one = Image.new("RGBA", (360, 110), (60, 70, 90, 255))
    ox = 10
    for _, sp, _, _ in pieces:
        im = sp.composite(1)
        one.alpha_composite(im, (ox, 100 - im.height))
        ox += im.width + 20
    one.save(os.path.join(HERE, "actual_size.png"))
    print("OK pilot")


if __name__ == "__main__":
    main()
