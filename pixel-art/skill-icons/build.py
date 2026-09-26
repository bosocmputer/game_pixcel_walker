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
