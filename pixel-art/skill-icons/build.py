#!/usr/bin/env python3
"""
Skill icons for Pixel Walker — tiles designed on a 24x24 grid, drawn 32-bit at 48x48 (kit2x
re-raster + bevel on the tile + 2 px ink outline on the motif; 2026-09-26, MASTER_SPEC §5C).
Same family as the item icons and UI kit.
Background tile colour = element, white/light motif on top, gold bolt badge = reactive skill.

    python pixel-art/skill-icons/build.py

Outputs apps/game/public/assets/skills/<skillId>.png (1x) and preview.png (6x) here.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite, ramp  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

sys.path.insert(0, os.path.join(ROOT, "pixel-art"))
from kit2x import K, Canvas2x, bevel  # noqa: E402

OUT = os.path.join(ROOT, "apps", "game", "public", "assets", "skills")
INK = "#1c1a28"
W = "#f6f0e1"      # motif light
W2 = "#cdbf9f"     # motif shade
GOLD = ramp("#f2c230", 4, hue_shift=20)

ELEMENT = {
    "NEUTRAL": "#5d6680", "FIRE": "#b8392a", "WATER": "#2c6bc4", "LIGHTNING": "#b58f12",
    "EARTH": "#7a5a2e", "HOLY": "#c9a95a", "SHADOW": "#4a2f6e",
}


def tile(element, reactive=False):
    s = Canvas2x(24, 24)
    r = ramp(ELEMENT[element], 5, hue_shift=16)
    s.rect(1, 1, 22, 22, r[1])
    s.rect(2, 2, 21, 21, r[2])
    s.line(2, 2, 21, 2, r[3]); s.line(2, 2, 2, 21, r[3])      # lit top-left
    s.line(2, 21, 21, 21, r[0]); s.line(21, 2, 21, 21, r[0])  # shaded bottom-right
    s.line(1, 0, 22, 0, INK); s.line(1, 23, 22, 23, INK); s.line(0, 1, 0, 22, INK); s.line(23, 1, 23, 22, INK)
    for off, col in ((10, r[3]), (13, r[3]), (15, r[4])):          # glassy diagonal sheen, top-left corner (32-bit)
        s.s.line(4, 4 + off, 4 + off, 4, col, only=r[2])
    s.layer("motif")
    return s, r, reactive


def finish(t):
    s, r, reactive = t
    # ink outline around the motif only (motif layer): 2 px so it reads on the coloured tile
    bevel(s.s, light=0.25, dark=0.15, skip=(INK,))
    s.outline(INK, where="outside")
    s.outline(INK, where="outside")
    if reactive:
        s.layer("badge")
        for x, y in ((18, 2), (19, 2), (20, 2), (17, 3), (18, 3), (19, 3), (18, 4), (19, 4), (20, 4), (21, 4), (19, 5), (20, 5), (19, 6)):
            s.px(x, y, GOLD[2])
        s.px(18, 2, GOLD[3]); s.px(17, 3, GOLD[3])
        s.outline(INK, where="outside")
    return s


# --------------------------------------------------------------------------------------------
# Motif helpers (all draw on the current layer)

def sword(s, x0=6, y0=17, n=9, c=W, sh=W2):
    for t in range(n):
        s.px(x0 + t, y0 - t, c); s.px(x0 + t + 1, y0 - t, sh)
    s.px(x0 + n, y0 - n, c)
    for j in (-2, -1, 1, 2):
        s.px(x0 + j, y0 + j, GOLD[2])
    s.px(x0 - 1, y0 + 1, "#7a4a22"); s.px(x0 - 2, y0 + 2, "#7a4a22"); s.px(x0 - 3, y0 + 3, "#7a4a22")


def shield(s, cx=11, top=5, c="#8fb0f0", rim=None):
    rim = rim or GOLD[2]
    s.polygon([(cx - 6, top), (cx + 6, top), (cx + 6, top + 7), (cx, top + 13), (cx - 6, top + 7)], rim)
    s.polygon([(cx - 4, top + 2), (cx + 4, top + 2), (cx + 4, top + 7), (cx, top + 11), (cx - 4, top + 7)], c)
    s.px(cx - 3, top + 3, W); s.px(cx - 3, top + 4, W)


def flame(s, cx, base, h, outer="#ffb347", inner="#fff1a8"):
    s.polygon([(cx - h // 2, base), (cx + h // 2, base), (cx + h // 4, base - h // 2), (cx, base - h), (cx - h // 4, base - h // 2)], outer)
    s.circle(cx, base - 2, h // 2 - 1, outer, fill=True)
    s.polygon([(cx - h // 4, base), (cx + h // 4, base), (cx, base - h // 2)], inner)


def fist(s, x, y, c="#f0c090", sh="#c98f5a"):
    s.rect(x, y, x + 7, y + 6, c)
    for k in range(4):
        s.px(x + 2 * k, y, sh)
    s.rect(x - 2, y + 2, x - 1, y + 5, c)  # thumb
    s.line(x, y + 6, x + 7, y + 6, sh)


def arrow(s, x0, y0, dx, dy, n, c=W, head=GOLD[2]):
    for t in range(n):
        s.px(x0 + dx * t, y0 + dy * t, c)
    hx, hy = x0 + dx * n, y0 + dy * n
    s.px(hx, hy, head); s.px(hx - dx, hy, head); s.px(hx, hy - dy, head)
    s.px(x0 - dx, y0, "#e53935"); s.px(x0, y0 - dy, "#e53935")  # fletching


def star_burst(s, cx, cy, c=GOLD[3]):
    for dx, dy in ((0, -3), (0, 3), (-3, 0), (3, 0), (-2, -2), (2, 2), (2, -2), (-2, 2), (0, -2), (0, 2), (-2, 0), (2, 0), (0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
        s.px(cx + dx, cy + dy, c)


def heart(s, cx, cy, c="#e53955"):
    s.circle(cx - 2, cy - 1, 2, c, fill=True); s.circle(cx + 2, cy - 1, 2, c, fill=True)
    s.polygon([(cx - 4, cy), (cx + 4, cy), (cx, cy + 4)], c); s.px(cx - 3, cy - 2, "#ffb3c0")


# --------------------------------------------------------------------------------------------
# Icons

def basic_attack():
    t = tile("NEUTRAL"); sword(t[0]); return finish(t)


def quick_strike():
    t = tile("NEUTRAL"); s = t[0]
    for off in (0, 5):
        for k in range(10):
            s.px(4 + k + off, 18 - k - (k // 4), W)
        s.px(4 + off, 19, W2)
    return finish(t)


def power_smash():
    t = tile("NEUTRAL"); s = t[0]
    s.rect(9, 4, 17, 9, "#9aa4b0"); s.rect(9, 4, 17, 5, "#d8e0ec")       # hammer head
    s.line(12, 10, 7, 18, "#a8743e"); s.line(13, 10, 8, 18, "#7a4a22")    # handle
    star_burst(s, 16, 16)
    return finish(t)


def stone_throw():
    t = tile("EARTH"); s = t[0]
    s.circle(15, 12, 4, "#9a9486", fill=True); s.circle(14, 11, 2, "#cfc8b8", fill=True); s.px(17, 14, "#6b655a")
    for y, x0 in ((9, 5), (12, 3), (15, 6)):  # dashed speed lines behind the stone
        s.line(x0, y, x0 + 2, y, W2); s.px(x0 + 4, y, W2)
    return finish(t)


def sweep_kick():
    t = tile("NEUTRAL"); s = t[0]
    s.polygon([(4, 12), (10, 12), (12, 15), (19, 16), (19, 19), (4, 19)], "#f4f4ee")
    s.line(4, 19, 19, 19, "#4a4f58"); s.line(6, 16, 13, 16, "#e53935")
    for k in range(6):  # sweeping arc above the kick
        s.px(6 + k * 2, 8 - (1 if 1 <= k <= 4 else 0), W2)
        s.px(7 + k * 2, 8 - (1 if 1 <= k <= 4 else 0), W2)
    s.px(19, 9, W2); s.px(19, 10, W2)
    return finish(t)


def dirty_trick():
    t = tile("SHADOW"); s = t[0]
    s.circle(9, 13, 4, "#6fcf4a", fill=True); s.circle(15, 11, 3, "#6fcf4a", fill=True); s.circle(13, 16, 3, "#4fa832", fill=True)
    s.px(8, 11, "#c8f5a8"); s.px(14, 9, "#c8f5a8")
    s.rect(9, 12, 10, 13, INK); s.px(13, 11, INK)
    for x, y in ((5, 6), (18, 5), (19, 17), (4, 18)):
        s.px(x, y, "#b88fe0")
    return finish(t)


def fire_spark():
    t = tile("FIRE"); s = t[0]
    flame(s, 12, 18, 10)
    s.px(6, 7, "#fff1a8"); s.px(18, 8, "#fff1a8"); s.px(17, 5, "#ffb347")
    return finish(t)


def aqua_splash():
    t = tile("WATER"); s = t[0]
    s.polygon([(12, 4), (16, 11), (8, 11)], "#bfe6ff"); s.circle(12, 13, 4, "#bfe6ff", fill=True)
    s.px(10, 12, W); s.px(10, 13, W)
    for x, y in ((5, 16), (6, 18), (19, 15), (18, 18), (4, 12), (20, 11)):
        s.px(x, y, "#8fc8ff")
    return finish(t)


def war_cry():
    t = tile("FIRE"); s = t[0]
    s.rect(10, 5, 13, 14, W); s.rect(10, 17, 13, 19, W)                  # "!"
    for k in range(3):
        s.px(5 - k, 8 + 3 * k, W2); s.px(18 + k, 8 + 3 * k, W2)
        s.px(6 - k, 9 + 3 * k, W2); s.px(17 + k, 9 + 3 * k, W2)
    return finish(t)


def focus():
    t = tile("NEUTRAL"); s = t[0]
    s.ellipse(4, 8, 19, 16, W); s.circle(12, 12, 3, "#4f7fe0", fill=True); s.circle(12, 12, 1, INK, fill=True)
    s.px(11, 11, W)
    s.line(12, 3, 12, 5, GOLD[3]); s.line(12, 19, 12, 21, GOLD[3])
    return finish(t)


def first_aid():
    t = tile("NEUTRAL"); s = t[0]
    # green cross: the red cross is a protected emblem (same rule as the hospital pin)
    s.rect(5, 5, 18, 18, W); s.rect(10, 7, 13, 16, "#2e9e52"); s.rect(7, 10, 16, 13, "#2e9e52")
    s.line(5, 18, 18, 18, W2); s.line(18, 5, 18, 18, W2)
    return finish(t)


def guard_stance():
    t = tile("NEUTRAL"); shield(t[0], 12, 5); return finish(t)


def counter_jab():
    t = tile("NEUTRAL", True); s = t[0]
    fist(s, 9, 9)
    s.line(4, 17, 10, 17, W); s.px(5, 16, W); s.px(5, 18, W); s.px(4, 16, W); s.px(4, 18, W)  # return arrow
    return finish(t)


def lucky_dodge():
    t = tile("NEUTRAL", True); s = t[0]
    g = "#58c23a"
    for cx, cy in ((9, 8), (15, 8), (9, 14), (15, 14)):
        s.circle(cx, cy, 3, g, fill=True)
    s.circle(12, 11, 2, "#b6f28c", fill=True)
    s.line(12, 14, 14, 20, "#2e8a24")
    return finish(t)


def second_wind():
    t = tile("NEUTRAL", True); s = t[0]
    for r0, y in ((6, 8), (4, 13)):
        s.line(4, y, 4 + r0 + 6, y, W)
        s.px(4 + r0 + 7, y - 1, W); s.px(4 + r0 + 7, y - 2, W); s.px(4 + r0 + 6, y - 3, W)
    heart(s, 15, 16)
    return finish(t)


def shield_bash():
    t = tile("NEUTRAL"); shield(t[0], 10, 5); star_burst(t[0], 17, 14); return finish(t)


def taunt():
    t = tile("FIRE"); s = t[0]
    c = W
    for (x, y) in ((6, 6), (13, 6), (6, 13), (13, 13)):   # anger mark: four curved ticks
        pass
    s.line(8, 5, 8, 9, c); s.line(5, 8, 9, 8, c)
    s.line(15, 5, 15, 9, c); s.line(14, 8, 18, 8, c)
    s.line(8, 14, 8, 18, c); s.line(5, 15, 9, 15, c)
    s.line(15, 14, 15, 18, c); s.line(14, 15, 18, 15, c)
    s.px(9, 9, c); s.px(14, 9, c); s.px(9, 14, c); s.px(14, 14, c)
    return finish(t)


def guardian():
    t = tile("NEUTRAL", True); shield(t[0], 12, 4, c="#8fb0f0"); heart(t[0], 12, 10); return finish(t)


def iron_wall():
    t = tile("NEUTRAL", True); s = t[0]
    for row, y in enumerate(range(5, 19, 4)):
        for x in range(4 - (2 if row % 2 else 0), 20, 5):
            s.rect(max(4, x), y, min(19, x + 3), y + 2, "#b8c0c8")
            s.line(max(4, x), y, min(19, x + 3), y, "#e8edf2")
    return finish(t)


def fireball():
    t = tile("FIRE"); s = t[0]
    s.circle(14, 10, 5, "#ffb347", fill=True); s.circle(15, 9, 3, "#fff1a8", fill=True)
    for k in range(5):
        s.px(8 - k, 14 + k, "#ffb347"); s.px(9 - k, 15 + k, "#e8602c"); s.px(7 - k, 13 + k, "#e8602c")
    return finish(t)


def chain_lightning():
    t = tile("LIGHTNING"); s = t[0]
    pts = [(15, 3), (9, 11), (13, 11), (7, 20)]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        s.line(x0, y0, x1, y1, "#fff6a8"); s.line(x0 + 1, y0, x1 + 1, y1, W)
    s.px(18, 14, "#fff6a8"); s.px(19, 15, "#fff6a8"); s.px(5, 6, "#fff6a8")
    return finish(t)


def frost_nova():
    t = tile("WATER"); s = t[0]
    c = "#e8f6ff"
    s.line(12, 3, 12, 20, c); s.line(4, 12, 20, 12, c); s.line(6, 6, 18, 18, c); s.line(18, 6, 6, 18, c)
    for dx, dy in ((0, -6), (0, 6), (-6, 0), (6, 0)):
        s.px(12 + dx - (1 if dy else 0), 12 + dy - (1 if dx else 0), c); s.px(12 + dx + (1 if dy else 0), 12 + dy + (1 if dx else 0), c)
    s.circle(12, 12, 1, "#8fc8ff", fill=True)
    return finish(t)


def mana_shield():
    t = tile("WATER"); s = t[0]
    s.circle(12, 12, 7, "#8fc8ff"); s.circle(12, 12, 6, "#bfe6ff")
    s.px(8, 8, W); s.px(9, 7, W); s.px(7, 9, W)
    star_burst(s, 12, 12, "#e8f6ff")
    return finish(t)


def shadow_step():
    t = tile("SHADOW"); s = t[0]
    for (x, y) in ((5, 15), (11, 10), (17, 5)):
        s.ellipse(x, y, x + 3, y + 5, "#d8c8ff"); s.px(x + 1, y + 6, "#d8c8ff"); s.px(x + 2, y + 6, "#d8c8ff")
    s.line(4, 20, 9, 20, "#8a6cc8")
    return finish(t)


def poison_blade():
    t = tile("SHADOW"); s = t[0]
    sword(s, 7, 16, 8, "#d8e0ec", "#9aa4b0")
    s.px(15, 9, "#6fcf4a"); s.px(15, 10, "#6fcf4a"); s.px(16, 12, "#6fcf4a"); s.px(12, 13, "#6fcf4a"); s.px(12, 14, "#4fa832")
    return finish(t)


def shadow_assist():
    t = tile("SHADOW", True); s = t[0]
    sword(s, 5, 17, 8, "#8a6cc8", "#5a3a98")
    sword(s, 9, 18, 8, W, W2)
    return finish(t)


def evasion_mastery():
    t = tile("NEUTRAL", True); s = t[0]
    # a dodging figure with two fading afterimages to its left
    for x, c in ((4, "#7b85a3"), (9, "#aab3cc"), (14, W)):
        s.circle(x + 2, 6, 2, c, fill=True)
        s.rect(x + 1, 9, x + 3, 14, c)
        s.px(x, 10, c); s.px(x + 4, 10, c)
        s.px(x + 1, 15, c); s.px(x + 1, 16, c); s.px(x + 3, 15, c); s.px(x + 4, 16, c)
    s.line(3, 19, 18, 19, W2)
    return finish(t)


def holy_heal():
    t = tile("HOLY"); s = t[0]
    s.rect(10, 5, 13, 18, W); s.rect(6, 9, 17, 12, W)
    for x, y in ((5, 5), (18, 5), (5, 18), (18, 18), (3, 11), (20, 11)):
        s.px(x, y, "#fff6c8")
    return finish(t)


def blessing_of_light():
    t = tile("HOLY"); s = t[0]
    s.circle(12, 12, 4, "#fff6c8", fill=True); s.circle(12, 12, 2, W, fill=True)
    for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0), (-1, -1), (1, 1), (1, -1), (-1, 1)):
        s.px(12 + dx * 6, 12 + dy * 6, "#fff6c8"); s.px(12 + dx * 7, 12 + dy * 7, "#fff6c8")
    return finish(t)


def smite():
    t = tile("HOLY"); s = t[0]
    s.rect(10, 2, 13, 13, "#fff6c8"); s.rect(11, 2, 12, 13, W)       # beam
    s.ellipse(5, 14, 18, 20, "#fff6c8"); s.ellipse(8, 15, 15, 19, W)  # impact
    return finish(t)


def divine_grace():
    t = tile("HOLY", True); s = t[0]
    for side in (-1, 1):
        for k in range(4):
            s.line(12 + side * (2 + k), 7 + k, 12 + side * (7 + k), 5 + 2 * k, W)
    s.circle(12, 8, 2, "#fff6c8", fill=True)
    s.ellipse(9, 3, 15, 4, GOLD[3], fill=False)
    return finish(t)


def snipe_shot():
    t = tile("NEUTRAL"); s = t[0]
    s.circle(14, 10, 5, "#e53935"); s.line(14, 3, 14, 17, "#e53935"); s.line(7, 10, 21, 10, "#e53935")
    arrow(s, 4, 19, 1, -1, 8)
    return finish(t)


def multi_shot():
    t = tile("NEUTRAL"); s = t[0]
    for x in (6, 11, 16):
        arrow(s, x, 4, 0, 1, 11)
    return finish(t)


def covering_fire():
    t = tile("NEUTRAL", True); s = t[0]
    shield(s, 8, 8, c="#8fb0f0")
    arrow(s, 10, 19, 1, -1, 9)
    return finish(t)


def hunter_mark():
    t = tile("NEUTRAL"); s = t[0]
    s.circle(12, 12, 7, "#e53935"); s.circle(12, 12, 4, W); s.circle(12, 12, 1, "#e53935", fill=True)
    for x, y in ((12, 3), (12, 21), (3, 12), (21, 12)):
        s.px(x, y, "#e53935")
    return finish(t)


# ---- FFT Knight (Arts of War, 2026-09-27): a blade + a falling arrow in the colour of the stat it breaks

def down_arrow(s, cx, top, c, h=9):
    for y in range(top, top + h - 3):
        s.px(cx, y, c); s.px(cx + 1, y, c)
    y = top + h - 3
    for k, w in enumerate((3, 2, 1)):
        s.line(cx - w + 1, y + k, cx + w, y + k, c)


def rend(color):
    t = tile("NEUTRAL"); s = t[0]
    sword(s, 4, 18, 8)
    down_arrow(s, 16, 5, color, 12)
    return finish(t)


def rend_power():
    return rend("#ff6b5a")


def rend_magick():
    return rend("#b98cff")


def rend_speed():
    return rend("#7ee08a")


def parry():
    t = tile("NEUTRAL", True); s = t[0]
    for k in range(11):                     # the enemy blade, grey, coming down from the top-left
        s.px(5 + k, 4 + k, "#b8c0c8"); s.px(6 + k, 4 + k, "#8a94a0")
    sword(s, 5, 18, 9)                      # our blade catches it
    for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        s.px(11 + dx, 11 + dy, GOLD[3])     # spark where the blades meet
    return finish(t)


# ---- FFT White Mage (2026-09-27)

def plus(s, cx, cy, r, c, hi=None):
    s.rect(cx - 1, cy - r, cx, cy + r, c); s.rect(cx - r, cy - 1, cx + r, cy, c)
    if hi:
        s.px(cx - 1, cy - r, hi); s.px(cx - r, cy - 1, hi)


def cure():
    t = tile("HOLY"); s = t[0]
    plus(s, 12, 12, 6, "#7ff0a0", "#e8fff0")
    return finish(t)


def curaga():
    t = tile("HOLY"); s = t[0]
    for cx, cy in ((8, 9), (16, 9), (12, 16)):
        plus(s, cx, cy, 3, "#7ff0a0", "#e8fff0")
    return finish(t)


def raise_():
    t = tile("HOLY"); s = t[0]
    for side in (-1, 1):                            # a pair of wings
        for k in range(5):
            s.line(12 + side * (2 + k), 9 + k, 12 + side * (7 + k), 7 + 2 * k, W)
    s.circle(12, 9, 2, "#fff6c8", fill=True)
    for y in range(12, 20):                         # rising light
        s.px(12, y, "#fff1a8"); s.px(11, y, "#f2d36a")
    s.ellipse(9, 3, 15, 5, GOLD[3], fill=False)     # halo
    return finish(t)


def protect():
    t = tile("HOLY"); s = t[0]
    shield(s, 12, 4, c="#9ad0ff", rim=GOLD[3])
    s.ellipse(4, 17, 20, 21, "#9ad0ff", fill=False)
    return finish(t)


def esuna():
    t = tile("HOLY"); s = t[0]
    for k in range(8):                              # a sweeping sparkle trail
        s.px(5 + k * 2, 17 - k, "#e8fff0"); s.px(6 + k * 2, 17 - k, "#9ff0c0")
    star_burst(s, 18, 6, "#fff6c8")
    for x, y in ((6, 8), (9, 12), (14, 16)):
        s.px(x, y, "#b388ff")                       # the ailments blown away
    return finish(t)


def holy():
    t = tile("HOLY"); s = t[0]
    for dx, dy in ((0, -7), (0, 7), (-7, 0), (7, 0), (-5, -5), (5, 5), (5, -5), (-5, 5)):
        s.line(12, 12, 12 + dx, 12 + dy, "#fff1a8")
    s.circle(12, 12, 3, W, fill=True)
    return finish(t)


def regenerate():
    t = tile("HOLY", True); s = t[0]
    heart(s, 11, 12, "#5fe08a")
    for y in (5, 8):
        s.px(17, y, "#c8ffd8"); s.px(16, y + 1, "#c8ffd8"); s.px(18, y + 1, "#c8ffd8")
    return finish(t)


# ---- FFT Black Mage (2026-09-27): one motif = single target, three = all enemies

def bolt(s, x, y, k=1.0, c="#fff1a8", sh="#f2c230"):
    """lightning bolt with its top-left at (x, y); k scales the 9x18 design"""
    P = lambda pts: [(x + round(px * k), y + round(py * k)) for px, py in pts]
    s.polygon(P([(6, 0), (0, 10), (4, 10), (1, 18), (9, 7), (5, 7), (8, 0)]), c)
    s.polygon(P([(6, 0), (3, 5), (5, 5), (8, 0)]), W)


def flake(s, cx, cy, r, c="#dff4ff"):
    s.line(cx - r, cy, cx + r, cy, c); s.line(cx, cy - r, cx, cy + r, c)
    s.line(cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1, c); s.line(cx - r + 1, cy + r - 1, cx + r - 1, cy - r + 1, c)
    s.px(cx, cy, W)


def fire():
    t = tile("FIRE"); flame(t[0], 12, 19, 13); return finish(t)


def firaga():
    t = tile("FIRE"); s = t[0]
    for cx, base in ((7, 19), (12, 14), (17, 19)):
        flame(s, cx, base, 8)
    return finish(t)


def thunder():
    t = tile("LIGHTNING"); bolt(t[0], 7, 3, 1.0); return finish(t)


def thundaga():
    t = tile("LIGHTNING"); s = t[0]
    for x, y in ((4, 3), (13, 3), (9, 11)):
        bolt(s, x, y, 0.55)
    return finish(t)


def blizzard():
    t = tile("WATER"); flake(t[0], 12, 12, 7); return finish(t)


def blizzaga():
    t = tile("WATER"); s = t[0]
    for cx, cy in ((7, 8), (16, 8), (12, 16)):
        flake(s, cx, cy, 3)
    return finish(t)


def magick_counter():
    t = tile("SHADOW", True); s = t[0]
    s.ellipse(5, 6, 19, 18, "#c9a8ff", fill=False)              # the spell comes round again
    s.polygon([(16, 4), (21, 7), (16, 10)], "#e8d8ff")            # arrow head
    star_burst(s, 12, 12, "#f5ecff")
    return finish(t)


# ---- FFT Archer (2026-09-27)

def aim():
    t = tile("NEUTRAL"); s = t[0]
    s.circle(12, 12, 7, "#e53935"); s.circle(12, 12, 3, W); s.circle(12, 12, 1, "#e53935", fill=True)
    s.line(12, 3, 12, 6, "#e53935"); s.line(12, 18, 12, 21, "#e53935"); s.line(3, 12, 6, 12, "#e53935"); s.line(18, 12, 21, 12, "#e53935")
    star_burst(s, 18, 6, GOLD[3])              # guaranteed critical
    return finish(t)


def arrow_rain():
    t = tile("NEUTRAL"); s = t[0]
    for x, y in ((5, 3), (10, 5), (15, 3), (19, 6)):
        arrow(s, x, y, 0, 1, 9)
    return finish(t)


def double_shot():
    t = tile("NEUTRAL"); s = t[0]
    arrow(s, 4, 15, 1, -1, 10)
    arrow(s, 8, 19, 1, -1, 10)
    return finish(t)


def adrenaline_rush():
    t = tile("NEUTRAL", True); s = t[0]
    heart(s, 9, 13, "#e53955")
    for k, y in enumerate((8, 12, 16)):        # speed lines
        s.line(14 + k, y, 20, y, W)
    return finish(t)


# ---- FFT Thief (2026-09-27)

def coin(s, cx, cy):
    s.circle(cx, cy, 2, GOLD[2], fill=True); s.px(cx - 1, cy - 1, GOLD[3]); s.px(cx, cy, GOLD[1])


def steal_gil():
    t = tile("NEUTRAL"); s = t[0]
    s.ellipse(5, 10, 16, 20, "#a0703a")                   # the coin purse
    s.ellipse(6, 11, 14, 18, "#c08a4a", only="opaque")
    s.rect(8, 8, 13, 10, "#a0703a"); s.line(8, 10, 13, 10, "#6b4520")   # tied neck
    s.px(9, 7, "#a0703a"); s.px(12, 7, "#a0703a")
    for cx, cy in ((18, 7), (17, 13), (19, 18)):           # coins flying out
        coin(s, cx, cy)
    return finish(t)


def vanish():
    t = tile("SHADOW"); s = t[0]
    for x, y in ((4, 6), (6, 12), (3, 16), (8, 4)):         # smoke where the thief was
        s.circle(x, y, 1, "#9c86c8", fill=True)
    sword(s, 10, 18, 8, "#e6ecf4", "#9aa4b0")                # dagger lunging out of nowhere
    for k in range(3):
        s.px(19 - k, 4 + k * 2, "#d8c8ff")
    return finish(t)


def steal_heart():
    t = tile("SHADOW"); s = t[0]
    heart(s, 10, 11, "#ff6f9c")
    s.px(8, 9, "#ffd0e0")
    down_arrow(s, 18, 7, "#8fd3ff", 8)                       # the charmed foe slows down
    return finish(t)


def double_attack():
    t = tile("NEUTRAL"); s = t[0]
    sword(s, 5, 15, 8, "#e6ecf4", "#9aa4b0")
    sword(s, 10, 19, 8, W, W2)
    for x, y in ((18, 4), (19, 9)):                           # two slash sparks
        s.px(x, y, GOLD[3]); s.px(x - 1, y + 1, GOLD[3])
    return finish(t)


def perfect_dodge():
    t = tile("NEUTRAL", True); s = t[0]
    # the thief hops up and away; afterimages trace the jump arc
    for (x, y), c in (((3, 12), "#7b85a3"), ((8, 6), "#aab3cc"), ((14, 9), W)):
        s.circle(x + 2, y, 2, c, fill=True)
        s.rect(x + 1, y + 3, x + 3, y + 7, c)
        s.px(x, y + 4, c); s.px(x + 4, y + 4, c)
        s.px(x + 1, y + 8, c); s.px(x + 4, y + 8, c)
    arrow(s, 3, 20, 1, 0, 14, "#b8c0c8")                     # the blow passes underneath
    return finish(t)


# ---- FFT Monk (2026-09-27)

def pummel():
    t = tile("NEUTRAL"); s = t[0]
    fist(s, 5, 4, "#c9a080", "#9a6c48")                             # earlier punch, fading back
    fist(s, 9, 13)                                                  # the punch landing now
    for y in (6, 9):                                                # motion lines behind
        s.line(2, y, 3, y, "#aab3cc")
    star_burst(s, 20, 14, GOLD[3])
    return finish(t)


def aurablast():
    t = tile("NEUTRAL"); s = t[0]
    fist(s, 3, 9)
    s.ellipse(11, 6, 21, 17, "#8fe0ff")                           # the ki wave leaving the fist
    s.ellipse(13, 8, 19, 15, "#e0f7ff", only="opaque")
    s.circle(16, 11, 1, W, fill=True)
    return finish(t)


def chakra():
    t = tile("HOLY"); s = t[0]
    s.circle(12, 12, 8, "#fff1a8")                                # a ring of life energy
    for (cx, cy), c in (((12, 5), "#e53955"), ((6, 15), "#4dabf7"), ((18, 15), "#69db7c")):
        s.circle(cx, cy, 2, c, fill=True)                         # HP · MP · regen
    s.circle(12, 12, 2, W, fill=True)
    return finish(t)


def purification():
    t = tile("HOLY"); s = t[0]
    s.polygon([(12, 3), (16, 10), (16, 14), (12, 19), (8, 14), (8, 10)], "#bdf0ff")   # a clean water drop
    s.polygon([(12, 6), (14, 11), (12, 15), (10, 11)], W, )
    for x, y in ((5, 6), (19, 7), (4, 17), (20, 17)):             # sparkles
        s.px(x, y, W)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            s.px(x + dx, y + dy, "#fff1a8")
    return finish(t)


def first_strike():
    t = tile("NEUTRAL", True); s = t[0]
    for k in range(9):                                            # the enemy blade, still raised
        s.px(15 + k // 2, 4 + k, "#b8c0c8")
    fist(s, 5, 12)                                                # our fist gets there first
    star_burst(s, 14, 12, GOLD[3])
    return finish(t)


# ---- FFT Time Mage (2026-09-27): clock motifs; one = single target, three = everyone

TM = "#e5dbff"


def clock(s, cx, cy, r, c=TM, hand=GOLD[3]):
    s.circle(cx, cy, r, c)
    s.line(cx, cy - r + 2, cx, cy, hand); s.line(cx, cy, cx + r - 2, cy, hand)


def chevrons(s, x, y, c, n=2):
    for k in range(n):
        s.line(x + k * 4, y, x + k * 4 + 3, y + 3, c); s.line(x + k * 4 + 3, y + 4, x + k * 4, y + 7, c)


def haste():
    t = tile("SHADOW"); s = t[0]
    clock(s, 9, 12, 6)
    chevrons(s, 13, 8, "#ffe066")
    return finish(t)


def hastega():
    t = tile("SHADOW"); s = t[0]
    for cx, cy in ((6, 7), (17, 7), (11, 16)):
        clock(s, cx, cy, 3)
    chevrons(s, 15, 14, "#ffe066", 1)
    return finish(t)


def slow():
    t = tile("WATER"); s = t[0]
    clock(s, 10, 11, 6, hand="#8fd3ff")
    down_arrow(s, 18, 6, "#8fd3ff", 10)
    return finish(t)


def slowga():
    t = tile("WATER"); s = t[0]
    for cx, cy in ((6, 7), (16, 7), (11, 16)):
        clock(s, cx, cy, 3, hand="#8fd3ff")
    down_arrow(s, 20, 11, "#8fd3ff", 9)
    return finish(t)


def stop():
    t = tile("SHADOW"); s = t[0]
    clock(s, 12, 12, 7, hand="#b197fc")
    for x in (3, 19):                                          # frozen frame brackets
        s.line(x, 4, x, 20, "#b8c0c8")
    s.line(3, 4, 5, 4, "#b8c0c8"); s.line(3, 20, 5, 20, "#b8c0c8"); s.line(17, 4, 19, 4, "#b8c0c8"); s.line(17, 20, 19, 20, "#b8c0c8")
    return finish(t)


def quick():
    t = tile("LIGHTNING"); s = t[0]
    clock(s, 8, 12, 5)
    chevrons(s, 12, 8, W, 2)
    star_burst(s, 19, 5, GOLD[3])
    return finish(t)


def graviga():
    t = tile("SHADOW"); s = t[0]
    s.circle(12, 13, 7, "#4b2a82", fill=True)                  # a crushing dark well
    s.circle(12, 13, 7, "#b197fc")
    s.circle(12, 13, 3, "#1c1030", fill=True)
    for x in (5, 12, 19):
        down_arrow(s, x, 2, "#e5dbff", 6)
    return finish(t)


# ---- FFT Summoner (2026-09-27): each summon's own silhouette over a summoning circle

def rune_ring(s, c):
    s.ellipse(3, 16, 20, 21, c, fill=False)                        # summoning circle at the feet
    s.px(11, 18, c); s.px(12, 19, c)


def moogle():
    t = tile("HOLY"); s = t[0]
    rune_ring(s, "#fff1a8")
    s.circle(12, 11, 5, W, fill=True)                              # round white body
    s.px(10, 11, INK); s.px(14, 11, INK)                           # eyes
    s.px(12, 13, "#ff8fa3")                                        # nose
    s.line(12, 2, 12, 5, "#b8c0c8"); s.circle(12, 2, 1, "#ff5a7a", fill=True)   # pom-pom
    s.px(6, 9, "#c9b8ff"); s.px(5, 8, "#c9b8ff"); s.px(18, 9, "#c9b8ff"); s.px(19, 8, "#c9b8ff")   # little wings
    return finish(t)


def shiva():
    t = tile("WATER"); s = t[0]
    rune_ring(s, "#8fd3ff")
    s.circle(12, 6, 3, "#dff4ff", fill=True)                        # head
    s.polygon([(12, 9), (16, 17), (8, 17)], "#8fd3ff")             # gown
    s.line(9, 3, 7, 1, "#dff4ff"); s.line(15, 3, 17, 1, "#dff4ff")  # ice crown
    flake(s, 19, 8, 2)
    return finish(t)


def ramuh():
    t = tile("LIGHTNING"); s = t[0]
    rune_ring(s, "#fff1a8")
    s.circle(9, 6, 3, "#f0c090", fill=True)                         # old sage's face
    s.line(6, 3, 12, 3, "#8a6cc8"); s.line(7, 2, 11, 2, "#8a6cc8") # hood
    s.px(8, 6, INK); s.px(10, 6, INK)                              # eyes
    s.polygon([(6, 8), (12, 8), (9, 15)], W)                       # long white beard
    s.line(16, 9, 16, 18, "#a0703a")                               # staff
    bolt(s, 14, 2, 0.45)                                           # lightning on its tip
    return finish(t)


def ifrit():
    t = tile("FIRE"); s = t[0]
    rune_ring(s, "#ffb347")
    flame(s, 12, 17, 12)
    s.line(7, 5, 5, 2, "#fff1a8"); s.line(17, 5, 19, 2, "#fff1a8")  # horns
    s.rect(9, 11, 10, 12, "#7a1f10"); s.rect(14, 11, 15, 12, "#7a1f10")   # eyes in the fire
    return finish(t)


def bahamut():
    t = tile("SHADOW"); s = t[0]
    s.polygon([(2, 6), (10, 10), (12, 4), (14, 10), (22, 6), (16, 14), (12, 20), (8, 14)], "#9c86c8")   # spread wings
    s.polygon([(10, 10), (12, 4), (14, 10), (12, 16)], "#e5dbff")  # dragon body
    s.px(11, 7, GOLD[3]); s.px(13, 7, GOLD[3])                     # eyes
    s.circle(12, 20, 1, GOLD[2], fill=True)                        # mega flare charging
    return finish(t)


def critical_recover_mp():
    t = tile("WATER", True); s = t[0]
    s.polygon([(10, 3), (15, 11), (15, 15), (10, 20), (5, 15), (5, 11)], "#74c0fc")   # mana drop
    s.polygon([(10, 7), (12, 12), (10, 16), (8, 12)], "#d0ebff")
    s.rect(16, 16, 20, 18, "#e53955")                              # low HP bar
    s.rect(16, 16, 17, 18, "#ff8a8a")
    return finish(t)


# ---- FFT Geomancer (2026-09-27): the land itself attacks

LEAF = "#69db7c"
VINE = "#2f9e44"


def tanglevine():
    t = tile("EARTH"); s = t[0]
    for x0 in (5, 11, 17):                                         # three vines curling up from the ground
        for k in range(12):
            s.px(x0 + (1 if (k // 3) % 2 else 0), 19 - k, VINE)
        s.px(x0 + 2, 9, LEAF); s.px(x0 - 1, 13, LEAF)
    s.line(3, 20, 20, 20, "#a0703a")
    return finish(t)


def sinkhole():
    t = tile("EARTH"); s = t[0]
    s.ellipse(3, 10, 20, 19, "#6b4520")                            # the ground caving in
    s.ellipse(6, 12, 17, 17, "#2a1a10")
    for x, y in ((4, 7), (18, 6), (11, 5)):                        # falling rocks
        s.rect(x, y, x + 1, y + 1, "#c9a66b")
    return finish(t)


def sandstorm():
    t = tile("EARTH"); s = t[0]
    for k, y in enumerate((5, 9, 13, 17)):                         # swirling sand bands
        s.line(3 + k, y, 18 - k, y, "#f0d9a0")
        s.px(19 - k, y + 1, "#f0d9a0")
    for x, y in ((6, 7), (14, 11), (9, 15), (17, 4)):
        s.px(x, y, "#c9a66b")
    return finish(t)


def snowstorm():
    t = tile("WATER"); s = t[0]
    for k, y in enumerate((6, 12, 18)):
        s.line(3, y, 12, y - 2, "#bde0fe")                         # wind streaks
    flake(s, 16, 8, 3)
    flake(s, 9, 15, 2)
    return finish(t)


def wind_blast():
    t = tile("NEUTRAL"); s = t[0]
    for y, n in ((6, 14), (11, 17), (16, 12)):                     # gusts with curled ends
        s.line(3, y, 3 + n, y, "#dff4ff")
        s.px(4 + n, y - 1, "#dff4ff"); s.px(3 + n, y - 2, "#dff4ff")
    return finish(t)


def natures_wrath():
    t = tile("EARTH", True); s = t[0]
    s.polygon([(4, 20), (9, 8), (12, 14), (15, 6), (20, 20)], "#8a6a3a")   # rock spikes erupt
    s.polygon([(9, 8), (10, 11), (8, 12)], "#c9a66b"); s.polygon([(15, 6), (16, 10), (14, 11)], "#c9a66b")
    s.px(6, 12, LEAF); s.px(18, 13, LEAF)
    return finish(t)


# ---- FFT Dragoon (2026-09-27)

def lance(s, x0, y0, n, c="#dfe6ee", sh="#9aa4b0"):
    """a lance pointing down-right from (x0, y0)"""
    for k in range(n):
        s.px(x0 + k, y0 + k, c); s.px(x0 + k + 1, y0 + k, sh)
    s.polygon([(x0 + n - 1, y0 + n - 3), (x0 + n + 2, y0 + n + 2), (x0 + n - 3, y0 + n - 1)], W)   # spear head


def jump():
    t = tile("NEUTRAL"); s = t[0]
    lance(s, 4, 3, 12)
    for x, y in ((3, 10), (5, 13), (8, 15)):                      # speed lines of the dive
        s.line(x, y - 4, x, y, "#aab3cc")
    s.line(4, 21, 20, 21, "#a0703a")
    star_burst(s, 18, 19, GOLD[3])
    return finish(t)


def dragons_faith():
    t = tile("FIRE"); s = t[0]
    s.polygon([(12, 3), (19, 8), (17, 17), (12, 21), (7, 17), (5, 8)], "#ffb347")   # a dragon crest
    s.polygon([(12, 7), (15, 10), (14, 15), (12, 17), (10, 15), (9, 10)], "#fff1a8")
    s.rect(10, 11, 10, 12, "#7a1f10"); s.rect(14, 11, 14, 12, "#7a1f10")
    s.line(8, 4, 6, 1, "#fff1a8"); s.line(16, 4, 18, 1, "#fff1a8")   # horns
    return finish(t)


def dragonheart():
    t = tile("FIRE", True); s = t[0]
    heart(s, 11, 12, "#e53955")
    s.px(9, 10, "#ffb3c1")
    for x, y in ((5, 5), (17, 16), (4, 17)):                      # embers of rebirth
        s.px(x, y, GOLD[3]); s.px(x, y - 1, "#ffb347")
    s.line(11, 17, 11, 21, GOLD[3]); s.line(10, 19, 12, 19, GOLD[3])   # rising again
    return finish(t)


# ---- FFT Samurai (2026-09-27): katana spirits

def katana(s, x0, y0, n, c="#e9eef5", sh="#9aa4b0", guard=GOLD[2]):
    """a gently curved katana, handle bottom-left, tip up-right"""
    for k in range(n):
        y = y0 - k + (1 if k > n * 0.6 else 0)          # the curve near the tip
        s.px(x0 + k, y, c); s.px(x0 + k, y + 1, sh)
    s.rect(x0 - 1, y0 - 1, x0, y0 + 2, guard)          # tsuba
    s.line(x0 - 4, y0 + 4, x0 - 2, y0 + 2, "#3b2a5a"); s.line(x0 - 3, y0 + 4, x0 - 1, y0 + 2, "#6b4a9a")   # wrapped hilt


def kotetsu():
    t = tile("NEUTRAL"); s = t[0]
    katana(s, 6, 17, 13)
    s.ellipse(3, 3, 21, 21, "#dff4ff", fill=False, only="empty")   # a sweeping arc around
    return finish(t)


def osafune():
    t = tile("SHADOW"); s = t[0]
    katana(s, 6, 17, 13, c="#d0bfff", sh="#8a6cc8")
    for x, y in ((16, 14), (19, 17), (13, 19)):                   # mana draining away
        s.circle(x, y, 1, "#74c0fc", fill=True)
    return finish(t)


def ama_no_murakumo():
    t = tile("HOLY"); s = t[0]
    for cx, cy, r in ((6, 6, 2), (9, 4, 3), (13, 6, 2)):          # the heavenly cloud the sword came from
        s.circle(cx, cy, r, "#fff8e1", fill=True)
    katana(s, 6, 19, 14, c=W, sh=GOLD[1], guard=GOLD[3])
    star_burst(s, 19, 6, GOLD[3])
    return finish(t)


def shirahadori():
    t = tile("NEUTRAL", True); s = t[0]
    for k in range(12):                                            # the enemy blade coming straight down
        s.px(11, 2 + k, "#dfe6ee"); s.px(12, 2 + k, "#9aa4b0")
    for x0, sh in ((7, 7), (13, 16)):                              # two flat palms, fingers up, clapped on the blade
        s.rect(x0, 9, x0 + 3, 18, "#f0c090")
        s.line(sh, 10, sh, 18, "#c98f5a")
        s.px(x0, 9, None); s.px(x0 + 3, 9, None)                   # rounded finger tips
    s.px(11, 14, None); s.px(12, 14, None)
    for x, y in ((5, 7), (18, 7), (5, 12), (18, 12)):              # clap lines
        s.px(x, y, GOLD[3])
    return finish(t)


# ---- FFT Ninja (2026-09-27)

def shuriken_star(s, cx, cy, c="#dfe6ee", sh="#9aa4b0"):
    s.polygon([(cx, cy - 5), (cx + 1, cy - 1), (cx + 5, cy), (cx + 1, cy + 1), (cx, cy + 5), (cx - 1, cy + 1), (cx - 5, cy), (cx - 1, cy - 1)], c)
    s.px(cx + 1, cy + 1, sh); s.px(cx + 2, cy, sh); s.px(cx, cy + 2, sh)
    s.px(cx, cy, "#343a40")


def shuriken():
    t = tile("NEUTRAL"); s = t[0]
    shuriken_star(s, 14, 10)
    for k in range(3):                                            # flight trail
        s.line(3, 13 + k * 2, 7 - k, 13 + k * 2, "#aab3cc")
    return finish(t)


def bomb():
    t = tile("FIRE"); s = t[0]
    s.circle(10, 14, 6, "#343a40", fill=True)                     # round black bomb
    s.circle(8, 12, 1, "#868e96", fill=True)
    s.line(13, 8, 16, 5, "#a0703a")                               # fuse
    star_burst(s, 17, 4, GOLD[3])
    return finish(t)


def shadow_clone():
    t = tile("SHADOW"); s = t[0]
    for (x, y), c in (((3, 5), "#6b4a9a"), ((8, 7), "#9c86c8"), ((13, 9), W)):   # clones fanning out
        s.circle(x + 2, y, 2, c, fill=True)
        s.rect(x + 1, y + 3, x + 3, y + 8, c)
        s.px(x + 5, y + 4, c); s.px(x + 6, y + 3, c)                # blade arm
        s.px(x + 1, y + 9, c); s.px(x + 3, y + 9, c)
    s.line(20, 3, 20, 12, "#dfe6ee")                               # the lead clone's blade
    return finish(t)


def ninja_vanish():
    t = tile("SHADOW", True); s = t[0]
    for x, y in ((6, 4), (9, 6), (12, 3), (8, 10), (11, 9), (14, 11), (7, 15), (10, 14), (13, 16), (9, 19), (12, 20)):
        s.px(x, y, "#c9b8ff")                                       # a body dissolving into sparkles
    s.circle(10, 5, 2, "#9c86c8")
    return finish(t)


def kawarimi():
    t = tile("NEUTRAL", True); s = t[0]
    s.rect(8, 8, 14, 19, "#8a5a2b")                               # the log left behind
    s.rect(9, 8, 10, 19, "#a0703a")
    s.ellipse(8, 6, 14, 9, "#c9a66b")
    s.px(11, 7, "#8a5a2b")
    for x, y in ((4, 6), (17, 5), (4, 14), (18, 15), (6, 20)):     # smoke puffs
        s.circle(x, y, 1, "#dee2e6", fill=True)
    return finish(t)


# ---- FFT Bard (2026-09-27): a music note + what the song does

def note(s, x, y, c=W):
    """an eighth note with its head at (x, y)"""
    s.circle(x, y, 2, c, fill=True)
    s.line(x + 2, y, x + 2, y - 7, c)
    s.line(x + 3, y - 7, x + 5, y - 5, c)


def seraph_song():
    t = tile("WATER"); s = t[0]
    note(s, 7, 16)
    s.polygon([(16, 4), (19, 9), (19, 12), (16, 15), (13, 12), (13, 9)], "#74c0fc")   # MP drop
    s.px(15, 8, "#d0ebff")
    s.line(3, 4, 6, 3, "#fff1a8"); s.line(3, 5, 6, 6, "#fff1a8")                   # little wings
    return finish(t)


def lifes_anthem():
    t = tile("HOLY"); s = t[0]
    note(s, 6, 17)
    plus(s, 16, 9, 4, "#69db7c", W)
    return finish(t)


def rousing_melody():
    t = tile("LIGHTNING"); s = t[0]
    note(s, 6, 17)
    chevrons(s, 12, 6, W, 2)
    return finish(t)


def battle_chant():
    t = tile("FIRE"); s = t[0]
    note(s, 5, 18)
    sword(s, 10, 17, 9)
    s.polygon([(17, 3), (20, 6), (17, 9), (14, 6)], "#c9b8ff")                     # magic gem: ATK and MATK
    return finish(t)


def soothing_tune():
    t = tile("HOLY", True); s = t[0]
    note(s, 6, 16)
    note(s, 13, 12, "#ffd6e0")
    heart(s, 17, 17, "#ff8fab")
    return finish(t)


# ---- FFT Dancer (2026-09-27): a twirling ribbon + the hex it casts

RIBBON = "#ff8fab"


def ribbon(s, x0=3, y0=18):
    """a dancer's ribbon swirling up from the bottom-left"""
    pts = [(0, 0), (2, -2), (4, -3), (6, -2), (7, 0), (6, 2), (4, 2), (3, 0), (4, -3), (6, -6), (9, -8), (12, -8), (14, -6)]
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        s.line(x0 + ax, y0 + ay, x0 + bx, y0 + by, RIBBON)


