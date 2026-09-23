#!/usr/bin/env python3
"""
Item icons for Pixel Walker — 24x24, one light source (top-left), hue-shifted ramps,
dark ink outline outside. Source of truth for apps/game/public/assets/items/*.png.

    python pixel-art/item-icons/build.py        (from the repo root, or from this folder)

Outputs: <id>.png (1x) into apps/game/public/assets/items/ (stale icons are deleted), and
preview.png (8x, labelled) + silhouette.png + strip2x.png here for review.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite, ramp, mix  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

OUT = os.path.join(ROOT, "apps", "game", "public", "assets", "items")
S = 24
INK = "#1c1a28"  # shared outline — keeps the whole set reading as one family


def canvas():
    return Sprite(S, S)


def finish(s):
    s.outline(INK, where="outside")
    return s


# --------------------------------------------------------------------------------------------
# Shared shapes

def diag_blade(s, x0, y0, length, r, width=3, tip=2):
    """Blade rising up-right from (x0, y0). r = ramp dark->light (>=4)."""
    for t in range(length):
        x, y = x0 + t, y0 - t
        taper = t >= length - tip
        s.px(x, y, r[2])
        s.px(x, y - 1, r[-1] if not taper else r[3])
        if width >= 3 and not taper:
            s.px(x + 1, y, r[1])
        if width >= 4 and not taper:
            s.px(x + 1, y + 1, r[0])
    s.px(x0 + length, y0 - length, r[3])


def diag_handle(s, x0, y0, n, r):
    """Grip going down-left from (x0, y0)."""
    for k in range(n):
        s.px(x0 - k, y0 + k, r[1] if k % 2 else r[2])
        s.px(x0 - k + 1, y0 + k, r[0])


def guard(s, cx, cy, half, r):
    """Cross-guard perpendicular to a 45deg blade, centred on (cx, cy)."""
    for j in range(-half, half + 1):
        s.px(cx + j, cy + j, r[2] if j < 0 else r[1])
        s.px(cx + j - 1, cy + j, r[3] if j < 0 else r[2])


# --------------------------------------------------------------------------------------------
# Weapons

def training_sword():
    s = canvas()
    wood = ramp("#c89454", 5, hue_shift=16)
    dark = ramp("#6b4424", 4)
    diag_blade(s, 8, 15, 11, wood, width=3)
    guard(s, 7, 16, 3, dark)
    diag_handle(s, 5, 18, 3, dark)
    s.px(2, 21, dark[2]); s.px(3, 21, dark[1]); s.px(2, 20, dark[3])  # pommel
    return finish(s)


def pixel_broadsword():
    s = canvas()
    steel = ramp("#b8c4d4", 5, hue_shift=18)
    gold = ramp("#e0b030", 4, hue_shift=20)
    grip = ramp("#3a4a8a", 4)
    diag_blade(s, 8, 15, 12, steel, width=4, tip=2)
    for t in range(1, 10):  # fuller groove
        s.px(8 + t, 15 - t, steel[1])
    guard(s, 7, 16, 4, gold)
    diag_handle(s, 5, 18, 3, grip)
    s.px(2, 21, gold[2]); s.px(3, 21, gold[1]); s.px(2, 20, gold[3])
    s.px(3, 20, "#e8506a")  # ruby pommel
    return finish(s)


def convenience_club():
    s = canvas()
    meat = ramp("#e07a90", 5, hue_shift=18)
    wood = ramp("#8a5a2e", 4)
    # thick sausage body up-right, rounded end
    for t in range(10):
        cx, cy = 9 + t, 15 - t
        rad = 1 if t < 2 else 2
        s.circle(cx, cy, rad, meat[2], fill=True)
    s.circle(18, 6, 3, meat[2], fill=True)
    # shade lower-right, light upper-left (shifted-shape recipe)
    for t in range(10):
        s.px(10 + t, 16 - t, meat[1], only="opaque")
        s.px(11 + t, 16 - t, meat[0], only="opaque")
        s.px(8 + t, 14 - t, meat[3], only="opaque")
    s.circle(17, 5, 1, meat[4], fill=True, only="opaque")
    for sx, sy in ((11, 12), (14, 9), (17, 6)):  # bologna slice rings
        s.px(sx, sy, meat[4], only="opaque"); s.px(sx + 1, sy + 1, meat[4], only="opaque")
    s.px(20, 4, meat[4], only="opaque")
    diag_handle(s, 7, 17, 4, wood)
    return finish(s)


def staff(head):
    s = canvas()
    if head == "knob":
        shaft = ramp("#a8743e", 4, hue_shift=14)
        top = ramp("#6e4424", 4)
    else:
        shaft = ramp("#4f66d0", 4, hue_shift=20)
        top = ramp("#ffd84a", 5, hue_shift=22)
    for t in range(15):  # shaft from bottom-left up to the head
        x, y = 3 + t, 21 - t
        s.px(x, y, shaft[2]); s.px(x + 1, y, shaft[1])
        if t % 4 == 1:
            s.px(x, y, shaft[3])
    if head == "knob":
        s.circle(19, 5, 2, top[2], fill=True)
        s.px(18, 4, top[3]); s.px(19, 4, top[3]); s.px(20, 6, top[0]); s.px(19, 6, top[1])
        s.px(16, 8, top[1]); s.px(17, 8, top[0])  # collar
    else:
        star = [(19, 1), (18, 2), (19, 2), (20, 2), (15, 3), (16, 3), (17, 3), (18, 3), (19, 3), (20, 3), (21, 3), (22, 3),
                (16, 4), (17, 4), (18, 4), (19, 4), (20, 4), (21, 4), (17, 5), (18, 5), (19, 5), (20, 5),
                (16, 6), (17, 6), (18, 6), (20, 6), (21, 6), (16, 7), (21, 7)]
        for x, y in star:
            s.px(x, y, top[2])
        for x, y in ((19, 2), (18, 3), (19, 3), (17, 4), (18, 4)):
            s.px(x, y, top[4])
        for x, y in ((20, 5), (21, 6), (21, 7), (20, 4)):
            s.px(x, y, top[1])
        s.px(19, 4, "#ffffff")
        s.px(13, 3, "#bfe6ff"); s.px(22, 9, "#bfe6ff")  # sparkles
        s.px(15, 8, shaft[1]); s.px(16, 8, shaft[0])
    return finish(s)


# --------------------------------------------------------------------------------------------
# Armour & clothes

def cotton_shirt():
    s = canvas()
    r = ramp("#e6d7b6", 5, hue_shift=14)
    body = [(6, 4), (9, 3), (14, 3), (17, 4), (22, 9), (19, 12), (17, 10), (17, 21), (6, 21), (6, 10), (4, 12), (1, 9)]
    s.polygon(body, r[2])
    s.polygon([(7, 5), (9, 4), (11, 4), (9, 8), (7, 9), (7, 20), (6, 20), (6, 9)], r[3], only="opaque")  # lit left
    s.polygon([(15, 5), (16, 11), (16, 20), (13, 20)], r[1], only="opaque")  # shade right
    s.line(19, 11, 21, 9, r[1], only="opaque")
    # V neck
    s.polygon([(10, 3), (13, 3), (12, 7), (11, 7)], r[0])
    s.px(11, 6, "#caa27a"); s.px(12, 6, "#caa27a")
    # hem & stitches
    s.line(6, 20, 17, 20, r[1], only="opaque")
    for x in range(7, 17, 2):
        s.px(x, 18, r[1], only="opaque")
    return finish(s)


def fuel_plate():
    s = canvas()
    red = ramp("#c63a2e", 5, hue_shift=18)
    gold = ramp("#f2c230", 4, hue_shift=20)
    s.polygon([(4, 5), (9, 3), (14, 3), (19, 5), (20, 11), (18, 13), (18, 20), (5, 20), (5, 13), (3, 11)], red[2])
    s.polygon([(5, 6), (9, 4), (11, 4), (8, 10), (6, 12), (6, 19), (5, 19), (5, 12)], red[3], only="opaque")
    s.polygon([(16, 6), (19, 6), (19, 11), (17, 12), (17, 19), (14, 19)], red[1], only="opaque")
    # pauldrons
    s.ellipse(2, 4, 7, 9, gold[2]); s.ellipse(16, 4, 21, 9, gold[1])
    s.px(3, 5, gold[3]); s.px(4, 5, gold[3]); s.px(17, 5, gold[2])
    # neck ring + belt
    s.line(9, 4, 14, 4, gold[1]); s.line(10, 5, 13, 5, red[0])
    s.line(5, 17, 18, 17, gold[1]); s.px(11, 17, gold[3]); s.px(12, 17, gold[3])
    # fuel-drop emblem
    for x, y in ((11, 8), (11, 9), (12, 9), (10, 10), (11, 10), (12, 10), (10, 11), (11, 11), (12, 11), (11, 12)):
        s.px(x, y, gold[2])
    s.px(10, 10, gold[3]); s.px(12, 11, gold[0])
    # rivets
    for x, y in ((7, 14), (16, 14), (7, 19), (16, 19)):
        s.px(x, y, gold[3])
    return finish(s)


def iron_helm():
    s = canvas()
    r = ramp("#9aa4b0", 5, hue_shift=16)
    s.ellipse(5, 4, 18, 17, r[2])                  # dome
    s.rect(2, 14, 21, 16, r[1])                    # brim
    s.ellipse(6, 5, 14, 13, r[3], only="opaque")   # lit upper-left
    s.ellipse(12, 8, 18, 16, r[1], only="opaque")  # shade lower-right
    s.px(8, 6, r[4]); s.px(9, 6, r[4]); s.px(8, 7, r[4])
    s.line(2, 14, 21, 14, r[3]); s.line(3, 16, 20, 16, r[0])
    s.line(11, 4, 11, 13, r[4], only="opaque")     # crest ridge
    for x in (5, 11, 17):
        s.px(x, 15, "#eef2f6")                     # rivets
    return finish(s)


def cloth_bandana():
    s = canvas()
    r = ramp("#d23b3b", 5, hue_shift=18)
    s.polygon([(3, 9), (20, 9), (11, 19)], r[2])                 # folded triangle
    s.rect(3, 7, 20, 10, r[2])                                   # band
    s.line(3, 7, 20, 7, r[3]); s.line(4, 8, 19, 8, r[4])
    s.line(3, 10, 20, 10, r[1])
    s.polygon([(12, 11), (19, 11), (12, 18)], r[1], only="opaque")
    # knot + tails on the right
    s.rect(20, 7, 21, 10, r[1])
    s.line(21, 10, 22, 14, r[2]); s.line(20, 11, 20, 15, r[1])
    # polka dots
    for x, y in ((7, 12), (11, 14), (15, 12), (9, 16)):
        s.px(x, y, "#f6e6d0", only="opaque")
    return finish(s)


def lucky_cord():
    s = canvas()
    cord = ramp("#c8423a", 5, hue_shift=18)
    bead = ramp("#e8b83a", 4, hue_shift=20)
    # 2px braided loop seen at an angle: two concentric outlines, lit on top, shaded below
    s.ellipse(3, 6, 20, 17, cord[2], fill=False)
    s.ellipse(4, 7, 19, 16, cord[2], fill=False)
    for x in range(3, 21):
        for y in range(6, 18):
            c = s.get(x, y)
            if c is None:
                continue
            if y <= 9:
                s.px(x, y, cord[3])
            elif y >= 14:
                s.px(x, y, cord[1])
    for x in range(5, 19, 3):  # braid twists
        s.px(x, 6, cord[4]); s.px(x + 1, 17, cord[0])
    s.circle(11, 17, 2, bead[2], fill=True)
    s.px(10, 16, bead[3]); s.px(12, 18, bead[0])
    s.line(11, 20, 11, 22, cord[1]); s.px(10, 22, cord[2]); s.px(12, 22, cord[2])  # tassel
    return finish(s)


def runner_charm():
    s = canvas()
    metal = ramp("#3fb6c8", 5, hue_shift=18)
    wing = ramp("#f4f4ee", 4, hue_shift=10)
    s.line(11, 2, 11, 6, "#7a5a34")  # cord loop
    s.px(10, 2, "#7a5a34"); s.px(12, 2, "#7a5a34")
    s.polygon([(6, 8), (16, 8), (18, 13), (11, 21), (4, 13)], metal[2])  # charm plate
    s.polygon([(6, 8), (11, 8), (8, 14), (5, 13)], metal[3], only="opaque")
    s.polygon([(13, 14), (18, 13), (11, 21)], metal[1], only="opaque")
    for x, y in ((8, 11), (9, 11), (10, 11), (11, 11), (12, 11), (9, 12), (10, 12), (11, 12), (12, 12), (13, 12), (11, 13), (12, 13)):
        s.px(x, y, wing[2])  # winged sneaker emblem
    s.px(8, 10, wing[3]); s.px(13, 13, wing[0]); s.px(14, 12, "#e53935")
    s.px(19, 6, "#e8fbff"); s.px(20, 5, "#e8fbff"); s.px(18, 5, "#e8fbff")
    return finish(s)


def aegis_pendant():
    s = canvas()
    blue = ramp("#2f6fd6", 5, hue_shift=18)
    gold = ramp("#e0b030", 4, hue_shift=20)
    s.line(4, 2, 11, 7, gold[1]); s.line(19, 2, 12, 7, gold[1])  # chain
    for x, y in ((5, 3), (8, 5), (18, 3), (15, 5)):
        s.px(x, y, gold[3])
    s.polygon([(6, 8), (17, 8), (17, 14), (12, 20), (11, 20), (6, 14)], gold[1])
    s.polygon([(8, 10), (15, 10), (15, 14), (12, 18), (11, 18), (8, 14)], blue[2])
    s.polygon([(8, 10), (11, 10), (11, 17), (8, 14)], blue[3], only="opaque")
    s.line(11, 11, 11, 16, gold[2]); s.line(9, 13, 14, 13, gold[2])
    s.px(6, 8, gold[3]); s.px(7, 8, gold[3])
    return finish(s)


def golden_luck_ring():
    s = canvas()
    gold = ramp("#e8b83a", 5, hue_shift=22)
    gem = ramp("#35c46a", 4, hue_shift=20)
    s.circle(11, 14, 6, gold[2])
    s.circle(11, 14, 5, gold[1])
    s.circle(11, 14, 4, None, fill=True)
    s.px(7, 11, gold[4]); s.px(8, 10, gold[4]); s.px(6, 13, gold[3])
    s.px(15, 17, gold[0]); s.px(14, 18, gold[0])
    # gem setting on top
    s.rect(9, 5, 13, 8, gold[1])
    s.ellipse(9, 3, 13, 7, gem[2])
    s.px(10, 4, gem[3]); s.px(10, 5, "#eaffef"); s.px(12, 6, gem[0])
    s.px(17, 3, "#fff6c8"); s.px(18, 4, "#fff6c8"); s.px(16, 4, "#fff6c8"); s.px(17, 5, "#fff6c8")  # glint
    return finish(s)


# --------------------------------------------------------------------------------------------
# Consumables

def potion(color, tall=False):
    s = canvas()
    liq = ramp(color, 5, hue_shift=20)
    glass = ramp("#cfe2ee", 4, hue_shift=10)
    cork = ramp("#a8743e", 4)
    if tall:
        s.rect(8, 9, 15, 21, liq[2]); s.rect(10, 5, 13, 9, glass[1])
        s.rect(9, 9, 10, 20, liq[3], only="opaque"); s.rect(14, 10, 15, 21, liq[1], only="opaque")
        s.line(8, 9, 15, 9, glass[2])
        s.px(9, 11, "#ffffff"); s.px(9, 12, liq[4])
    else:
        s.circle(11, 15, 6, liq[2], fill=True)
        s.rect(10, 5, 13, 9, glass[1])
        s.ellipse(6, 10, 12, 17, liq[3], only="opaque")
        s.ellipse(11, 15, 17, 21, liq[1], only="opaque")
        s.line(6, 12, 16, 12, glass[2], only="opaque")
        s.px(8, 13, "#ffffff"); s.px(8, 14, liq[4]); s.px(9, 13, liq[4])
    s.rect(10, 3, 13, 5, cork[2]); s.px(10, 3, cork[3]); s.px(13, 5, cork[0])
    return finish(s)


def whetstone():
    s = canvas()
    r = ramp("#8f9aa6", 5, hue_shift=14)
    s.polygon([(3, 12), (15, 6), (21, 10), (9, 17)], r[2])
    s.polygon([(3, 12), (9, 17), (9, 20), (3, 15)], r[1])
    s.polygon([(9, 17), (21, 10), (21, 13), (9, 20)], r[0])
    s.line(5, 12, 14, 8, r[4]); s.line(7, 13, 15, 9, r[3])
    s.px(18, 5, "#ffffff"); s.px(19, 4, "#e8f4ff"); s.px(17, 4, "#e8f4ff")
    return finish(s)


def repair_kit():
    s = canvas()
    box = ramp("#c9483a", 5, hue_shift=18)
    metal = ramp("#b8c0c8", 4)
    s.rect(3, 9, 20, 20, box[2])
    s.rect(3, 9, 20, 11, box[3]); s.line(3, 9, 20, 9, box[4])
    s.rect(17, 12, 20, 20, box[1]); s.line(3, 20, 20, 20, box[0])
    s.rect(8, 5, 15, 6, metal[2]); s.rect(8, 6, 9, 9, metal[1]); s.rect(14, 6, 15, 9, metal[1])  # handle
    s.rect(10, 13, 13, 15, metal[2]); s.px(10, 13, metal[3])                                         # latch
    s.line(4, 12, 16, 12, box[1])
    return finish(s)



# --------------------------------------------------------------------------------------------
# Shop line-up (2026-09-23)

def bamboo_spear():
    s = canvas()
    cane = ramp("#8fb84a", 5, hue_shift=18)
    steel = ramp("#c9d2dc", 4, hue_shift=16)
    for t in range(15):
        x, y = 2 + t, 21 - t
        s.px(x, y, cane[2]); s.px(x + 1, y, cane[1])
        if t % 5 == 2:
            s.px(x, y, cane[4]); s.px(x + 1, y, cane[3])          # bamboo nodes
    s.px(16, 7, "#7a4e24"); s.px(17, 6, "#7a4e24")               # binding
    s.polygon([(17, 6), (22, 1), (19, 7)], steel[2])              # leaf-shaped tip
    s.line(18, 5, 21, 2, steel[3]); s.px(21, 1, steel[3])
    return finish(s)


def lanna_dagger():
    s = canvas()
    steel = ramp("#dfe6ee", 5, hue_shift=16)
    horn = ramp("#4a3426", 4)
    gold = ramp("#e0b030", 4, hue_shift=20)
    diag_blade(s, 10, 13, 9, steel, width=3, tip=2)
    for t in (2, 4, 6):
        s.px(10 + t, 13 - t, gold[3])                             # engraved script
    guard(s, 9, 14, 2, gold)
    for k in range(5):                                            # curved horn grip
        s.px(8 - k, 15 + k, horn[2] if k % 2 else horn[3]); s.px(9 - k, 15 + k, horn[1])
    s.px(3, 20, "#f2eee4"); s.px(2, 21, "#f2eee4"); s.px(4, 20, horn[0])
    return finish(s)


def naga_staff():
    s = canvas()
    shaft = ramp("#2f8a7a", 4, hue_shift=18)
    gold = ramp("#e8b83a", 4, hue_shift=22)
    gem = ramp("#6ff0d0", 4, hue_shift=18)
    for t in range(14):
        x, y = 3 + t, 21 - t
        s.px(x, y, shaft[2]); s.px(x + 1, y, shaft[1])
        if t % 3 == 0:
            s.px(x + 1, y - 1, gold[2])                           # scale bands
    # naga head curling over the orb
    s.polygon([(15, 8), (15, 3), (18, 1), (22, 2), (22, 5), (19, 5), (18, 8)], gold[2])
    s.line(16, 3, 18, 2, gold[3]); s.px(20, 3, "#e0303a")        # eye
    s.polygon([(22, 5), (23, 7), (21, 6)], gold[1])               # fangs
    s.circle(19, 9, 2, gem[2], fill=True); s.px(18, 8, "#ffffff"); s.px(20, 10, gem[0])
    return finish(s)


def moat_guard_sword():
    s = canvas()
    steel = ramp("#aab8c8", 5, hue_shift=18)
    rust = ramp("#b85a2a", 4, hue_shift=18)
    rope = ramp("#c8a868", 4)
    diag_blade(s, 8, 15, 12, steel, width=4, tip=3)
    for t in range(1, 10, 2):
        s.px(8 + t, 15 - t, steel[4])
    guard(s, 7, 16, 4, rust)
    for k in range(4):
        s.px(5 - k, 18 + k, rope[3] if k % 2 else rope[1]); s.px(6 - k, 18 + k, rope[0])
    s.px(1, 22, rust[2]); s.px(2, 22, rust[1])
    return finish(s)


def shirt_shape(s, r):
    body = [(6, 4), (9, 3), (14, 3), (17, 4), (22, 9), (19, 12), (17, 10), (17, 21), (6, 21), (6, 10), (4, 12), (1, 9)]
    s.polygon(body, r[2])
    s.polygon([(7, 5), (9, 4), (11, 4), (9, 8), (7, 9), (7, 20), (6, 20), (6, 9)], r[3], only="opaque")
    s.polygon([(15, 5), (16, 11), (16, 20), (13, 20)], r[1], only="opaque")


def indigo_farmer_shirt():
    s = canvas()
    r = ramp("#2a3a88", 5, hue_shift=16)
    shirt_shape(s, r)
    s.line(1, 9, 4, 12, r[3], only="opaque"); s.line(19, 12, 22, 9, r[1], only="opaque")   # long sleeves
    s.polygon([(10, 3), (13, 3), (12, 5), (11, 5)], r[0])                                   # round neck
    for y in range(6, 15, 3):
        s.px(12, y, "#e8e4f0")                                                              # buttons
    red = ramp("#c8423a", 4, hue_shift=18)
    s.rect(6, 15, 17, 16, red[2]); s.line(6, 15, 17, 15, red[3])                           # sash
    s.line(16, 17, 18, 20, red[1]); s.line(15, 17, 16, 20, red[2])
    return finish(s)


def rattan_armor():
    s = canvas()
    r = ramp("#c8a060", 5, hue_shift=16)
    s.polygon([(4, 5), (9, 3), (14, 3), (19, 5), (20, 11), (18, 13), (18, 20), (5, 20), (5, 13), (3, 11)], r[2])
    for y in range(5, 20, 2):                                                               # woven rows
        for x in range(4, 20):
            if (x + y // 2) % 3 == 0:
                s.px(x, y, r[1], only="opaque")
    s.polygon([(5, 6), (9, 4), (10, 4), (7, 10), (6, 12), (6, 19), (5, 19)], r[3], only="opaque")
    s.ellipse(2, 4, 7, 9, r[3]); s.ellipse(16, 4, 21, 9, r[1])                              # shoulder guards
    s.line(9, 4, 14, 4, "#6a4424"); s.line(5, 17, 18, 17, "#6a4424")
    return finish(s)


def farmer_straw_hat():
    s = canvas()
    r = ramp("#e0c070", 5, hue_shift=18)
    s.polygon([(1, 17), (11, 4), (12, 4), (22, 17)], r[2])                                  # conical ngob
    s.polygon([(1, 17), (11, 4), (11, 17)], r[3], only="opaque")
    for k in range(6, 17, 3):
        s.line(12 - (k - 4) * 10 // 13, k, 11 + (k - 4) * 10 // 13, k, r[1], only="opaque")  # weave rings
    s.rect(4, 17, 19, 18, r[1]); s.line(2, 17, 21, 17, r[3])
    s.line(8, 19, 11, 21, "#8a5a2e"); s.line(15, 19, 12, 21, "#8a5a2e")                     # chin strap
    return finish(s)


def bronze_helm():
    s = canvas()
    r = ramp("#c88a3a", 5, hue_shift=18)
    s.ellipse(5, 5, 18, 17, r[2])
    s.rect(2, 14, 21, 16, r[1])
    s.ellipse(6, 6, 14, 13, r[3], only="opaque")
    s.ellipse(12, 9, 18, 16, r[1], only="opaque")
    s.line(2, 14, 21, 14, r[3]); s.line(3, 16, 20, 16, r[0])
    for x in (5, 11, 17):
        s.px(x, 15, "#ffe08a")
    plume = ramp("#d8323a", 4, hue_shift=18)
    s.polygon([(10, 5), (11, 0), (15, 1), (13, 5)], plume[2]); s.line(11, 1, 14, 1, plume[3])   # plume
    s.line(6, 10, 9, 12, r[0], only="opaque")                                               # old sword scar
    return finish(s)


def jasmine_garland():
    s = canvas()
    leaf = ramp("#3a9a3a", 4, hue_shift=20)
    s.ellipse(3, 3, 20, 18, leaf[1], fill=False)
    for i in range(12):
        import math
        a = i / 12 * math.tau
        x, y = round(11.5 + math.cos(a) * 8), round(10.5 + math.sin(a) * 7)
        s.circle(x, y, 1, "#fbf8ee", fill=True); s.px(x - 1, y - 1, "#ffffff"); s.px(x + 1, y + 1, "#d8d0bc")
    red = ramp("#e0303a", 4)
    s.rect(10, 17, 13, 19, red[2]); s.line(11, 20, 10, 23, red[1]); s.line(12, 20, 13, 23, red[2])  # tassel
    s.px(11, 18, "#f2c230")
    return finish(s)


def elephant_amulet():
    s = canvas()
    stone = ramp("#b8bec8", 5, hue_shift=14)
    gold = ramp("#e0b030", 4, hue_shift=20)
    bg = ramp("#8a2a3a", 4, hue_shift=16)
    s.line(5, 1, 10, 5, gold[1]); s.line(18, 1, 13, 5, gold[1])
    s.circle(11, 13, 9, gold[2], fill=True); s.circle(11, 13, 8, bg[1], fill=True)
    s.px(5, 8, gold[3]); s.px(6, 7, gold[3])
    s.ellipse(4, 10, 14, 17, stone[2])                       # body
    s.ellipse(12, 7, 18, 14, stone[3])                       # head
    s.ellipse(4, 10, 9, 14, stone[3], only="opaque")
    s.rect(17, 12, 18, 18, stone[2]); s.px(16, 18, stone[2]) # trunk
    s.ellipse(10, 8, 13, 13, stone[1])                       # ear
    for x in (5, 8, 11):
        s.rect(x, 17, x + 1, 19, stone[1])                   # legs
    s.px(15, 9, "#1c1a28"); s.px(16, 14, "#fff6e0"); s.px(15, 15, "#fff6e0")   # eye, tusk
    return finish(s)


# --------------------------------------------------------------------------------------------
# Monster junk & boss trophies (sold at shops)

def blob(base, shine="#ffffff"):
    s = canvas()
    r = ramp(base, 5, hue_shift=18)
    s.ellipse(4, 9, 19, 20, r[2]); s.ellipse(8, 5, 15, 14, r[2])
    s.ellipse(5, 10, 11, 17, r[3], only="opaque"); s.ellipse(12, 14, 19, 20, r[1], only="opaque")
    s.px(8, 8, shine); s.px(9, 8, shine); s.px(8, 9, r[4])
    s.circle(18, 7, 1, r[3], fill=True); s.circle(3, 21, 1, r[2], fill=True)                # drips
    return finish(s)


def feather(base):
    s = canvas()
    r = ramp(base, 5, hue_shift=12)
    s.polygon([(5, 19), (7, 12), (11, 6), (16, 2), (20, 3), (18, 9), (13, 15), (8, 18)], r[2])
    s.polygon([(5, 19), (7, 12), (11, 6), (16, 2), (12, 11)], r[3], only="opaque")
    s.polygon([(12, 11), (20, 3), (18, 9), (13, 15)], r[1], only="opaque")
    s.line(3, 22, 18, 4, "#f2f2f8")                          # quill
    for x, y in ((9, 16), (14, 12), (16, 6)):
        s.px(x, y, None)                                     # splits in the vane
    s.px(14, 5, r[4])
    return finish(s)


def curl_tail(base, spots=None):
    s = canvas()
    r = ramp(base, 5, hue_shift=16)
    # thick root at the lower left, tapering into a hook at the top right
    pts = [(4, 20, 3), (6, 17, 3), (8, 15, 2), (11, 14, 2), (14, 13, 2), (16, 11, 1), (18, 9, 1), (19, 7, 1), (19, 5, 1), (17, 4, 1), (16, 5, 0)]
    for x, y, rad in pts:
        s.circle(x, y, rad, r[2], fill=True)
    for x, y, rad in pts:
        s.px(x - 1, y - rad, r[3])
    s.ellipse(2, 19, 6, 23, r[1])                             # cut end
    s.px(4, 21, r[0])
    if spots:
        for x, y in ((6, 16), (10, 14), (14, 12), (18, 8)):
            s.px(x, y, spots)
    return finish(s)


def fur_ball():
    s = canvas()
    r = ramp("#3a3448", 5, hue_shift=18)
    s.circle(11, 12, 8, r[2], fill=True)
    import random
    g = random.Random(4)
    for _ in range(40):
        x, y = g.randint(4, 18), g.randint(5, 19)
        s.px(x, y, r[g.choice((1, 3))], only="opaque")
    for x, y in ((3, 10), (19, 8), (6, 20), (17, 19), (11, 3)):
        s.px(x, y, r[2])                                                                   # stray hairs
    s.ellipse(6, 7, 11, 11, r[4], only="opaque")
    return finish(s)


def mandible():
    s = canvas()
    r = ramp("#c8322a", 5, hue_shift=18)
    for side in (-1, 1):
        cx = 11 + side * 4
        s.circle(cx, 16, 3, r[2], fill=True)
        for t in range(8):
            s.px(cx - side * (t // 3), 13 - t, r[3] if t < 6 else r[1])
            s.px(cx - side * (t // 3) + side, 13 - t, r[1])
    s.px(7, 15, r[4]); s.px(14, 15, r[4])
    return finish(s)


def old_collar():
    s = canvas()
    leather = ramp("#8a4a26", 5, hue_shift=14)
    s.ellipse(3, 5, 20, 16, leather[2], fill=False); s.ellipse(4, 6, 19, 15, leather[2], fill=False)
    s.ellipse(3, 5, 20, 8, leather[3], fill=False, only="opaque")
    for x, y in ((6, 13), (15, 6), (18, 11)):
        s.px(x, y, "#c8742a")                                                              # rust
    gold = ramp("#e0b030", 4, hue_shift=20)
    s.circle(11, 18, 3, gold[2], fill=True); s.px(10, 17, gold[3]); s.px(11, 20, gold[0]); s.line(9, 18, 13, 18, gold[1])
    return finish(s)


def straw_bundle():
    s = canvas()
    r = ramp("#e0c060", 5, hue_shift=18)
    for x in range(5, 19):
        top = 3 + abs(x - 11) // 2
        s.line(x, top, x + (x - 11) // 3, 21, r[2 if x % 2 else 3])
    s.rect(4, 11, 19, 13, "#8a5a2e"); s.line(4, 11, 19, 11, "#a87850")
    return finish(s)


def scale(base):
    s = canvas()
    r = ramp(base, 5, hue_shift=20)
    s.polygon([(11, 3), (19, 9), (18, 17), (11, 21), (4, 17), (3, 9)], r[2])
    s.polygon([(11, 3), (3, 9), (4, 17), (11, 12)], r[3], only="opaque")
    s.polygon([(11, 12), (18, 17), (11, 21)], r[1], only="opaque")
    for k in range(3):
        s.line(6 + k * 2, 16 - k, 16 - k * 2, 16 - k, r[4 if k == 0 else 3], only="opaque")  # growth rings
    s.px(8, 7, "#ffffff")
    return finish(s)


def glow_leaf():
    s = canvas()
    r = ramp("#58d06a", 5, hue_shift=20)
    s.polygon([(3, 20), (6, 10), (13, 4), (21, 3), (18, 11), (12, 18)], r[2])
    s.polygon([(3, 20), (6, 10), (13, 4), (10, 13)], r[3], only="opaque")
    s.line(3, 20, 19, 4, r[4])
    for x, y in ((2, 8), (20, 14), (8, 2)):
        s.px(x, y, "#e8ffb0")                                                             # glow motes
    return finish(s)


def jar(liquid, dots):
    s = canvas()
    glass = ramp("#cfe2ee", 4, hue_shift=10)
    s.rect(6, 7, 17, 21, glass[1]); s.rect(7, 8, 16, 20, liquid)
    for x, y in dots:
        s.px(x, y, "#fff6a8")
    s.line(7, 8, 7, 20, glass[3]); s.rect(8, 4, 15, 6, "#a8743e"); s.line(8, 4, 15, 4, "#c89454")
    return finish(s)


def rusty_bolt():
    s = canvas()
    r = ramp("#a8683a", 5, hue_shift=14)
    s.polygon([(3, 7), (8, 3), (13, 5), (13, 10), (8, 13), (3, 11)], r[2])  # hex head
    s.polygon([(3, 7), (8, 3), (8, 8), (3, 11)], r[3], only="opaque")
    s.polygon([(8, 8), (13, 10), (8, 13)], r[1], only="opaque")
    for t in range(9):                                        # threaded shaft
        x, y = 11 + t, 11 + t
        s.px(x, y, r[2]); s.px(x + 1, y, r[1]); s.px(x, y + 1, r[1])
        if t % 2 == 0:
            s.px(x + 1, y - 1, r[3])
    for x, y in ((5, 9), (10, 6), (15, 15)):
        s.px(x, y, "#d8743a")                                 # rust spots
    return finish(s)


def crab_shell():
    s = canvas()
    r = ramp("#d8502a", 5, hue_shift=18)
    s.ellipse(2, 7, 21, 20, r[2])
    s.ellipse(4, 8, 13, 15, r[3], only="opaque"); s.ellipse(12, 13, 21, 20, r[1], only="opaque")
    for x in (6, 11, 16):
        s.px(x, 11, r[4]); s.px(x + 1, 12, r[0])                                           # armor bumps
    s.line(3, 16, 20, 16, r[0])
    return finish(s)


def bat_wing():
    s = canvas()
    mem = ramp("#e05ab8", 5, hue_shift=24)
    s.polygon([(2, 5), (20, 3), (21, 8), (17, 11), (14, 9), (11, 14), (8, 11), (4, 16)], mem[2])
    s.line(2, 5, 20, 3, "#2a2838"); s.line(8, 4, 8, 11, "#2a2838"); s.line(14, 3, 14, 9, "#2a2838")
    s.polygon([(3, 6), (8, 5), (8, 10), (5, 13)], mem[3], only="opaque")
    for x, y in ((11, 6), (17, 6)):
        s.px(x, y, "#7ff0ff")                                                             # neon glow
    return finish(s)


def python_skin():
    s = canvas()
    r = ramp("#d8c898", 5, hue_shift=14)
    for t in range(18):                                       # a flat shed skin winding up
        x = 3 + t
        y = 19 - t + (3 if (t // 4) % 2 else 0)
        s.rect(x, y - 2, x, y + 1, r[2])
        s.px(x, y - 2, r[3]); s.px(x, y + 1, r[1])
        if t % 3 == 1:
            s.px(x, y - 1, "#8a6a3a"); s.px(x, y, "#a8844a")  # scale pattern
    return finish(s)


def spirit_wisp():
    s = canvas()
    r = ramp("#8fd8ff", 5, hue_shift=22)
    s.polygon([(11, 1), (15, 8), (17, 14), (14, 20), (8, 20), (5, 14), (8, 9), (10, 11)], r[2])
    s.polygon([(11, 5), (13, 11), (12, 18), (9, 17), (8, 13)], r[3], only="opaque")
    s.ellipse(9, 13, 13, 18, "#ffffff", only="opaque")
    s.px(9, 14, "#2a2838"); s.px(12, 14, "#2a2838")                                       # little face
    return finish(s)


def stone_chip():
    s = canvas()
    r = ramp("#9aa0a8", 5, hue_shift=14)
    s.polygon([(3, 12), (8, 4), (17, 3), (21, 10), (17, 19), (7, 20)], r[2])
    s.polygon([(3, 12), (8, 4), (12, 8), (7, 14)], r[3], only="opaque")
    s.polygon([(12, 12), (21, 10), (17, 19)], r[1], only="opaque")
    s.line(9, 11, 15, 9, r[0]); s.line(10, 13, 16, 11, r[0]); s.px(12, 10, "#e0b030")   # old carving
    return finish(s)


def crown_shard():
    s = canvas()
    gold = ramp("#d8b030", 5, hue_shift=22)
    s.polygon([(3, 19), (4, 9), (8, 13), (11, 5), (14, 13), (17, 8), (19, 19)], gold[2])
    s.polygon([(3, 19), (4, 9), (8, 13), (11, 5), (11, 19)], gold[3], only="opaque")
    for x in (6, 11, 16):
        s.circle(x, 16, 1, "#3aa06a", fill=True)                                          # bottle-cap "gems"
    s.line(3, 19, 19, 19, gold[0]); s.polygon([(17, 8), (19, 19), (21, 15)], gold[1])       # broken edge
    return finish(s)


def price_tag():
    s = canvas()
    gold = ramp("#f2c230", 5, hue_shift=22)
    s.polygon([(7, 3), (20, 3), (20, 20), (7, 20), (3, 11)], gold[2])
    s.polygon([(7, 3), (13, 3), (13, 20), (7, 20), (3, 11)], gold[3], only="opaque")
    s.circle(7, 11, 1, None, fill=True)
    s.px(7, 11, "#1c1a28"); s.line(6, 10, 2, 6, "#e0303a")                                 # string
    for x, y in ((12, 8), (17, 15), (16, 8), (13, 15)):
        s.px(x, y, "#c8322a")
    s.line(12, 16, 17, 7, "#c8322a")                                                      # "%"
    return finish(s)


def octane_core():
    s = canvas()
    metal = ramp("#8a90a8", 5, hue_shift=14)
    s.rect(6, 3, 17, 21, metal[2]); s.rect(6, 3, 8, 21, metal[3]); s.rect(15, 3, 17, 21, metal[1])
    glow = ramp("#ffc83a", 4, hue_shift=22)
    s.rect(8, 7, 15, 17, glow[2]); s.rect(9, 8, 11, 16, glow[3]); s.px(9, 9, "#ffffff")
    for y in (3, 21):
        s.line(5, y, 18, y, metal[0])
    s.px(20, 5, "#fff6a8"); s.px(3, 18, "#fff6a8")
    return finish(s)


def gold_leaf():
    s = canvas()
    gold = ramp("#f2c230", 5, hue_shift=22)
    s.polygon([(4, 7), (17, 3), (20, 14), (8, 20)], gold[2])
    s.polygon([(4, 7), (17, 3), (11, 11)], gold[4], only="opaque")
    s.line(8, 14, 16, 8, gold[3]); s.px(19, 13, gold[0]); s.px(9, 19, gold[1])
    for x, y in ((2, 3), (21, 20), (14, 21)):
        s.px(x, y, "#fff6c8")
    return finish(s)


def ancient_bark():
    s = canvas()
    bark = ramp("#7a5030", 5, hue_shift=14)
    s.polygon([(3, 7), (19, 3), (21, 16), (6, 21)], bark[2])
    for k in range(4):
        s.line(4 + k * 4, 7 - k, 7 + k * 4, 20 - k, bark[1 if k % 2 else 3], only="opaque")   # grain
    s.ellipse(9, 9, 15, 14, bark[3], fill=False, only="opaque"); s.px(12, 11, bark[0])      # rings
    s.px(17, 6, "#3a9a3a"); s.px(18, 7, "#3a9a3a")                                          # moss
    return finish(s)


ICONS = {
    "cotton_shirt": cotton_shirt,
    "training_sword": training_sword,
    "apprentice_staff": lambda: staff("knob"),
    "cloth_bandana": cloth_bandana,
    "pixel_broadsword": pixel_broadsword,
    "convenience_club": convenience_club,
    "starlight_staff": lambda: staff("star"),
    "iron_helm": iron_helm,
    "fuel_plate": fuel_plate,
    "lucky_cord": lucky_cord,
    "runner_charm": runner_charm,
    "aegis_pendant": aegis_pendant,
    "golden_luck_ring": golden_luck_ring,
    "red_potion": lambda: potion("#d8323c"),
    "blue_elixir": lambda: potion("#2f7fe0", tall=True),
    "whetstone": whetstone,
    "master_repair_kit": repair_kit,
    "bamboo_spear": bamboo_spear,
    "lanna_dagger": lanna_dagger,
    "naga_staff": naga_staff,
    "moat_guard_sword": moat_guard_sword,
    "indigo_farmer_shirt": indigo_farmer_shirt,
    "rattan_armor": rattan_armor,
    "farmer_straw_hat": farmer_straw_hat,
    "bronze_helm": bronze_helm,
    "jasmine_garland": jasmine_garland,
    "elephant_amulet": elephant_amulet,
    "slime_goo": lambda: blob("#4a9ae8"),
    "pigeon_feather": lambda: feather("#9aa4b8"),
    "rat_tail": lambda: curl_tail("#e0909a"),
    "cat_fur": fur_ball,
    "ant_mandible": mandible,
    "old_collar": old_collar,
    "straw_bundle": straw_bundle,
    "fish_scale": lambda: scale("#e8b83a"),
    "gecko_tail": lambda: curl_tail("#7a8ab8", spots="#f08a24"),
    "glow_leaf": glow_leaf,
    "firefly_dust": lambda: jar("#3a3a58", [(9, 11), (12, 14), (14, 10), (10, 17), (13, 18), (15, 15)]),
    "rusty_bolt": rusty_bolt,
    "crab_shell": crab_shell,
    "bat_wing": bat_wing,
    "python_skin": python_skin,
    "ember_scale": lambda: scale("#e0482a"),
    "spirit_wisp": spirit_wisp,
    "stone_chip": stone_chip,
    "goblin_crown_shard": crown_shard,
    "gold_price_tag": price_tag,
    "octane_core": octane_core,
    "guardian_gold_leaf": gold_leaf,
    "ancient_bark": ancient_bark,
}

def main():
    os.makedirs(OUT, exist_ok=True)
    rendered = {}
    for name, fn in ICONS.items():
        s = fn()
        s.save_png(os.path.join(OUT, f"{name}.png"))
        rendered[name] = s.composite(1)
    for f in os.listdir(OUT):  # remove icons of items that no longer exist (and old slot ghosts)
        if f.endswith(".png") and f[:-4] not in rendered:
            os.remove(os.path.join(OUT, f))

    # Review sheets: 8x preview with labels, and silhouettes.
    names = list(rendered)
    imgs = list(rendered.values())
    Z, cols = 8, 6
    cell = S * Z + 16
    rows = (len(imgs) + cols - 1) // cols
    for kind in ("preview", "silhouette"):
        sheet = Image.new("RGBA", (cols * cell, rows * (cell + 14)), (232, 228, 218, 255))
        d = ImageDraw.Draw(sheet)
        for i, (n, im) in enumerate(zip(names, imgs)):
            x, y = (i % cols) * cell + 8, (i // cols) * (cell + 14) + 8
            if kind == "silhouette":
                im = Image.eval(im, lambda v: v).copy()
                px = im.load()
                for yy in range(S):
                    for xx in range(S):
                        if px[xx, yy][3]:
                            px[xx, yy] = (34, 36, 46, 255)
            else:
                d.rectangle([x - 2, y - 2, x + S * Z + 1, y + S * Z + 1], fill=(250, 250, 252, 255))
            sheet.alpha_composite(im.resize((S * Z, S * Z), Image.NEAREST), (x, y))
            d.text((x, y + S * Z + 2), n, fill=(40, 40, 50, 255))
        sheet.save(os.path.join(HERE, f"{kind}.png"))
    # 2x strip at true game display size, on the UI's window colour
    strip = Image.new("RGBA", (len(rendered) * 52 + 4, 56), (238, 242, 248, 255))
    for i, im in enumerate(rendered.values()):
        strip.alpha_composite(im.resize((48, 48), Image.NEAREST), (4 + i * 52, 4))
    strip.save(os.path.join(HERE, "strip2x.png"))
    print("OK", len(rendered), "icons")


if __name__ == "__main__":
    main()
