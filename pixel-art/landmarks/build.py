#!/usr/bin/env python3
"""
Map pins (docs/STORY.md §5, MASTER_SPEC §10) — every pin is the PLACE it stands for, so players
can tell a convenience store from a station at a glance (admins name pins after real places):

- Gates: the building/object itself with the rift opening in its doorway.
    open   = 4-frame strip, the doorway is a living rift (pixel layer: cyan/magenta glitch;
             myth layer: golden light; world boss: gold + leaf sparks) with bits drifting up
    sealed = same building, doorway shut by three [ระบบ] seal bars and a lock
  Kinds: CONVENIENCE, MALL, FUEL, STATION (pixel layer) · TEMPLE, MUSEUM (myth) · PARK (world boss).
  Rank is not baked in — the game prints the rank chip + name under every pin.
- Services: MARKET (stall), HOSPITAL (clinic with a green cross), SANCTUARY (open pavilion with a
  light column — no faith symbols), HOME (the player's house).

    python pixel-art/landmarks/build.py

32-bit (2026-09-26, MASTER_SPEC §5C): shapes are authored on the old grid and re-rasterised at
2x by kit2x.Canvas2x; the rift / seal in the doorway are drawn natively at 2x; every piece then
gets a bevel pass (lit top / shaded bottom edge per panel), a cool rim light and the dark outline.
Frames: gates 112x136 (park 128x160), services 96x104, home 80x100.

Outputs apps/game/public/assets/landmarks/*.png (1x; stale files removed) and preview.png here.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite, ramp  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

sys.path.insert(0, os.path.join(ROOT, "pixel-art"))
from kit2x import K, Canvas2x, bevel, rim  # noqa: E402

OUT = os.path.join(ROOT, "apps", "game", "public", "assets", "landmarks")
INK = "#0c0818"
FRAMES = 4
GW, GH = 56, 68          # gate frame
PW, PH = 64, 80          # park (world boss) frame
GATES = ["CONVENIENCE", "MALL", "FUEL", "STATION", "TEMPLE", "MUSEUM", "PARK"]
LAYER = {"CONVENIENCE": "pixel", "MALL": "pixel", "FUEL": "pixel", "STATION": "pixel",
         "TEMPLE": "myth", "MUSEUM": "myth", "PARK": "world"}

SEAL = "#4fd8ff"
SEAL_D = "#1c2a50"
GOLD = ramp("#f2c230", 5, hue_shift=22)


def R(base, n=5, hs=16):
    return ramp(base, n, hue_shift=hs)


def ground(s, cx, y, rx, col="#3a3450"):
    """Soft contact shadow under a building."""
    s.ellipse(cx - rx, y - 2, cx + rx, y + 1, col)


GLASS = {"#8fd8ff", "#6ab8f0", "#8ae8ff"}


def glass(s):
    """Diagonal reflection streaks across every window pane."""
    img = s._img()
    w, h = img.size
    px = img.load()
    cols = {tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in GLASS}
    for y in range(h):
        for x in range(w):
            if px[x, y][3] and px[x, y][:3] in cols and (x + y) % 11 in (0, 1):
                px[x, y] = (236, 250, 255, 255)


def finish(c, outline=INK, bevel_it=True):
    """32-bit pass on a Canvas2x piece: bevel every panel, cool rim light, dark outline."""
    glass(c.s)
    if bevel_it:
        bevel(c.s, skip=("#7ff0ff", "#ff7ae0", "#ffffff", "#fffbe8"))
    rim(c.s, "#b8d8ff")
    c.s.outline(outline, where="outside")
    return c


# --------------------------------------------------------------------------------------------
# Doorway: open rift or sealed

def door_mask(x0, y0, x1, y1, arch):
    """Pixels of a doorway (optionally arched top)."""
    pts = []
    w = x1 - x0 + 1
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if arch:
                r = w / 2
                cx = x0 + (w - 1) / 2
                if y < y0 + r and (x - cx) ** 2 + (y - (y0 + r)) ** 2 > r * r:
                    continue
            pts.append((x, y))
    return pts


def portal(c, x0, y0, x1, y1, layer, f, arch=False, rise=True):
    """A rift filling the doorway (old-grid box), drawn natively at 2x, animated per frame."""
    s = c.s
    X0, Y0, X1, Y1 = x0 * K, y0 * K, x1 * K + K - 1, y1 * K + K - 1
    pts = door_mask(X0, Y0, X1, Y1, arch)
    cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2 + 2
    rx, ry = max(1, (X1 - X0) / 2), max(1, (Y1 - Y0) / 2)
    for x, y in pts:
        d = math.hypot((x - cx) / rx, (y - cy) / ry)        # 0 centre .. ~1.4 corners
        ang = math.atan2(y - cy, x - cx)
        if layer == "pixel":
            ring = int(d * 7 - f * 1.75 + ang * 0.9) % 5      # a spiralling glitch vortex
            col = ["#2a1860", "#12082e", "#3a1a78", "#0a0620", "#4a2a98"][ring]
            if d < 0.22:
                col = "#ffffff"
            elif d < 0.38:
                col = "#ff7ae0" if (x // 2 + y // 2 + f) % 2 else "#7ff0ff"
            elif (x * 7 + (y + f * 4) * 13) % 29 == 0:
                col = "#7ff0ff" if (x + f) % 2 else "#ff7ae0"
        else:
            ring = int(d * 6 + f * 1.5 - ang * 0.6) % 4
            col = "#ffffff" if d < 0.18 else "#fffbe8" if d < 0.32 else [GOLD[4], GOLD[3], "#ffe89a", GOLD[2]][ring] if d < 0.92 else GOLD[1]
            if layer == "world" and (x * 5 + y * 3 + f * 11) % 31 == 0:
                col = "#b6f28c"
        s.px(x, y, col)
    for yy in range(Y0, Y1 + 1):                             # glowing rim of the doorway
        row = [x for x, y in pts if y == yy]
        if row:
            s.px(min(row), yy, "#ff7ae0" if layer == "pixel" else "#fff6c8")
            s.px(max(row), yy, "#7ff0ff" if layer == "pixel" else GOLD[3])
    if rise:                                                  # bits leaving the rift and drifting up
        for k in range(8):
            xx = int(cx) + [-8, 6, -2, 10, -12, 3, -6, 8][k] + (2 if f % 2 and k % 2 else 0)
            yy = Y0 - 3 - ((k * 7 + f * 6) % 26)
            size = 2 if k % 3 == 0 else 1
            if layer == "pixel":
                col = "#7ff0ff" if k % 2 else "#ff7ae0"
            else:
                col = "#fff6c8" if k % 2 else ("#b6f28c" if layer == "world" else GOLD[3])
            s.rect(xx, yy, xx + size - 1, yy + size - 1, col)


def seal(c, x0, y0, x1, y1, arch=False):
    """Doorway shut by the [ระบบ]: dark slab, three glowing seal bars with bracket ends, a lock (2x)."""
    s = c.s
    X0, Y0, X1, Y1 = x0 * K, y0 * K, x1 * K + K - 1, y1 * K + K - 1
    for x, y in door_mask(X0, Y0, X1, Y1, arch):
        s.px(x, y, "#34344a" if (x // 3 + y // 5) % 4 == 0 else "#2a2a38")
    h = Y1 - Y0
    for k in range(3):
        y = Y0 + (k + 1) * h // 4 - 2
        s.rect(X0 - 2, y, X1 + 2, y + 5, SEAL_D)
        s.line(X0 - 2, y + 2, X1 + 2, y + 2, SEAL)
        s.line(X0 - 2, y + 3, X1 + 2, y + 3, "#c8f6ff")
        for bx in (X0 - 4, X1 + 2):
            s.rect(bx, y - 2, bx + 2, y + 7, SEAL)
            s.line(bx + 1, y - 2, bx + 1, y + 7, "#c8f6ff")
    mx, my = (X0 + X1) // 2, Y0 + h // 2
    s.rect(mx - 5, my - 3, mx + 5, my + 6, "#0c1226")
    s.ellipse(mx - 3, my - 7, mx + 3, my + 1, "#f2c230", fill=False)                   # shackle
    s.rect(mx - 4, my - 2, mx + 4, my + 5, "#f2c230")
    s.rect(mx - 4, my - 2, mx - 2, my + 5, "#fff1a8")
    s.rect(mx, my + 1, mx, my + 3, "#0c1226")


def doorway(s, box, layer, f, arch=False):
    """f = frame index for an open gate, None for sealed."""
    if f is None:
        seal(s, *box, arch=arch)
    else:
        portal(s, *box, layer, f, arch=arch)


# --------------------------------------------------------------------------------------------
# Gate buildings (each takes f: frame for open, None for sealed)

def convenience(f):
    s = Canvas2x(GW, GH)
    wall = R("#e8e4d8", hs=8)
    ground(s, 28, GH - 4, 24)
    s.rect(7, 30, 48, GH - 5, wall[2]); s.rect(7, 30, 9, GH - 5, wall[3]); s.rect(46, 30, 48, GH - 5, wall[1])
    # sign band: generic "open 24 hours" corner-shop sign (teal + basket + 24) — no real brand colours
    s.rect(5, 18, 50, 29, "#1fa6a0"); s.rect(5, 18, 50, 19, "#6ae0c8"); s.rect(5, 27, 50, 28, "#f2c230")
    s.rect(10, 22, 16, 26, "#ffffff"); s.px(11, 21, "#ffffff"); s.px(15, 21, "#ffffff"); s.line(12, 20, 14, 20, "#ffffff")   # shopping bag
    s.px(13, 23, "#f2c230")
    for gx, glyph in ((33, ("111", "001", "111", "100", "111")), (37, ("101", "101", "111", "001", "001"))):   # "24"
        for gy, row in enumerate(glyph):
            for i, ch in enumerate(row):
                if ch == "1":
                    s.px(gx + i, 21 + gy, "#ffffff")
    s.rect(4, 29, 51, 30, "#5a5270")                                  # roof lip shadow
    for x0 in (10, 35):                                               # glass fronts with shelves
        s.rect(x0, 36, x0 + 10, GH - 9, "#8fd8ff"); s.rect(x0, 36, x0 + 10, 37, "#c8f6ff")
        for y, cols in ((42, ("#e0303a", "#f2c230", "#38b764")), (48, ("#4f7fe0", "#f28a2a", "#e8507a"))):
            s.line(x0, y + 2, x0 + 10, y + 2, "#5a6a88")
            for i in range(5):
                s.rect(x0 + 1 + i * 2, y, x0 + 1 + i * 2, y + 1, cols[i % 3])
    s.rect(9, GH - 8, 46, GH - 5, wall[1])                            # kerb
    doorway(s, (23, 37, 32, GH - 6), "pixel", f)
    s.rect(22, 36, 33, 36, "#5a5270")                                 # door frame
    return finish(s)


def mall(f):
    s = Canvas2x(GW, GH)
    wall = R("#c8c0e0", hs=14)
    ground(s, 28, GH - 4, 27)
    s.rect(2, 14, 53, GH - 5, wall[2]); s.rect(2, 14, 4, GH - 5, wall[3]); s.rect(51, 14, 53, GH - 5, wall[1])
    s.rect(1, 11, 54, 14, wall[4]); s.rect(1, 14, 54, 15, wall[0])   # parapet
    for fy in (18, 32):                                               # two floors of glass
        for i in range(6):
            x = 6 + i * 8
            s.rect(x, fy, x + 5, fy + 9, "#6ab8f0"); s.rect(x, fy, x + 5, fy + 1, "#c8f6ff"); s.px(x + 4, fy + 3, "#ffffff")
    s.line(2, 30, 53, 30, wall[0]); s.line(2, 44, 53, 44, wall[0])
    # sale banner hanging on the right (pink, like the Sale Queen's)
    s.rect(44, 17, 50, 38, "#e8507a"); s.rect(45, 20, 49, 21, "#ffffff"); s.rect(45, 26, 49, 27, "#ffffff"); s.rect(45, 32, 49, 33, "#ffd23a")
    s.polygon([(44, 38), (47, 41), (50, 38)], "#e8507a")
    # rooftop flags
    for x, c in ((10, "#e8507a"), (28, "#ffd23a"), (45, "#4f7fe0")):
        s.line(x, 3, x, 11, "#3a3f58"); s.polygon([(x + 1, 3), (x + 6, 5), (x + 1, 7)], c)
    s.rect(15, 46, 40, 47, wall[0])                                  # entrance canopy
    s.rect(14, 45, 41, 46, "#e8507a")
    doorway(s, (20, 48, 35, GH - 6), "pixel", f)
    s.line(27, 48, 27, GH - 6, "#3a3f58") if f is None else None
    return finish(s)


def fuel(f):
    s = Canvas2x(GW, GH)
    ground(s, 28, GH - 4, 26)
    # canopy with red / white stripes
    s.rect(2, 16, 53, 24, "#f4f4f4"); s.rect(2, 16, 53, 18, "#e0303a"); s.rect(2, 21, 53, 22, "#e0303a")
    s.rect(2, 24, 53, 25, "#5a5270")
    for x in (8, 45):                                                 # pillars
        s.rect(x, 25, x + 2, GH - 6, "#d8d8e8"); s.line(x, 25, x, GH - 6, "#ffffff"); s.line(x + 2, 25, x + 2, GH - 6, "#8a8aa8")
    # pump on the left
    s.rect(13, 38, 21, GH - 6, "#e0303a"); s.rect(13, 38, 14, GH - 6, "#ff6a5a")
    s.rect(15, 41, 19, 45, "#1c2a50"); s.rect(16, 42, 18, 43, "#7ff0ff")
    s.rect(12, GH - 7, 22, GH - 5, "#5a5270")
    s.line(21, 47, 24, 50, "#1c1a28"); s.line(24, 50, 24, 56, "#1c1a28"); s.rect(23, 56, 25, 57, "#3a3f58")   # hose
    s.rect(11, 36, 23, 37, "#8a8aa8")
    # the rift stands under the canopy, right of the pump
    doorway(s, (29, 32, 41, GH - 6), "pixel", f, arch=True)
    return finish(s)


def station(f):
    s = Canvas2x(GW, GH)
    wall = R("#d8b890", hs=12)
    roof = R("#4a6aa8", hs=18)
    ground(s, 28, GH - 4, 27)
    s.rect(6, 30, 49, GH - 9, wall[2]); s.rect(6, 30, 8, GH - 9, wall[3]); s.rect(47, 30, 49, GH - 9, wall[1])
    s.polygon([(3, 31), (28, 12), (52, 31)], roof[2]); s.polygon([(3, 31), (28, 12), (28, 31)], roof[3], only="opaque")
    s.line(3, 31, 52, 31, roof[0])
    s.circle(28, 23, 4, "#f4f4f4", fill=True); s.circle(28, 23, 4, "#3a3f58")                 # clock
    s.line(28, 23, 28, 20, "#1c1a28"); s.line(28, 23, 30, 23, "#1c1a28")
    for x in (11, 39):                                                # side windows
        s.rect(x, 36, x + 5, 42, "#ffe08a"); s.rect(x, 36, x + 5, 36, "#fff6c8"); s.line(x + 2, 36, x + 2, 42, wall[0])
    # rails in front
    s.rect(1, GH - 9, 54, GH - 7, "#8a6a4a")
    for x in range(2, 54, 4):
        s.rect(x, GH - 10, x + 1, GH - 6, "#5a3a24")
    s.line(1, GH - 9, 54, GH - 9, "#b8c0d8"); s.line(1, GH - 7, 54, GH - 7, "#b8c0d8")
    # blue platform sign on a post
    s.line(51, 34, 51, GH - 10, "#3a3f58"); s.rect(47, 30, 55, 34, "#2f6ad0"); s.line(48, 32, 54, 32, "#ffffff")
    doorway(s, (22, 34, 33, GH - 11), "pixel", f, arch=True)
    return finish(s)


def temple(f):
    """Lanna viharn: white walls, two-tier red roof with gold eaves and upturned finials, naga stairs."""
    s = Canvas2x(GW, GH)
    wall = R("#f2ece0", hs=8)
    roof = R("#c8402a", hs=16)
    ground(s, 28, GH - 4, 26)
    s.rect(10, 38, 45, GH - 7, wall[2]); s.rect(10, 38, 12, GH - 7, wall[3]); s.rect(43, 38, 45, GH - 7, wall[1])
    s.rect(7, GH - 8, 48, GH - 5, wall[1])                            # plinth
    # lower tier
    s.polygon([(3, 40), (28, 22), (52, 40)], roof[2]); s.polygon([(3, 40), (28, 22), (28, 40)], roof[3], only="opaque")
    s.line(3, 40, 52, 40, GOLD[3]); s.line(3, 39, 28, 21, GOLD[2]); s.line(52, 39, 28, 21, GOLD[2])
    # upper tier
    s.polygon([(12, 27), (28, 9), (44, 27)], roof[2]); s.polygon([(12, 27), (28, 9), (28, 27)], roof[3], only="opaque")
    s.line(12, 27, 44, 27, GOLD[3]); s.line(12, 26, 28, 8, GOLD[2]); s.line(44, 26, 28, 8, GOLD[2])
    for x, y, d in ((3, 40, -1), (52, 40, 1), (12, 27, -1), (44, 27, 1)):   # upturned eave ends (hang hong)
        s.px(x + d, y - 1, GOLD[3]); s.px(x + 2 * d, y - 2, GOLD[4])
    s.line(28, 8, 28, 4, GOLD[3]); s.px(27, 4, GOLD[4]); s.px(29, 3, GOLD[4])  # cho fa
    s.polygon([(22, 32), (28, 28), (34, 32)], GOLD[3])                # gable ornament
    # naga balustrades flanking the stairs
    for x, d in ((17, -1), (38, 1)):
        s.rect(x, GH - 12, x + 1, GH - 6, "#3aa06a"); s.px(x + (0 if d < 0 else 1), GH - 13, GOLD[3]); s.px(x + (0 if d < 0 else 1) + d, GH - 14, GOLD[4])
    s.rect(20, GH - 7, 35, GH - 5, wall[0])                           # steps
    doorway(s, (23, 44, 32, GH - 8), "myth", f, arch=True)
    return finish(s)


def museum(f):
    """Ancient ruin / museum: weathered stone colonnade under a cracked pediment, one column
    broken, moss in the joints; the golden rift glows between the middle columns."""
    s = Canvas2x(GW, GH)
    stone = R("#b8ae98", hs=10)
    ground(s, 28, GH - 4, 26)
    # steps
    s.rect(3, GH - 9, 52, GH - 5, stone[1]); s.line(3, GH - 9, 52, GH - 9, stone[3])
    s.rect(6, GH - 12, 49, GH - 9, stone[2]); s.line(6, GH - 12, 49, GH - 12, stone[4])
    # entablature + pediment (right corner broken off)
    s.rect(5, 22, 50, 27, stone[2]); s.line(5, 22, 50, 22, stone[4]); s.line(5, 27, 50, 27, stone[0])
    s.polygon([(4, 22), (28, 8), (51, 22)], stone[2])
    s.polygon([(4, 22), (28, 8), (28, 22)], stone[3], only="opaque")
    s.polygon([(10, 20), (28, 12), (45, 20)], stone[1])                   # tympanum
    s.circle(28, 17, 2, GOLD[3], fill=True)                               # old gilded medallion
    s.polygon([(40, 13), (52, 13), (52, 23), (45, 18)], None)             # broken corner
    s.px(44, 17, stone[0]); s.px(43, 16, stone[0])
    # columns (the right-most is broken)
    for i, x in enumerate((8, 17, 36, 45)):
        top = 28 if i < 3 else 41
        s.rect(x, top, x + 3, GH - 13, stone[2]); s.line(x, top, x, GH - 13, stone[4]); s.line(x + 3, top, x + 3, GH - 13, stone[0])
        s.line(x + 2, top, x + 2, GH - 13, stone[1])
        s.rect(x - 1, GH - 14, x + 4, GH - 13, stone[3])                  # base
        if i < 3:
            s.rect(x - 1, 28, x + 4, 29, stone[3])                        # capital
        else:
            s.px(x, top - 1, stone[2]); s.px(x + 2, top - 1, stone[2])    # jagged break
    s.rect(47, GH - 8, 50, GH - 6, stone[2]); s.line(47, GH - 8, 50, GH - 8, stone[4])   # fallen drum
    s.line(20, 36, 18, 44, stone[0]); s.line(14, 23, 17, 26, stone[0])  # cracks
    for x, y in ((9, 45), (37, 50), (18, 27), (46, 44), (6, GH - 12), (30, GH - 9), (48, GH - 9)):
        s.px(x, y, "#58a04a")
    s.px(10, 46, "#3a8040"); s.px(38, 51, "#3a8040")
    doorway(s, (23, 33, 32, GH - 13), "myth", f, arch=True)
    return finish(s)


def park(f):
    """Ancient park tree: huge canopy, a golden rift in the hollow of its trunk, world-boss crown above."""
    s = Canvas2x(PW, PH)
    leaf = R("#3aa04a", hs=20)
    bark = R("#8a5a34", hs=14)
    ground(s, 32, PH - 4, 26, "#2a4a30")
    # roots + trunk
    s.polygon([(20, PH - 5), (26, 44), (38, 44), (44, PH - 5)], bark[2])
    s.polygon([(20, PH - 5), (26, 44), (31, 44), (29, PH - 5)], bark[3], only="opaque")
    s.line(14, PH - 5, 24, PH - 9, bark[1]); s.line(50, PH - 5, 40, PH - 9, bark[1])
    # canopy: clustered circles, light from top-left
    for cx, cy, r in ((32, 30, 16), (17, 34, 11), (47, 34, 11), (22, 22, 11), (42, 22, 11), (32, 15, 11)):
        s.circle(cx, cy, r, leaf[1], fill=True)
    for cx, cy, r in ((30, 27, 13), (16, 31, 8), (45, 31, 8), (21, 19, 8), (40, 19, 8), (31, 13, 8)):
        s.circle(cx, cy, r, leaf[2], fill=True, only="opaque")
    for cx, cy, r in ((27, 22, 7), (18, 26, 4), (36, 15, 4), (27, 11, 4)):
        s.circle(cx, cy, r, leaf[3], fill=True, only="opaque")
    for x, y in ((24, 17), (30, 9), (15, 24), (40, 12), (33, 20)):
        s.rect(x, y, x + 1, y, leaf[4], only="opaque")
    for x, y in ((10, 40), (54, 40), (25, 44), (40, 45)):             # leaf edge tufts
        s.rect(x, y, x + 1, y + 1, leaf[1])
    # crown
    top = 1
    for x, y in ((25, top + 3), (32, top), (39, top + 3)):
        s.polygon([(x - 2, y + 5), (x, y), (x + 2, y + 5)], GOLD[3])
    s.rect(23, top + 6, 41, top + 7, GOLD[2]); s.px(32, top + 6, "#e0303a")
    doorway(s, (27, 52, 37, PH - 7), "world", f, arch=True)
    return finish(s)


BUILD = {"CONVENIENCE": convenience, "MALL": mall, "FUEL": fuel, "STATION": station,
         "TEMPLE": temple, "MUSEUM": museum, "PARK": park}


# --------------------------------------------------------------------------------------------
# Places without a gate

def market():
    """Market stall: scalloped striped awning, fruit & veg baskets on a wooden counter."""
    s = Canvas2x(48, 52)
    wood = R("#a0703a", hs=14)
    ground(s, 24, 48, 21)
    for x in (6, 40):
        s.rect(x, 18, x + 1, 47, wood[1])
    s.rect(4, 32, 43, 38, wood[2]); s.rect(4, 32, 43, 33, wood[3]); s.line(4, 38, 43, 38, wood[0])   # counter
    s.rect(6, 39, 41, 47, wood[1])
    for x in range(8, 40, 6):
        s.line(x, 40, x, 47, wood[0])
    for bx, cols in ((7, ("#e0303a", "#ff6a5a")), (16, ("#f2c230", "#ffe08a")), (25, ("#58d06a", "#9ae88a")), (34, ("#f28a2a", "#ffc070"))):
        s.ellipse(bx, 29, bx + 7, 33, "#c8a060"); s.line(bx + 1, 31, bx + 6, 31, "#8a5a34")
        for k, (dx, dy) in enumerate(((2, 27), (5, 27), (3, 25))):
            s.circle(bx + dx, dy, 1, cols[k % 2], fill=True)
    # awning
    s.rect(2, 10, 45, 17, "#f4f4f4")
    for i in range(0, 44, 8):
        s.rect(2 + i, 10, 5 + i, 17, "#e0303a")
    for i in range(0, 44, 4):                                          # scallops
        s.circle(4 + i, 18, 2, "#e0303a" if (i // 4) % 2 == 0 else "#f4f4f4", fill=True)
    s.rect(2, 8, 45, 9, "#b0283a")
    s.line(24, 18, 24, 21, "#3a3f58"); s.circle(24, 23, 2, "#f2c230", fill=True)     # lantern
    return finish(s)


def hospital():
    """Clinic: white building, blue windows, green cross sign (not the protected red cross)."""
    s = Canvas2x(48, 52)
    wall = R("#eef2f6", hs=10)
    ground(s, 24, 48, 21)
    s.rect(5, 18, 42, 46, wall[2]); s.rect(5, 18, 7, 46, wall[3]); s.rect(40, 18, 42, 46, wall[1])
    s.rect(3, 15, 44, 18, "#8ab0d0"); s.line(3, 15, 44, 15, "#c8e0f0")
    for x in (10, 32):
        for y in (22, 31):
            s.rect(x, y, x + 5, y + 5, "#6ab8f0"); s.px(x + 1, y + 1, "#c8f6ff")
    s.rect(19, 34, 28, 46, "#6ab8f0"); s.line(23, 34, 23, 46, "#3a6a98"); s.rect(19, 34, 28, 35, "#c8f6ff")   # glass doors
    s.circle(23, 8, 7, "#ffffff", fill=True); s.circle(23, 8, 7, "#38a060")                    # sign
    s.rect(21, 3, 25, 13, "#38b764"); s.rect(18, 6, 28, 10, "#38b764")
    s.line(23, 15, 23, 15, "#3a3f58")
    return finish(s)


def sanctuary():
    """Open pavilion (sala) with a soft light column inside, lotus ring — no faith symbols."""
    s = Canvas2x(44, 54)
    roof = R("#6a7ab0", hs=16)
    s.ellipse(2, 44, 41, 52, "#e6d69a"); s.ellipse(5, 45, 38, 51, "#fff6d0")
    for x in range(12, 32):                                            # light column
        a = 1 - abs(x - 21.5) / 10
        for y in range(18, 49):
            if a > 0.75:
                s.px(x, y, "#fffbe8")
            elif a > 0.5:
                s.px(x, y, "#fff2c0")                                      # soft solid bands, no dither (32-bit rule)
            elif a > 0.3 and y % 6 < 3:
                s.px(x, y, "#f6e6a8")
    for x in (7, 35):                                                  # posts
        s.rect(x, 20, x + 1, 47, "#c8b89a"); s.px(x, 20, "#f4ecd8")
    s.polygon([(2, 21), (22, 6), (41, 21)], roof[2]); s.polygon([(2, 21), (22, 6), (22, 21)], roof[3], only="opaque")
    s.line(2, 21, 41, 21, "#f2c230"); s.px(1, 20, "#f2c230"); s.px(42, 20, "#f2c230")
    s.rect(4, 46, 39, 48, "#c8b89a"); s.line(4, 46, 39, 46, "#f4ecd8")                          # floor
    for k in range(12):
        a = k / 12 * math.tau
        x, y = round(21.5 + math.cos(a) * 18), round(49 + math.sin(a) * 3)
        s.px(x, y, "#58d06a"); s.px(x, y - 1, "#9ae88a")
    for x, y in ((4, 12), (39, 14), (11, 30), (33, 34)):
        s.px(x, y, "#fff6c8")
    return finish(s, "#8a7a4a", bevel_it=False)


def home():
    s = Canvas2x(40, 50)
    wall = R("#f2e2bf", hs=10)
    roof = R("#c8502a", hs=16)
    s.ellipse(4, 42, 35, 48, "#f2a02a"); s.ellipse(8, 43, 31, 47, "#ffd08a")
    s.rect(9, 24, 30, 44, wall[2]); s.rect(9, 24, 12, 44, wall[3]); s.rect(27, 24, 30, 44, wall[1])
    s.polygon([(5, 25), (20, 11), (34, 25)], roof[2]); s.polygon([(5, 25), (20, 11), (20, 25)], roof[3], only="opaque")
    s.rect(17, 33, 23, 44, "#7a4a22"); s.px(22, 38, "#f2c230")
    for x in (11, 25):
        s.rect(x, 28, x + 3, 31, "#ffe08a"); s.px(x, 28, "#fff6c8")
    s.line(29, 2, 29, 16, "#3a3f58")
    s.polygon([(30, 2), (38, 4), (30, 8)], "#4f7fe0"); s.px(31, 4, "#a8c4ff")
    return finish(s)


# --------------------------------------------------------------------------------------------

def strip(frames):
    ims = [fr.composite(1) for fr in frames]
    w, h = ims[0].width, ims[0].height
    im = Image.new("RGBA", (w * len(ims), h), (0, 0, 0, 0))
    for i, fr in enumerate(ims):
        im.alpha_composite(fr, (i * w, 0))
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    files = {}
    for k in GATES:
        files[f"gate_{k}"] = strip([BUILD[k](f) for f in range(FRAMES)])
        files[f"sealed_{k}"] = BUILD[k](None).composite(1).copy()
    files["MARKET"] = market().composite(1).copy()
    files["HOSPITAL"] = hospital().composite(1).copy()
    files["SANCTUARY"] = sanctuary().composite(1).copy()
    files["HOME"] = home().composite(1).copy()
    for name, im in files.items():
        im.save(os.path.join(OUT, f"{name}.png"))
    for fn in os.listdir(OUT):                                   # remove the old rift-only pins
        if fn.endswith(".png") and fn[:-4] not in files:
            os.remove(os.path.join(OUT, fn))

    # Review sheet: open frame 0 / sealed per gate, then the services. Also a 1x row (map size).
    Z = 2
    def fw(k):
        return (PW if k == "PARK" else GW) * K
    rows = [
        [files[f"gate_{k}"].crop((0, 0, fw(k), files[f"gate_{k}"].height)) for k in GATES],
        [files[f"sealed_{k}"] for k in GATES],
        [files["MARKET"], files["HOSPITAL"], files["SANCTUARY"], files["HOME"]],
    ]
    cell = PW * K * Z + 12
    one_x = rows[0] + rows[2]
    one_h = max(i.height for i in one_x) * 2 + 8
    height = sum(max(i.height for i in row) * Z + 20 for row in rows) + one_h + 8
    sheet = Image.new("RGBA", (len(GATES) * cell, height), (176, 214, 150, 255))
    d = ImageDraw.Draw(sheet)
    y = 4
    for row in rows:
        rh = max(i.height for i in row) * Z
        for i, im in enumerate(row):
            big = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
            sheet.alpha_composite(big, (i * cell + (cell - big.width) // 2, y + rh - big.height))
        y += rh + 20
    x = 8
    for im in one_x:                                             # 2x — roughly map size on a phone
        big = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
        sheet.alpha_composite(big, (x, y + one_h - 8 - big.height))
        x += big.width + 10
    for i, k in enumerate(GATES):
        d.text((i * cell + 6, 2), k, fill=(28, 26, 40, 255))
    sheet.save(os.path.join(HERE, "preview.png"))

    # animated check: every open gate, frames side by side
    anim = Image.new("RGBA", (FRAMES * (PW * K + 4) * 2, len(GATES) * (PH * K + 4) * 2), (176, 214, 150, 255))
    for r, k in enumerate(GATES):
        st = files[f"gate_{k}"]
        w = st.width // FRAMES
        for fidx in range(FRAMES):
            fr = st.crop((fidx * w, 0, (fidx + 1) * w, st.height)).resize((w * 2, st.height * 2), Image.NEAREST)
            anim.alpha_composite(fr, (fidx * (PW * K + 4) * 2, r * (PH * K + 4) * 2))
    anim.save(os.path.join(HERE, "frames.png"))
    print("OK", len(files), "landmark files")


if __name__ == "__main__":
    main()