def mincing_minuet():
    t = tile("SHADOW"); s = t[0]
    ribbon(s)
    s.polygon([(17, 12), (20, 17), (17, 21), (14, 17)], "#74c0fc")           # MP draining out
    s.line(17, 6, 17, 10, "#74c0fc")
    return finish(t)


def polka():
    t = tile("NEUTRAL"); s = t[0]
    ribbon(s)
    down_arrow(s, 16, 9, "#ff6b6b", 9)                                       # ATK down
    down_arrow(s, 20, 11, "#b197fc", 8)                                      # MATK down
    return finish(t)


def slow_dance():
    t = tile("WATER"); s = t[0]
    ribbon(s)
    clock(s, 17, 13, 4, hand="#8fd3ff")
    return finish(t)


def forbidden_dance():
    t = tile("SHADOW"); s = t[0]
    ribbon(s)
    s.circle(16, 8, 2, "#8ce99a", fill=True)                                 # poison bubble
    star_burst(s, 18, 15, GOLD[3])                                           # stun
    s.circle(12, 19, 1, "#8fd3ff", fill=True)                                # slow
    return finish(t)


def heartbreak():
    t = tile("SHADOW", True); s = t[0]
    heart(s, 12, 12, "#ff6b9a")
    s.line(12, 7, 11, 10, "#2a1a30"); s.line(11, 10, 13, 12, "#2a1a30"); s.line(13, 12, 12, 15, "#2a1a30")   # crack
    for x, y in ((4, 5), (19, 4), (4, 18), (19, 18)):                        # struck in every direction
        s.px(x, y, W)
    return finish(t)


