#!/usr/bin/env python3
"""
Home interior: a Lanna teak-house room (panelled walls, window onto Doi Suthep, paper lanterns)
plus separate furniture sprites the player taps (each with a glowing "_hi" hover version).
Front view, designed on a 176x120 grid and drawn 32-bit at 2x (352x240) by kit2x.Canvas2x
(2026-09-26, MASTER_SPEC §5C) — furniture gets a bevel pass; home.json is in 2x room pixels.

    python pixel-art/home/build.py

Outputs apps/game/public/assets/home/{room,<id>,<id>_hi}.png + home.json (positions) and preview.png here.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite, ramp  # noqa: E402
from PIL import Image  # noqa: E402

sys.path.insert(0, os.path.join(ROOT, "pixel-art"))
from kit2x import K, Canvas2x, bevel  # noqa: E402

OUT = os.path.join(ROOT, "apps", "game", "public", "assets", "home")
INK = "#1c1a28"
GLOW = (255, 227, 106, 255)
RW, RH = 176, 120
FLOOR_Y = 68


def R(base, n=5, hs=16):
    return ramp(base, n, hue_shift=hs)


TEAK = R("#a86a3c", hs=12)
DARK = R("#6a3f22", hs=10)
GOLD = R("#f2c230", 5, 22)


# ---------------------------------------------------------------------------------------------
# Room (static background)

def room():
    s = Canvas2x(RW, RH)
    # Ceiling beam + panelled walls (fa pakon)
    s.rect(0, 0, RW - 1, FLOOR_Y - 1, TEAK[1])
    for x0 in range(0, RW, 22):
        x1 = min(RW - 1, x0 + 21)
        for y0, y1 in ((9, 34), (37, 63)):
            s.rect(x0 + 3, y0, x1 - 1, y1, TEAK[2])
            s.line(x0 + 3, y0, x1 - 1, y0, TEAK[3]); s.line(x0 + 3, y0, x0 + 3, y1, TEAK[3])
            s.line(x0 + 3, y1, x1 - 1, y1, TEAK[0]); s.line(x1 - 1, y0, x1 - 1, y1, TEAK[0])
            s.rect(x0 + 6, y0 + 3, x1 - 4, y1 - 3, TEAK[2]); s.line(x0 + 6, y1 - 3, x1 - 4, y1 - 3, TEAK[1])
            s.line(x0 + 7, y0 + 4, x0 + 7, y1 - 5, TEAK[3])   # grain
        s.rect(x0, 0, x0 + 2, FLOOR_Y - 1, TEAK[1]); s.line(x0 + 1, 0, x0 + 1, FLOOR_Y - 1, TEAK[2])
    s.rect(0, 0, RW - 1, 6, DARK[1]); s.line(0, 6, RW - 1, 6, DARK[0]); s.line(0, 1, RW - 1, 1, DARK[3])
    s.rect(0, 35, RW - 1, 36, TEAK[1])                                   # mid rail
    s.rect(0, FLOOR_Y - 4, RW - 1, FLOOR_Y - 1, DARK[2]); s.line(0, FLOOR_Y - 4, RW - 1, FLOOR_Y - 4, DARK[3])  # skirting

    # Window onto the mountain (x 70..113), shutters open
    wx0, wx1, wy0, wy1 = 70, 113, 12, 46
    sky = R("#7ec4f0", hs=8)
    s.gradient_dither(wx0, wy0, wx1, wy1, ["#a8dcff", "#cfeeff", "#fff2d8"], axis="v")
    s.circle(102, 22, 4, "#fff6c8", fill=True); s.circle(102, 22, 3, "#ffffff", fill=True)       # morning sun
    for cx, cy in ((80, 19), (86, 18), (91, 20)):
        s.circle(cx, cy, 2, "#ffffff", fill=True)                                                # cloud
    s.polygon([(wx0, 40), (78, 31), (86, 27), (95, 30), (104, 34), (wx1, 38), (wx1, wy1), (wx0, wy1)], "#6f7fc0")
    s.polygon([(wx0, 43), (82, 37), (96, 39), (wx1, 41), (wx1, wy1), (wx0, wy1)], "#5a9a5a")
    s.polygon([(85, 27), (86, 23), (87, 27)], GOLD[3]); s.px(86, 22, GOLD[4])                     # chedi on the hill
    s.dither(wx0, 44, wx1, wy1, "#4a8a4a", "#5a9a5a", 0.5)
    s.rect(wx0 - 3, wy0 - 3, wx1 + 3, wy0 - 1, DARK[2]); s.rect(wx0 - 3, wy1 + 1, wx1 + 3, wy1 + 3, DARK[2])
    s.rect(wx0 - 3, wy0 - 3, wx0 - 1, wy1 + 3, DARK[2]); s.rect(wx1 + 1, wy0 - 3, wx1 + 3, wy1 + 3, DARK[2])
    s.line(91, wy0, 91, wy1, DARK[2]); s.line(wx0, 29, wx1, 29, DARK[2])                          # muntins
    s.line(wx0 - 3, wy0 - 3, wx1 + 3, wy0 - 3, DARK[3])
    s.rect(wx0 - 5, wy1 + 3, wx1 + 5, wy1 + 5, TEAK[3]); s.line(wx0 - 5, wy1 + 5, wx1 + 5, wy1 + 5, DARK[1])  # sill
    for sx in (wx0 - 11, wx1 + 4):                                                                # curtains
        cur = R("#c8424a", hs=14)
        s.rect(sx, wy0 - 4, sx + 6, wy1 + 1, cur[2]); s.line(sx + 2, wy0 - 3, sx + 2, wy1, cur[1]); s.line(sx + 5, wy0 - 3, sx + 5, wy1, cur[3])
        s.rect(sx - 1, wy0 + 20, sx + 7, wy0 + 21, GOLD[2])
    s.rect(wx0 - 13, wy0 - 6, wx1 + 12, wy0 - 5, DARK[0])                                         # curtain rod
    s.px(wx0 + 12, wy1 + 2, "#e8507a"); s.px(wx0 + 13, wy1 + 1, "#e8507a"); s.px(wx0 + 12, wy1 + 1, "#3a9a3a")  # jasmine in a cup
    s.rect(wx0 + 11, wy1 + 2, wx0 + 14, wy1 + 2, "#d8d0bc")

    # Floor planks + rug
    fl = R("#b8844a", hs=12)
    s.rect(0, FLOOR_Y, RW - 1, RH - 1, fl[2])
    for i, y in enumerate(range(FLOOR_Y, RH, 6)):
        s.line(0, y, RW - 1, y, fl[1]); s.line(0, y + 1, RW - 1, y + 1, fl[3])
        for x in range((i * 23) % 40, RW, 40):
            s.line(x, y, x, y + 5, fl[1])
    s.noise(0, FLOOR_Y, RW - 1, RH - 1, fl[1], density=0.03, seed=7)
    rug = R("#b8323a", hs=14)
    s.rect(52, 84, 126, 114, rug[2]); s.rect(52, 84, 126, 85, rug[3])
    s.rect(55, 87, 123, 111, GOLD[2], fill=False); s.rect(57, 89, 121, 109, rug[1], fill=False)
    for x in range(62, 120, 8):
        s.polygon([(x, 99), (x + 3, 96), (x + 6, 99), (x + 3, 102)], GOLD[2])
        s.px(x + 3, 99, rug[4])
    for x in range(53, 126, 3):
        s.px(x, 115, GOLD[1])

    # Hanging Lanna paper lanterns
    for lx in (30, 146):
        s.line(lx, 7, lx, 12, DARK[0])
        lan = R("#f08a24", hs=18)
        s.ellipse(lx - 5, 13, lx + 5, 25, lan[2]); s.ellipse(lx - 5, 13, lx - 1, 25, lan[3], only="opaque")
        s.line(lx - 5, 19, lx + 5, 19, lan[1])
        s.rect(lx - 3, 12, lx + 3, 13, DARK[1]); s.rect(lx - 3, 25, lx + 3, 26, DARK[1])
        s.line(lx, 27, lx, 30, "#e0303a"); s.px(lx - 1, 30, "#e0303a"); s.px(lx + 1, 30, "#e0303a")
        s.px(lx - 2, 16, "#fff2c8")

    # Potted plant between window and shelf
    s.rect(119, 60, 126, 67, "#b85a36"); s.line(119, 60, 126, 60, "#d87a4a"); s.line(126, 61, 126, 67, "#8a3a22")
    leaf = R("#3a9a3a", hs=20)
    for (x0, y0, x1, y1) in ((122, 59, 119, 50), (123, 59, 126, 48), (122, 59, 122, 46), (123, 59, 125, 53)):
        s.line(x0, y0, x1, y1, leaf[2]); s.px(x1, y1, leaf[3])
    s.outline(INK, where="inside")
    return s


# ---------------------------------------------------------------------------------------------
# Furniture (each drawn with a 2 px margin so the glow outline fits)

def done(s):
    s.outline(INK, where="outside")
    return s


def bed():
    s = Canvas2x(52, 28)
    s.rect(2, 4, 7, 25, DARK[2]); s.line(2, 4, 7, 4, DARK[3]); s.line(3, 4, 3, 25, DARK[3])          # headboard
    s.rect(44, 12, 49, 25, DARK[2]); s.line(44, 12, 49, 12, DARK[3])                                  # footboard
    s.rect(8, 16, 43, 21, DARK[1]); s.rect(8, 22, 43, 23, DARK[0])                                    # frame
    s.rect(8, 11, 43, 16, "#f2eee4"); s.line(8, 11, 43, 11, "#ffffff")                                # mattress
    s.ellipse(9, 7, 20, 13, "#fff8ec"); s.line(11, 8, 17, 8, "#ffffff"); s.line(10, 12, 19, 12, "#d8d0bc")  # pillow
    # pha khao ma (plaid) blanket
    s.rect(20, 10, 43, 18, "#3a6ac8")
    for x in range(21, 44, 4):
        s.line(x, 10, x, 18, "#e0303a")
    for y in (12, 15):
        s.line(20, y, 43, y, "#f2c230")
    s.line(20, 10, 43, 10, "#6a9aff")
    s.rect(4, 24, 5, 25, DARK[0]); s.rect(46, 24, 47, 25, DARK[0])
    return done(s)


def mirror():
    s = Canvas2x(24, 48)
    s.rect(2, 3, 21, 45, DARK[2]); s.line(2, 3, 21, 3, DARK[3]); s.line(2, 3, 2, 45, DARK[3]); s.line(21, 4, 21, 45, DARK[0])
    s.polygon([(2, 3), (11, 0), (12, 0), (21, 3)], GOLD[2])                                           # carved crest
    s.rect(5, 7, 18, 33, "#9ad4e8"); s.line(5, 7, 18, 7, "#d8f4ff")
    for i in range(6):
        s.px(7 + i, 17 - i, "#ffffff"); s.px(8 + i, 20 - i, "#e8faff")                                 # shine
    s.rect(5, 36, 18, 43, DARK[1]); s.line(5, 36, 18, 36, DARK[3]); s.px(11, 40, GOLD[3]); s.px(12, 40, GOLD[3])  # drawer
    return done(s)


def shelf():
    s = Canvas2x(30, 45)
    s.rect(2, 2, 27, 42, DARK[1]); s.rect(4, 4, 25, 40, DARK[0])
    s.line(2, 2, 27, 2, DARK[3]); s.line(2, 2, 2, 42, DARK[3])
    for y in (15, 27, 40):
        s.rect(3, y, 26, y + 1, TEAK[3])
    # shelf 1: potions
    for i, c in enumerate(("#e0303a", "#3a7ae8", "#e0303a", "#48c060")):
        x = 6 + i * 5
        s.rect(x, 9, x + 3, 14, c); s.px(x + 1, 8, "#d8d0bc"); s.px(x + 1, 7, "#8a5a3a"); s.px(x, 10, "#ffffff")
    # shelf 2: jars and a scroll
    s.rect(6, 20, 11, 26, "#d8b878"); s.rect(6, 19, 11, 19, "#8a5a3a")
    s.rect(14, 21, 18, 26, "#8fc8e0"); s.px(15, 22, "#ffffff")
    s.rect(20, 23, 24, 26, "#f2eee4"); s.line(20, 23, 24, 23, "#d8d0bc"); s.px(22, 24, "#e0303a")
    # shelf 3: basket of sticky rice + bag
    s.ellipse(5, 33, 13, 39, "#c8a060"); s.line(6, 35, 12, 35, "#a07840")
    s.rect(16, 32, 24, 39, "#8a5a3a"); s.line(16, 32, 24, 32, "#a87850"); s.px(20, 35, GOLD[3])
    # price sign
    s.rect(9, 0, 20, 4, GOLD[2]); s.line(9, 0, 20, 0, GOLD[3]); s.px(14, 2, DARK[0]); s.px(15, 2, DARK[0])
    return done(s)


def door():
    s = Canvas2x(20, 44)
    s.rect(2, 2, 17, 41, DARK[1])
    s.rect(4, 4, 15, 41, TEAK[2]); s.line(4, 4, 15, 4, TEAK[3]); s.line(4, 4, 4, 41, TEAK[3])
    for y0, y1 in ((7, 19), (23, 38)):
        s.rect(6, y0, 13, y1, TEAK[1], fill=False)
    s.px(13, 23, GOLD[4]); s.px(13, 24, GOLD[2]); s.px(12, 24, GOLD[1])                             # handle
    s.polygon([(2, 2), (9, 0), (10, 0), (17, 2)], GOLD[2])
    return done(s)


def cauldron():
    s = Canvas2x(26, 26)
    fire = R("#f08a24", hs=24)
    s.polygon([(7, 25), (10, 17), (13, 22), (16, 16), (19, 25)], fire[2])                           # flames
    s.polygon([(10, 25), (12, 20), (14, 25)], fire[4])
    s.line(4, 24, 21, 24, "#6a4a3a"); s.line(5, 25, 20, 25, "#4a3a2a")                               # logs
    s.ellipse(3, 6, 22, 21, "#3a3848"); s.ellipse(3, 6, 12, 21, "#4a4a5a", only="opaque")
    s.ellipse(4, 5, 21, 10, "#2a2838"); s.ellipse(6, 6, 19, 9, "#58d06a"); s.line(8, 7, 12, 7, "#a8f0a8")
    for x, y, r in ((9, 3, 1), (15, 1, 2), (18, 4, 1)):
        s.circle(x, y, r, "#8ae88a"); s.px(x, y - r, "#e8ffe8")                                       # bubbles
    s.line(4, 12, 5, 12, "#6a6a7a")
    return done(s)


def chest():
    s = Canvas2x(26, 21)
    wood = R("#8a4a26", hs=12)
    s.rect(2, 8, 23, 19, wood[2]); s.line(2, 8, 23, 8, wood[3])
    s.ellipse(2, 2, 23, 12, wood[3]); s.rect(2, 7, 23, 9, wood[2]); s.line(4, 3, 20, 3, wood[4])      # lid
    s.line(2, 9, 23, 9, DARK[0])
    for x in (5, 19):
        s.rect(x, 3, x + 1, 19, GOLD[2]); s.line(x, 3, x, 19, GOLD[3])                                # gold bands
    s.rect(10, 8, 15, 13, GOLD[2]); s.rect(12, 10, 13, 12, DARK[0]); s.px(11, 9, GOLD[4])           # lock
    for x, y in ((8, 14), (17, 15), (7, 17)):
        s.px(x, y, wood[1])
    return done(s)


def workbench():
    s = Canvas2x(44, 30)
    s.rect(2, 11, 41, 14, TEAK[3]); s.line(2, 11, 41, 11, TEAK[4]); s.rect(2, 15, 41, 16, DARK[1])   # table top
    for x in (4, 37):
        s.rect(x, 17, x + 2, 27, DARK[2]); s.line(x, 17, x, 27, DARK[3])
    s.rect(6, 22, 36, 23, DARK[1])                                                                    # stretcher
    stl = R("#8a90a8", hs=10)
    s.rect(24, 5, 37, 7, stl[2]); s.line(24, 5, 37, 5, stl[4]); s.polygon([(20, 5), (24, 5), (24, 7)], stl[3])  # anvil
    s.rect(27, 8, 34, 10, stl[1]); s.rect(29, 8, 32, 10, stl[1])
    s.rect(7, 7, 8, 10, "#8a5a3a"); s.rect(5, 5, 10, 7, stl[3]); s.line(5, 5, 10, 5, stl[4])          # hammer
    s.line(12, 10, 18, 8, stl[3]); s.px(19, 8, stl[4])                                                # tongs
    s.rect(28, 1, 33, 3, "#f08a24"); s.px(30, 1, "#fff2a8")                                           # glowing ingot
    s.rect(3, 26, 12, 27, stl[2]); s.line(3, 26, 12, 26, stl[3])                                      # whetstone
    return done(s)


# id, sprite fn, top-left in room coords, where the hero stands (feet), label
FURNITURE = [
    ("mirror", mirror, (4, 24), (16, 82), "กระจก · แต่งตัว"),
    ("bed", bed, (27, 44), (54, 82), "เตียง · พักผ่อน"),
    ("shelf", shelf, (126, 25), (141, 82), "ชั้นวาง · ซื้อของ"),
    ("door", door, (156, 26), (165, 80), "ประตู · ออกไปผจญภัย"),
    ("cauldron", cauldron, (16, 84), (47, 106), "หม้อยา · ปรุงยา"),
    ("chest", chest, (84, 89), (114, 107), "หีบ · ฝากเงิน"),
    ("workbench", workbench, (128, 79), (122, 104), "โต๊ะช่าง · ซ่อม"),
]


def glow(im: Image.Image) -> Image.Image:
    """Yellow 1 px outline around the (already ink-outlined) sprite: the hover/tap highlight."""
    w, h = im.size
    src = im.load()
    out = im.copy()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3]:
                    dst[x, y] = GLOW
                    break
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    r = room()
    r.save_png(os.path.join(OUT, "room.png"))
    scene = r.composite(1).copy()
    # home.json is in 2x room pixels (HomeScene reads sizes from it).
    meta = {"w": RW * K, "h": RH * K, "floorY": FLOOR_Y * K, "items": []}
    for fid, fn, (x, y), (sx, sy), label in FURNITURE:
        s = fn()
        bevel(s.s, light=0.16, dark=0.18, skip=(INK,))
        x, y, sx, sy = x * K, y * K, sx * K, sy * K
        path = os.path.join(OUT, f"{fid}.png")
        s.save_png(path)
        im = Image.open(path).convert("RGBA")
        glow(im).save(os.path.join(OUT, f"{fid}_hi.png"))
        meta["items"].append({"id": fid, "x": x, "y": y, "w": im.width, "h": im.height, "stand": [sx, sy], "label": label})
        scene.alpha_composite(im, (x, y))
    with open(os.path.join(OUT, "home.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    Z = 3
    scene.resize((RW * K * Z, RH * K * Z), Image.NEAREST).save(os.path.join(HERE, "preview.png"))
    print("OK room +", len(FURNITURE), "furniture")


if __name__ == "__main__":
    main()