ICONS = {
    "basic_attack": basic_attack, "quick_strike": quick_strike, "power_smash": power_smash, "stone_throw": stone_throw,
    "sweep_kick": sweep_kick, "dirty_trick": dirty_trick, "fire_spark": fire_spark, "aqua_splash": aqua_splash,
    "war_cry": war_cry, "focus": focus, "first_aid": first_aid, "guard_stance": guard_stance, "counter_jab": counter_jab,
    "lucky_dodge": lucky_dodge, "second_wind": second_wind,
    "shield_bash": shield_bash, "taunt": taunt, "guardian": guardian, "iron_wall": iron_wall,
    "fireball": fireball, "chain_lightning": chain_lightning, "frost_nova": frost_nova, "mana_shield": mana_shield,
    "shadow_step": shadow_step, "poison_blade": poison_blade, "shadow_assist": shadow_assist, "evasion_mastery": evasion_mastery,
    "holy_heal": holy_heal, "blessing_of_light": blessing_of_light, "smite": smite, "divine_grace": divine_grace,
    "snipe_shot": snipe_shot, "multi_shot": multi_shot, "covering_fire": covering_fire, "hunter_mark": hunter_mark,
    "rend_power": rend_power, "rend_magick": rend_magick, "rend_speed": rend_speed, "parry": parry,
    "cure": cure, "curaga": curaga, "raise": raise_, "protect": protect, "esuna": esuna, "holy": holy,
    "regenerate": regenerate,
    "fire": fire, "firaga": firaga, "thunder": thunder, "thundaga": thundaga, "blizzard": blizzard, "blizzaga": blizzaga,
    "magick_counter": magick_counter,
    "aim": aim, "arrow_rain": arrow_rain, "double_shot": double_shot, "adrenaline_rush": adrenaline_rush,
    "steal_gil": steal_gil, "vanish": vanish, "steal_heart": steal_heart, "double_attack": double_attack,
    "perfect_dodge": perfect_dodge,
    "pummel": pummel, "aurablast": aurablast, "chakra": chakra, "purification": purification, "first_strike": first_strike,
    "haste": haste, "hastega": hastega, "slow": slow, "slowga": slowga, "stop": stop, "quick": quick, "graviga": graviga,
    "moogle": moogle, "shiva": shiva, "ramuh": ramuh, "ifrit": ifrit, "bahamut": bahamut, "critical_recover_mp": critical_recover_mp,
    "tanglevine": tanglevine, "sinkhole": sinkhole, "sandstorm": sandstorm, "snowstorm": snowstorm, "wind_blast": wind_blast,
    "natures_wrath": natures_wrath,
    "jump": jump, "dragons_faith": dragons_faith, "dragonheart": dragonheart,
    "kotetsu": kotetsu, "osafune": osafune, "ama_no_murakumo": ama_no_murakumo, "shirahadori": shirahadori,
    "shuriken": shuriken, "bomb": bomb, "shadow_clone": shadow_clone, "ninja_vanish": ninja_vanish, "kawarimi": kawarimi,
    "seraph_song": seraph_song, "lifes_anthem": lifes_anthem, "rousing_melody": rousing_melody, "battle_chant": battle_chant,
    "soothing_tune": soothing_tune,
    "mincing_minuet": mincing_minuet, "polka": polka, "slow_dance": slow_dance, "forbidden_dance": forbidden_dance, "heartbreak": heartbreak,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    out = {}
    for name, fn in ICONS.items():
        s = fn()
        s.save_png(os.path.join(OUT, f"{name}.png"))
        out[name] = s.composite(1)
    Z, cols = 3, 7
    cell = 48 * Z + 14
    rows = (len(out) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cell, rows * (cell + 12)), (236, 230, 214, 255))
    d = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(out.items()):
        x, y = (i % cols) * cell + 7, (i // cols) * (cell + 12) + 6
        sheet.alpha_composite(im.resize((48 * Z, 48 * Z), Image.NEAREST), (x, y))
        d.text((x, y + 48 * Z + 1), n, fill=(30, 30, 40, 255))
    sheet.save(os.path.join(HERE, "preview.png"))
    print("OK", len(out), "skill icons")


if __name__ == "__main__":
    main()
