#!/usr/bin/env python3
"""
16-bit monster sprites for Pixel Walker, drawn at native size (critters 32px, mid 40-48px,
bosses 64px+) so their pixels match the 48x64 hero. Facing RIGHT (battle mirrors side B), light
from the top-left, hue-shifted ramps, coloured outline (darkest ramp) outside.

    python pixel-art/monsters/build.py

Outputs apps/game/public/assets/monsters/<sprite>.png (1x) and preview.png here.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite, ramp, mix  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

OUT = os.path.join(ROOT, "apps", "game", "public", "assets", "monsters")
INK = "#1c1a28"
EYE_W = "#f6f0e1"


def R(base, n=5, hs=16):
    return ramp(base, n, hue_shift=hs)


def blob(s, x0, y0, x1, y1, r, light=True):
    """Shifted-shape shading: dark silhouette, mid shifted up-left, light highlight."""
    s.ellipse(x0, y0, x1, y1, r[1])
    s.ellipse(x0, y0, x1 - 1, y1 - 1, r[2], only="opaque")
    if light:
        w, h = x1 - x0, y1 - y0
        s.ellipse(x0 + 1, y0 + 1, x0 + max(2, w * 2 // 3), y0 + max(2, h * 2 // 3), r[3], only="opaque")


def eye(s, x, y, iris=INK, big=False, glow=None):
    if big:
        s.rect(x, y, x + 1, y + 1, EYE_W); s.px(x + 1, y + 1, iris); s.px(x + 1, y, iris)
    else:
        s.px(x, y, glow or iris)
        if glow:
            s.px(x + 1, y, glow)


def done(s, outline):
    s.outline(outline, where="outside")
    return s


# ============================================================================================
# Critters (32x32)

def slime():
    s = Sprite(32, 32); r = R("#3fb6e8")
    s.ellipse(4, 12, 27, 29, r[1]); s.ellipse(4, 11, 26, 28, r[2], only="opaque")
    s.ellipse(6, 12, 17, 20, r[3], only="opaque"); s.ellipse(8, 13, 11, 15, r[4], only="opaque")
    s.rect(4, 26, 27, 29, r[0], only="opaque")
    eye(s, 17, 18, big=True); eye(s, 22, 18, big=True)
    s.line(19, 23, 22, 23, r[0])
    return done(s, r[0])


def pigeon():
    s = Sprite(32, 32); g = R("#9aa0b4"); neck = "#5fb0a0"
    s.ellipse(5, 13, 23, 25, g[1]); s.ellipse(5, 12, 22, 24, g[2], only="opaque")
    s.ellipse(7, 13, 14, 18, g[3], only="opaque")
    s.ellipse(6, 16, 16, 23, g[1], only="opaque")                  # wing
    s.line(7, 21, 15, 21, g[0]); s.line(8, 19, 14, 19, g[0])
    s.circle(22, 11, 4, g[2], fill=True); s.circle(21, 10, 2, g[3], fill=True)
    s.rect(19, 14, 23, 16, neck); s.px(20, 15, "#9a6fc0")
    s.polygon([(26, 10), (29, 11), (26, 12)], "#e8b870")
    eye(s, 23, 10, "#e85a3a")
    s.polygon([(2, 16), (6, 14), (6, 19)], g[1])                   # tail
    s.line(12, 25, 12, 28, "#e0785a"); s.line(16, 25, 16, 28, "#e0785a"); s.px(13, 28, "#e0785a"); s.px(17, 28, "#e0785a")
    return done(s, g[0])


def rat():
    s = Sprite(32, 32); b = R("#8a6a52")
    s.ellipse(6, 14, 24, 26, b[1]); s.ellipse(6, 13, 23, 25, b[2], only="opaque"); s.ellipse(8, 14, 15, 19, b[3], only="opaque")
    s.polygon([(20, 14), (29, 20), (20, 24)], b[2])                 # snout
    s.px(29, 20, "#e89aa8"); s.circle(19, 13, 3, "#e8a0b0", fill=True); s.circle(19, 13, 2, b[2], fill=True)
    eye(s, 23, 17, "#e53935")
    for x in (10, 18):
        s.rect(x, 25, x + 2, 27, b[1])
    for k in range(8):                                              # curly tail
        s.px(5 - k // 2, 22 - k + (k * k) // 10, "#e8a0b0")
    s.line(26, 22, 29, 23, b[0]); s.line(26, 21, 30, 20, b[0])     # whiskers
    return done(s, b[0])


def cat():
    s = Sprite(32, 32); k = R("#3a3050", hs=20)
    # tail: a smooth S-curve up the left side
    for i, (x, y) in enumerate([(7, 27), (5, 26), (4, 24), (3, 22), (3, 20), (4, 18), (5, 16), (5, 14), (4, 12)]):
        s.rect(x, y, x + 1, y + 1, k[1] if i % 3 else k[2])
    s.ellipse(6, 13, 22, 28, k[1]); s.ellipse(6, 12, 21, 27, k[2], only="opaque"); s.ellipse(8, 13, 13, 19, k[3], only="opaque")
    s.circle(21, 11, 6, k[2], fill=True); s.circle(19, 9, 3, k[3], fill=True)
    s.polygon([(16, 7), (17, 1), (20, 5)], k[2]); s.polygon([(22, 5), (25, 1), (26, 7)], k[2])
    s.px(17, 3, "#e89aa8"); s.px(25, 3, "#e89aa8")
    s.rect(18, 10, 19, 11, "#f2d23a"); s.rect(23, 10, 24, 11, "#f2d23a"); s.px(19, 11, INK); s.px(24, 11, INK)
    s.px(21, 13, "#e89aa8")
    s.rect(12, 26, 14, 28, k[1]); s.rect(17, 26, 19, 28, k[1])
    return done(s, INK)


def ant():
    s = Sprite(32, 32); r = R("#c8342a")
    s.ellipse(2, 14, 11, 23, r[1]); s.ellipse(2, 13, 10, 22, r[2], only="opaque"); s.px(4, 15, r[3]); s.px(5, 15, r[3])
    s.ellipse(11, 15, 18, 21, r[2]); s.px(13, 16, r[3])
    s.circle(22, 16, 4, r[2], fill=True); s.circle(21, 15, 2, r[3], fill=True)
    s.line(25, 18, 28, 20, INK); s.line(25, 19, 28, 22, INK)       # mandibles
    s.line(22, 12, 25, 6, r[0]); s.line(23, 12, 28, 8, r[0])       # antennae
    for x in (11, 14, 17):
        s.line(x, 21, x - 3, 27, r[0]); s.line(x, 20, x + 2, 27, r[0])
    eye(s, 23, 15, EYE_W)
    s.rect(18, 11, 25, 12, "#5a6a3a"); s.rect(19, 10, 24, 10, "#7a8a4a")  # tiny army helmet
    return done(s, INK)


def gecko():
    s = Sprite(40, 32); b = R("#6a8fb0"); spot = "#f08a3a"
    s.ellipse(8, 12, 30, 22, b[1]); s.ellipse(8, 11, 29, 21, b[2], only="opaque"); s.ellipse(10, 12, 20, 16, b[3], only="opaque")
    s.ellipse(27, 9, 37, 19, b[2]); s.ellipse(28, 9, 33, 13, b[3], only="opaque")
    s.rect(33, 11, 35, 13, "#f2d23a"); s.px(34, 12, INK)
    for x, y in ((12, 14), (17, 17), (22, 13), (25, 18), (30, 15)):
        s.px(x, y, spot); s.px(x + 1, y, spot)
    for k in range(10):
        s.px(8 - k, 17 + k // 3, b[1]); s.px(8 - k, 18 + k // 3, b[1])
    for x in (12, 25):
        s.line(x, 21, x - 2, 26, b[1]); s.line(x - 3, 26, x, 26, b[3])
    s.line(29, 16, 38, 16, b[0])
    return done(s, b[0])


def firefly():
    s = Sprite(32, 32); glow = R("#f2e25a", hs=24)
    for rr, c in ((11, "#5a6a2a"), (9, "#8a9a3a")):
        pass
    s.circle(15, 17, 8, mix("#f2e25a", "#3a4a2a", 0.55), fill=True)
    s.circle(15, 17, 6, glow[2], fill=True); s.circle(14, 16, 4, glow[3], fill=True); s.circle(13, 15, 2, glow[4], fill=True)
    s.ellipse(15, 7, 24, 13, "#3a3050"); s.px(22, 9, EYE_W); s.px(23, 9, INK)
    s.ellipse(9, 3, 16, 9, "#cfe6ff"); s.ellipse(17, 2, 25, 7, "#cfe6ff")   # wings
    s.line(22, 7, 25, 3, "#3a3050"); s.line(21, 7, 22, 3, "#3a3050")
    for x, y in ((4, 10), (27, 18), (6, 26), (25, 27), (29, 11)):
        s.px(x, y, glow[4])
    return done(s, "#2a3a1a")


def carp():
    s = Sprite(40, 32); w = R("#f2ece0", hs=10); o = R("#f07830", hs=18)
    s.ellipse(6, 10, 33, 23, w[1]); s.ellipse(6, 9, 32, 22, w[2], only="opaque")
    s.ellipse(10, 9, 20, 15, o[2], only="opaque"); s.ellipse(22, 14, 30, 21, o[2], only="opaque"); s.ellipse(24, 9, 29, 12, o[3], only="opaque")
    s.polygon([(1, 9), (7, 15), (1, 22)], o[2]); s.line(2, 12, 5, 15, o[1]); s.line(2, 19, 5, 16, o[1])
    s.polygon([(17, 7), (23, 3), (24, 9)], o[1])                    # dorsal fin
    s.polygon([(18, 21), (22, 27), (24, 21)], w[1])
    eye(s, 29, 13, big=True); s.line(32, 17, 33, 17, o[0]); s.px(34, 18, "#c8a070")
    for x in (14, 18, 22):
        s.px(x, 17, w[1])
    for x, y in ((35, 8), (37, 6), (36, 24)):
        s.px(x, y, "#8fc8ff")
    return done(s, "#6a3a1a")


def crab():
    s = Sprite(40, 32); c = R("#6a8a3a", hs=16); sh = R("#a05a2a")
    s.ellipse(9, 13, 31, 26, c[1]); s.ellipse(9, 12, 30, 25, c[2], only="opaque"); s.ellipse(12, 13, 22, 17, c[3], only="opaque")
    for x in (12, 18, 24):
        s.line(x, 14, x + 3, 14, c[1], only="opaque")                # shell ridges
    s.circle(5, 12, 4, sh[2], fill=True); s.circle(35, 12, 4, sh[2], fill=True)
    s.px(4, 9, sh[0]); s.px(5, 9, sh[0]); s.px(34, 9, sh[0]); s.px(35, 9, sh[0])   # claw gaps
    s.line(8, 16, 10, 18, c[1]); s.line(32, 16, 30, 18, c[1])
    for x in (12, 17, 23, 28):
        s.line(x, 25, x - 2 if x < 20 else x + 2, 29, c[0])
    s.line(17, 11, 16, 7, c[0]); s.line(23, 11, 24, 7, c[0]); eye(s, 16, 6, big=True); eye(s, 23, 6, big=True)
    return done(s, INK)


# ============================================================================================
# Medium (40-48)

def dog_spirit():
    s = Sprite(44, 40); g = R("#8a92d8", hs=22)
    s.ellipse(8, 16, 30, 30, g[1]); s.ellipse(8, 15, 29, 29, g[2], only="opaque"); s.ellipse(10, 16, 20, 21, g[3], only="opaque")
    s.ellipse(26, 9, 39, 21, g[2]); s.ellipse(27, 9, 33, 14, g[3], only="opaque")
    s.polygon([(27, 10), (28, 3), (32, 9)], g[1]); s.polygon([(34, 9), (37, 3), (38, 11)], g[2])
    s.polygon([(37, 15), (42, 16), (38, 19)], g[2]); s.px(42, 16, INK)
    s.rect(33, 12, 34, 13, "#7fffe0"); s.px(34, 13, "#e8fffa")
    for x in (11, 17, 23, 27):
        s.rect(x, 28, x + 2, 34, g[1])
    for k in range(6):  # wispy tail
        s.px(7 - k, 18 - k, g[3]); s.px(6 - k, 19 - k, g[2]); s.px(8 - k, 20 - k, g[1])
    for x, y in ((3, 30), (40, 30), (2, 22)):
        s.px(x, y, "#b8c0ff")
    return done(s, g[0])


def scarecrow():
    s = Sprite(40, 48); w = R("#a8743e"); straw = R("#e8c860", hs=18); cloth = R("#4f7fa0")
    s.rect(18, 20, 21, 46, w[2]); s.rect(19, 20, 19, 46, w[3])
    s.rect(3, 22, 36, 24, w[2]); s.line(3, 22, 36, 22, w[3])
    s.polygon([(10, 22), (29, 22), (31, 38), (8, 38)], cloth[2]); s.polygon([(10, 22), (15, 22), (12, 38), (8, 38)], cloth[3], only="opaque")
    s.rect(22, 27, 26, 31, "#c8583a"); s.line(22, 27, 26, 31, "#8a3a2a")          # patch
    for x in (2, 36):
        for k in range(4):
            s.px(x + (k % 2), 24 + k, straw[2])
    s.circle(20, 14, 7, "#d8c8a0", fill=True); s.circle(18, 12, 3, "#ece0c0", fill=True)
    s.line(16, 13, 18, 13, INK); s.line(22, 13, 24, 13, INK); s.line(17, 17, 23, 17, INK)
    for x in (17, 19, 21, 23):
        s.px(x, 18, INK)
    s.polygon([(8, 9), (32, 9), (27, 6), (24, 1), (16, 1), (13, 6)], straw[2]); s.line(8, 9, 32, 9, straw[1])
    s.rect(14, 5, 26, 6, "#c8342a")
    for x in (9, 12, 15, 25, 28, 31):
        s.px(x, 10, straw[3])
    return done(s, "#3a2a1a")


def leaf_sprite():
    s = Sprite(40, 44); g = R("#58b83a", hs=20)
    s.ellipse(4, 8, 16, 22, g[1]); s.ellipse(24, 8, 36, 22, g[1])                   # leaf wings
    s.line(10, 10, 12, 20, g[0]); s.line(30, 10, 28, 20, g[0])
    s.polygon([(20, 6), (29, 20), (26, 34), (20, 38), (14, 34), (11, 20)], g[2])
    s.polygon([(20, 6), (22, 20), (20, 38), (14, 34), (11, 20)], g[3], only="opaque")
    s.line(20, 8, 20, 36, g[1])
    s.circle(20, 20, 5, "#f0dcb0", fill=True); s.circle(19, 19, 2, "#fff0d0", fill=True)
    eye(s, 17, 19, big=True); eye(s, 21, 19, big=True); s.px(19, 23, "#e8707a"); s.px(20, 23, "#e8707a")
    s.line(20, 2, 20, 6, "#7a5a2a"); s.px(21, 2, g[3]); s.px(22, 1, g[3])
    for x, y in ((6, 32), (33, 34), (8, 40)):
        s.px(x, y, "#b6f28c")
    return done(s, "#1f4a1a")


def tuktuk():
    s = Sprite(48, 40); b = R("#3aa0c8", hs=18); roof = R("#c8342a"); chrome = R("#c9d2dc")
    # canopy on posts, open passenger bench, narrow driver nose, one front wheel
    s.polygon([(4, 6), (34, 6), (38, 10), (4, 10)], roof[2]); s.line(4, 6, 34, 6, roof[3]); s.line(4, 10, 38, 10, roof[1])
    for x in range(6, 36, 6):
        s.px(x, 10, "#f6f0e1")                                                        # fringe
    s.rect(5, 10, 6, 26, chrome[1]); s.rect(28, 10, 29, 22, chrome[1])
    s.rect(6, 18, 28, 28, b[2]); s.rect(6, 18, 12, 28, b[3], only="opaque")
    s.rect(8, 13, 26, 18, "#2a1f3a"); s.rect(9, 14, 25, 16, "#4a3a5a")                 # dark cabin + bench
    s.rect(15, 14, 16, 15, "#b8f0ff"); s.rect(20, 14, 21, 15, "#b8f0ff")              # ghost eyes in the cabin
    s.polygon([(28, 16), (38, 18), (44, 26), (44, 30), (28, 30)], b[2]); s.line(28, 16, 38, 18, b[3])
    s.polygon([(33, 12), (37, 12), (39, 17), (33, 17)], "#1f2a3a")                     # windscreen
    s.circle(43, 22, 2, "#f2e25a", fill=True); s.px(43, 22, "#ffffff")                  # headlight
    for cx in (10, 40):
        s.circle(cx, 32, 4, "#2a2a34", fill=True); s.circle(cx, 32, 1, chrome[2], fill=True)
    for x, y in ((1, 16), (2, 24), (46, 10)):
        s.px(x, y, "#b8a0ff")
    return done(s, INK)


def songthaew():
    s = Sprite(56, 40); r = R("#d23a30", hs=16)
    s.rect(4, 8, 36, 30, r[2]); s.rect(4, 8, 36, 10, r[3]); s.line(4, 8, 36, 8, r[4])
    s.polygon([(36, 14), (46, 14), (52, 22), (52, 30), (36, 30)], r[2]); s.line(36, 14, 46, 14, r[3])
    for x in range(7, 34, 7):
        s.rect(x, 12, x + 4, 18, "#2a1f2a")                                      # rear windows
    s.rect(40, 16, 47, 21, "#2a1f2a")
    s.rect(42, 17, 43, 18, "#f2e25a"); s.rect(45, 17, 46, 18, "#f2e25a")          # angry eyes
    s.line(41, 16, 44, 17, r[0])
    for x in range(40, 52, 2):
        s.px(x, 27, "#f6f0e1")                                                   # grill teeth
    s.rect(50, 23, 52, 25, "#fff1a8")
    for cx in (12, 44):
        s.circle(cx, 32, 5, "#2a2a34", fill=True); s.circle(cx, 32, 2, "#9aa4b0", fill=True)
    s.rect(2, 20, 4, 30, r[1])
    return done(s, INK)


def lantern():
    s = Sprite(40, 48); p = R("#f5c060", hs=22); f = "#ff8a3a"
    for x, y in ((3, 10), (36, 14), (5, 30), (35, 36), (2, 20), (38, 26)):              # glow sparks
        s.px(x, y, "#fff1a8")
    s.polygon([(10, 6), (30, 6), (33, 32), (7, 32)], p[2])
    s.polygon([(10, 6), (17, 6), (14, 32), (7, 32)], p[3], only="opaque")
    s.polygon([(26, 6), (30, 6), (33, 32), (29, 32)], p[1], only="opaque")
    for y in (12, 19, 26):
        s.line(9, y, 31, y, p[1], only="opaque")
    s.rect(9, 4, 31, 6, "#c8342a"); s.rect(8, 32, 32, 34, "#c8342a")
    s.polygon([(17, 36), (23, 36), (20, 44)], f); s.polygon([(18, 36), (22, 36), (20, 41)], "#fff1a8")
    s.rect(14, 16, 15, 18, INK); s.rect(24, 16, 25, 18, INK); s.polygon([(17, 22), (23, 22), (20, 25)], "#8a3a2a")
    s.px(15, 16, "#fff"); s.px(25, 16, "#fff")
    return done(s, "#6a3a10")


def bat():
    s = Sprite(44, 36); b = R("#5a3a8a", hs=20); neon = "#3af2f0"
    s.polygon([(20, 14), (2, 4), (6, 12), (1, 18), (8, 20), (6, 26), (18, 22)], b[1])
    s.polygon([(24, 14), (42, 4), (38, 12), (43, 18), (36, 20), (38, 26), (26, 22)], b[2])
    for pts in (((2, 4), (6, 12), (1, 18), (8, 20), (6, 26)), ((42, 4), (38, 12), (43, 18), (36, 20), (38, 26))):
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            s.line(x0, y0, x1, y1, neon)
    s.ellipse(16, 10, 28, 26, b[2]); s.ellipse(17, 10, 23, 17, b[3], only="opaque")
    s.polygon([(17, 11), (18, 5), (21, 10)], b[2]); s.polygon([(23, 10), (26, 5), (27, 11)], b[2])
    s.px(19, 15, "#ff3aa8"); s.px(20, 15, "#ff3aa8"); s.px(24, 15, "#ff3aa8"); s.px(25, 15, "#ff3aa8")
    s.px(20, 20, EYE_W); s.px(24, 20, EYE_W)
    return done(s, INK)


def python_():
    s = Sprite(48, 36); b = R("#b89a5a", hs=14); dark = "#5a3f22"
    s.ellipse(4, 16, 36, 32, b[1]); s.ellipse(4, 15, 35, 31, b[2], only="opaque")
    s.ellipse(9, 20, 31, 28, None)                                                   # coil hole
    s.ellipse(11, 21, 29, 27, b[1])
    s.ellipse(6, 16, 20, 22, b[3], only="opaque")
    for x, y in ((8, 18), (14, 16), (22, 16), (30, 19), (32, 26), (24, 30), (14, 30), (7, 26)):
        s.rect(x, y, x + 2, y + 1, dark)
    s.polygon([(28, 16), (34, 8), (40, 6), (45, 9), (44, 13), (36, 14), (32, 18)], b[2])
    s.px(41, 8, "#f2d23a"); s.px(42, 8, INK)
    s.line(45, 11, 47, 10, "#e53935"); s.line(45, 11, 47, 12, "#e53935")
    return done(s, "#3a2a14")


def lizard():
    s = Sprite(48, 32); r = R("#c8502a", hs=18); ember = "#ffb347"
    s.ellipse(10, 12, 34, 24, r[1]); s.ellipse(10, 11, 33, 23, r[2], only="opaque"); s.ellipse(12, 12, 22, 16, r[3], only="opaque")
    s.ellipse(31, 9, 44, 19, r[2]); s.ellipse(32, 9, 37, 13, r[3], only="opaque")
    s.px(39, 12, "#f2e25a"); s.px(40, 12, INK); s.line(41, 16, 44, 16, r[0])
    for k in range(10):
        s.px(10 - k, 17 + k // 3, r[1]); s.px(10 - k, 18 + k // 3, r[2])
    for x in (13, 19, 25):
        s.polygon([(x, 11), (x + 2, 6), (x + 4, 11)], ember); s.px(x + 2, 8, "#fff1a8")   # ember spines
    for x in (14, 28):
        s.line(x, 22, x - 2, 27, r[1]); s.line(x - 3, 27, x, 27, r[0])
    s.px(46, 14, ember); s.px(47, 12, "#fff1a8")
    return done(s, "#4a1a0a")


def krasue():
    s = Sprite(40, 48); hair = R("#2a2438", hs=10); skin = R("#f0d0b0", hs=12); glow = "#7affb0"
    for k in range(10):                                                               # ghost light trail
        s.circle(20 + (k % 3) - 1, 26 + k * 2, max(1, 5 - k // 2), mix(glow, "#1c1a28", k / 12), fill=True)
    s.ellipse(8, 4, 32, 28, hair[1]); s.ellipse(8, 3, 31, 27, hair[2], only="opaque")
    s.ellipse(12, 6, 29, 22, skin[2]); s.ellipse(12, 6, 20, 14, skin[3], only="opaque")
    s.rect(8, 6, 12, 34, hair[1]); s.rect(28, 8, 32, 30, hair[1])                    # long hair
    s.line(9, 7, 9, 32, hair[3]); s.line(29, 10, 29, 28, hair[2])
    s.rect(15, 12, 17, 13, INK); s.rect(23, 12, 25, 13, INK); s.px(16, 12, "#ff5a5a"); s.px(24, 12, "#ff5a5a")
    s.line(18, 18, 22, 18, "#b8404a")
    s.rect(12, 4, 28, 5, hair[3])
    return done(s, "#0e0c16")


def sapling():
    s = Sprite(40, 48); bark = R("#7a5a36"); leaf = R("#4a9a3a", hs=20)
    s.rect(14, 20, 25, 40, bark[2]); s.rect(14, 20, 17, 40, bark[3]); s.rect(23, 22, 25, 40, bark[1])
    for x0, dx in ((14, -1), (25, 1)):
        for k in range(5):
            s.px(x0 + dx * k, 40 + k // 2, bark[1])
    s.line(14, 26, 6, 20, bark[2]); s.line(25, 26, 33, 18, bark[2])                  # branch arms
    s.circle(20, 12, 10, leaf[1], fill=True); s.circle(18, 10, 8, leaf[2], fill=True); s.circle(15, 7, 4, leaf[3], fill=True)
    s.circle(6, 18, 3, leaf[2], fill=True); s.circle(33, 16, 3, leaf[2], fill=True)
    s.rect(16, 27, 17, 28, "#f2d23a"); s.rect(22, 27, 23, 28, "#f2d23a"); s.line(17, 33, 22, 33, bark[0])
    return done(s, "#2a1a0a")


def wraith():
    s = Sprite(40, 48); m = R("#c8d0e0", hs=14)
    s.polygon([(20, 3), (31, 10), (33, 30), (37, 44), (28, 40), (22, 46), (16, 40), (7, 44), (9, 30), (9, 10)], m[1])
    s.polygon([(20, 3), (30, 10), (31, 30), (22, 40), (12, 38), (11, 10)], m[2], only="opaque")
    s.polygon([(20, 3), (24, 8), (15, 30), (12, 30), (11, 10)], m[3], only="opaque")
    s.ellipse(13, 10, 27, 24, "#2a3048")                                               # hood shadow
    s.rect(16, 15, 17, 16, "#7ad8ff"); s.rect(22, 15, 23, 16, "#7ad8ff")
    for x, y in ((4, 30), (36, 20), (2, 40), (38, 36)):
        s.px(x, y, m[3]); s.px(x + 1, y, m[2])
    return done(s, "#3a4058")


def elephant():
    s = Sprite(56, 48); st = R("#8a8e96", hs=10); moss = "#6aa84a"
    s.ellipse(4, 12, 40, 38, st[1]); s.ellipse(4, 11, 39, 37, st[2], only="opaque"); s.ellipse(7, 12, 24, 22, st[3], only="opaque")
    s.circle(42, 18, 11, st[2], fill=True); s.circle(40, 15, 6, st[3], fill=True)
    s.ellipse(30, 10, 40, 30, st[1]); s.ellipse(31, 11, 38, 26, st[2], only="opaque")   # ear
    s.polygon([(48, 22), (53, 30), (54, 42), (50, 44), (49, 32), (45, 26)], st[2])     # trunk
    s.line(46, 26, 42, 32, "#f2ecd8"); s.line(47, 27, 43, 33, "#d8d0b8")                 # tusk
    s.rect(44, 15, 45, 16, "#f2c230"); s.px(45, 16, "#fff6a8")                            # glowing eye
    for x in (8, 16, 26, 34):
        s.rect(x, 34, x + 5, 44, st[1]); s.rect(x, 43, x + 5, 44, st[0])
    for x0, y0, x1, y1 in ((12, 16, 16, 22), (22, 26, 20, 31), (36, 30, 38, 34)):
        s.line(x0, y0, x1, y1, st[0])                                                      # cracks
    for x, y in ((10, 12), (11, 12), (20, 11), (21, 11), (22, 12), (44, 8), (45, 8)):
        s.px(x, y, moss)
    s.polygon([(1, 22), (4, 20), (4, 24)], st[1])
    return done(s, "#2a2c34")


def mannequin():
    s = Sprite(32, 48); body = R("#f0e8dc", hs=8); dress = R("#d23a5a", hs=18)
    s.circle(16, 8, 5, body[2], fill=True); s.circle(15, 7, 2, body[3], fill=True)
    s.rect(15, 13, 17, 15, body[1])
    s.polygon([(10, 15), (22, 15), (25, 38), (7, 38)], dress[2]); s.polygon([(10, 15), (14, 15), (11, 38), (7, 38)], dress[3], only="opaque")
    s.line(10, 15, 5, 28, body[2]); s.line(22, 15, 27, 26, body[2])
    s.rect(13, 38, 14, 44, body[1]); s.rect(18, 38, 19, 44, body[1])
    s.rect(10, 44, 22, 46, "#6a6470")                                                   # stand
    s.rect(24, 22, 28, 27, "#f2c230"); s.px(26, 24, INK)                                 # price tag
    return done(s, "#3a2a34")


def dummy(armored=False):
    s = Sprite(32, 44); w = R("#a8743e"); m = R("#9aa4b0")
    s.rect(14, 16, 17, 42, w[2]); s.line(14, 16, 14, 42, w[3])
    s.rect(6, 18, 25, 20, w[2]); s.line(6, 18, 25, 18, w[3])
    s.ellipse(8, 18, 23, 34, (m if armored else w)[2]); s.ellipse(9, 19, 16, 26, (m if armored else w)[3], only="opaque")
    s.circle(16, 10, 6, (m if armored else R("#e8d8b0"))[2], fill=True)
    s.circle(16, 26, 4, "#e53935"); s.circle(16, 26, 2, "#f6f0e1", fill=True); s.px(16, 26, "#e53935")
    if armored:
        for x in (10, 21):
            s.px(x, 22, m[4]); s.px(x, 30, m[4])
        s.line(12, 9, 20, 9, INK)
    s.rect(10, 42, 21, 43, w[1])
    return done(s, INK)


# ============================================================================================
# Bosses (64+)

def goblin_king():
    s = Sprite(64, 64); g = R("#5aa83a", hs=18); cape = R("#8a2a8a", hs=18); gold = R("#f2c230", 4, 22)
    s.polygon([(14, 24), (40, 22), (48, 58), (8, 58)], cape[1]); s.polygon([(14, 24), (26, 23), (18, 58), (8, 58)], cape[2], only="opaque")
    s.ellipse(16, 28, 42, 56, g[1]); s.ellipse(16, 27, 41, 55, g[2], only="opaque"); s.ellipse(19, 29, 30, 38, g[3], only="opaque")
    s.rect(22, 44, 38, 47, "#6a4424"); s.rect(28, 44, 31, 47, gold[2])                      # belt
    s.circle(33, 18, 11, g[2], fill=True); s.circle(30, 15, 5, g[3], fill=True)
    s.polygon([(22, 16), (14, 10), (23, 21)], g[2]); s.polygon([(43, 16), (52, 9), (43, 22)], g[2])   # ears
    s.rect(33, 16, 35, 18, "#f2e25a"); s.rect(39, 16, 41, 18, "#f2e25a"); s.px(35, 18, INK); s.px(41, 18, INK)
    s.line(33, 24, 41, 24, g[0]); s.px(35, 25, EYE_W); s.px(39, 25, EYE_W)
    s.polygon([(25, 8), (27, 1), (30, 6), (33, 0), (36, 6), (39, 1), (41, 8)], gold[2]); s.line(25, 8, 41, 8, gold[1])
    s.px(33, 3, "#e53935"); s.px(28, 5, "#3a8fe0"); s.px(38, 5, "#3a8fe0")
    s.rect(44, 30, 48, 44, g[2])                                                         # arm
    s.polygon([(47, 12), (55, 8), (58, 14), (50, 40), (46, 38)], "#c8a060")               # club
    s.line(55, 9, 51, 38, "#8a6a3a"); s.circle(55, 11, 3, "#e8c890", fill=True)
    for x in (20, 32):
        s.rect(x, 54, x + 6, 60, g[1]); s.rect(x - 1, 59, x + 7, 61, "#4a3a2a")
    return done(s, "#1a2a10")


def sale_queen():
    s = Sprite(64, 64); body = R("#f0e8dc", hs=8); gown = R("#e0508a", hs=20); gold = R("#f2c230", 4, 22)
    s.polygon([(20, 26), (44, 26), (54, 60), (10, 60)], gown[1]); s.polygon([(20, 26), (44, 26), (50, 58), (14, 58)], gown[2], only="opaque")
    s.polygon([(20, 26), (28, 26), (20, 58), (14, 58)], gown[3], only="opaque")
    for y in (38, 48):
        s.line(14 + (y - 38) // 4, y, 50 - (y - 38) // 4, y, gown[1], only="opaque")     # ruffles
    s.circle(32, 16, 8, body[2], fill=True); s.circle(30, 14, 4, body[3], fill=True)
    s.rect(30, 24, 34, 27, body[1])
    s.rect(28, 15, 30, 16, INK); s.rect(34, 15, 36, 16, INK); s.line(30, 20, 34, 20, "#c8305a")
    s.polygon([(24, 8), (26, 2), (30, 6), (32, 0), (34, 6), (38, 2), (40, 8)], gold[2]); s.line(24, 8, 40, 8, gold[1])
    s.rect(38, 2, 46, 8, "#f6f0e1"); s.px(42, 5, "#e53935"); s.px(41, 4, "#e53935"); s.px(43, 6, "#e53935")   # SALE tag
    s.line(20, 28, 10, 40, body[2]); s.line(44, 28, 54, 38, body[2])
    for bx, c in ((4, "#3f7ce0"), (52, "#f2c230")):                                        # shopping bags
        s.rect(bx, 40, bx + 8, 50, c); s.line(bx + 2, 37, bx + 2, 40, INK); s.line(bx + 6, 37, bx + 6, 40, INK); s.line(bx + 2, 37, bx + 6, 37, INK)
    s.rect(24, 60, 40, 62, "#6a6470")
    return done(s, "#3a1a2a")


def octane():
    s = Sprite(64, 64); r = R("#d23a30", hs=16); m = R("#9aa4b0")
    s.rect(14, 10, 44, 58, r[2]); s.rect(14, 10, 20, 58, r[3]); s.rect(40, 10, 44, 58, r[1])
    s.rect(12, 6, 46, 10, r[1]); s.line(12, 6, 46, 6, r[3])
    s.rect(18, 14, 40, 26, "#1f2a3a"); s.line(18, 14, 40, 14, "#5a6a8a")                    # display face
    s.rect(21, 18, 25, 21, "#ff5a3a"); s.rect(33, 18, 37, 21, "#ff5a3a")
    s.line(24, 24, 34, 23, "#ff5a3a")
    for x in range(20, 38, 4):
        s.rect(x, 30, x + 2, 32, "#f2e25a")                                                  # digits
    s.rect(18, 36, 40, 40, "#f2c230")
    s.line(44, 20, 52, 20, INK); s.line(52, 20, 56, 30, INK); s.line(56, 30, 54, 44, INK)     # hose
    s.line(45, 21, 52, 21, "#3a3f58"); s.line(53, 21, 57, 30, "#3a3f58"); s.line(57, 30, 55, 44, "#3a3f58")
    s.rect(50, 44, 58, 50, m[2]); s.px(54, 51, "#ffb347"); s.px(55, 52, "#fff1a8"); s.px(53, 53, "#ffb347")
    s.rect(12, 56, 46, 60, m[1])
    for x, y in ((6, 20), (8, 36), (60, 10)):
        s.px(x, y, "#ffb347")
    return done(s, INK)


def yaksha():
    s = Sprite(64, 72); skin = R("#3a9a6a", hs=18); robe = R("#c8342a", hs=16); gold = R("#f2c230", 5, 22)
    s.polygon([(16, 30), (48, 30), (54, 68), (10, 68)], robe[1]); s.polygon([(16, 30), (48, 30), (50, 66), (14, 66)], robe[2], only="opaque")
    s.polygon([(16, 30), (26, 30), (20, 66), (14, 66)], robe[3], only="opaque")
    for y in (40, 52):
        s.line(14, y, 50, y, gold[2], only="opaque")
    for x in range(16, 48, 5):
        s.px(x, 46, gold[3], only="opaque")
    s.rect(18, 28, 46, 32, gold[2])                                                         # collar
    s.circle(32, 20, 10, skin[2], fill=True); s.circle(29, 17, 5, skin[3], fill=True)
    s.rect(27, 17, 29, 19, "#f2e25a"); s.rect(35, 17, 37, 19, "#f2e25a"); s.px(28, 18, INK); s.px(36, 18, INK)
    s.line(26, 15, 30, 16, skin[0]); s.line(34, 16, 38, 15, skin[0])                         # brows
    s.line(28, 25, 36, 25, "#8a1a1a"); s.px(28, 26, EYE_W); s.px(36, 26, EYE_W); s.px(28, 27, EYE_W); s.px(36, 27, EYE_W)  # fangs
    s.polygon([(23, 12), (41, 12), (38, 6), (35, 2), (32, 0), (29, 2), (26, 6)], gold[2])      # chada spire crown
    s.line(23, 12, 41, 12, gold[1]); s.line(32, 0, 32, 10, gold[3]); s.px(32, 8, "#e53935")
    s.rect(46, 32, 51, 46, skin[2]); s.rect(12, 32, 17, 46, skin[1])                        # arms
    s.rect(52, 6, 57, 58, "#8a6a3a"); s.rect(52, 6, 53, 58, "#c8a060")                      # guardian mace
    s.rect(49, 4, 60, 12, gold[2]); s.line(49, 4, 60, 4, gold[3])
    for x in (20, 36):
        s.rect(x, 66, x + 8, 70, skin[1])
    return done(s, "#10200a")


def treant():
    s = Sprite(72, 72); bark = R("#6a4a2a"); leaf = R("#3a8a2a", hs=20)
    s.circle(36, 20, 20, leaf[1], fill=True); s.circle(30, 16, 15, leaf[2], fill=True); s.circle(24, 10, 7, leaf[3], fill=True)
    s.circle(14, 26, 8, leaf[1], fill=True); s.circle(58, 26, 8, leaf[1], fill=True)
    s.rect(24, 30, 48, 64, bark[2]); s.rect(24, 30, 30, 64, bark[3]); s.rect(44, 32, 48, 64, bark[1])
    for x in (27, 35, 41):
        s.line(x, 34, x - 1, 62, bark[1])
    s.rect(29, 40, 33, 43, "#f2d23a"); s.rect(39, 40, 43, 43, "#f2d23a"); s.px(31, 42, INK); s.px(41, 42, INK)
    s.polygon([(31, 50), (41, 50), (39, 56), (33, 56)], "#2a1a0a")
    s.polygon([(24, 38), (6, 30), (4, 36), (22, 46)], bark[2]); s.polygon([(48, 38), (66, 28), (68, 34), (50, 46)], bark[2])
    for k in range(6):
        s.px(22 - k * 3, 64 + k // 2, bark[1]); s.px(50 + k * 3, 64 + k // 2, bark[1])
    s.rect(18, 64, 54, 68, bark[1])
    for x, y in ((8, 20), (62, 14), (40, 4)):
        s.px(x, y, "#b6f28c")
    return done(s, "#1a0e04")

def stationmaster():
    """Phantom Stationmaster (STATION gate, pixel layer): ghost conductor, lantern, misty tail."""
    s = Sprite(64, 64); coat = R("#2a3a68", hs=18); mist = R("#8fa8c8", hs=14); gold = R("#f2c230", 4, 22)
    s.polygon([(20, 44), (44, 44), (40, 56), (46, 62), (34, 58), (30, 63), (26, 57), (16, 61), (22, 54)], mist[2])   # misty tail
    s.polygon([(22, 46), (32, 46), (28, 56), (22, 54)], mist[3], only="opaque")
    s.polygon([(18, 22), (46, 22), (48, 48), (16, 48)], coat[2]); s.polygon([(18, 22), (28, 22), (22, 48), (16, 48)], coat[3], only="opaque")
    s.polygon([(38, 22), (46, 22), (48, 48), (42, 48)], coat[1], only="opaque")
    s.line(32, 24, 32, 47, coat[0])
    for y in (27, 33, 39, 45):
        s.px(30, y, gold[3]); s.px(34, y, gold[2])                                         # buttons
    s.line(34, 30, 42, 36, gold[2]); s.circle(42, 37, 2, gold[2])                          # watch chain
    s.circle(32, 15, 8, "#c8e0f0", fill=True); s.circle(30, 13, 4, "#e8f4ff", fill=True)   # pale face
    s.rect(27, 14, 29, 16, "#1a2a48"); s.rect(35, 14, 37, 16, "#1a2a48"); s.px(28, 15, "#7ff0ff"); s.px(36, 15, "#7ff0ff")
    s.line(29, 20, 35, 20, "#6a88a8")
    s.rect(22, 4, 42, 9, coat[2]); s.rect(22, 4, 42, 5, coat[3]); s.rect(22, 8, 42, 9, gold[2])   # cap
    s.rect(19, 9, 45, 10, "#10182a"); s.rect(30, 5, 34, 7, gold[3])                       # visor + badge
    s.rect(46, 26, 50, 38, coat[2]); s.rect(12, 26, 17, 36, coat[1])                     # arms
    s.line(49, 38, 49, 42, INK); s.rect(46, 42, 53, 51, gold[1]); s.rect(47, 43, 52, 50, "#58d06a")  # lantern
    s.rect(48, 45, 51, 48, "#c8ffb0"); s.line(46, 42, 53, 42, gold[3])
    for x, y in ((8, 20), (56, 14), (6, 44), (58, 56)):
        s.px(x, y, "#7ff0ff")
    return done(s, "#0a1020")


def relic_colossus():
    """Ancient Relic Guardian (MUSEUM gate, myth layer): awakened stone statue with glowing runes."""
    s = Sprite(72, 72); st = R("#b0a890", hs=12); gold = R("#f2c230", 5, 22)
    for x, y, r in ((8, 18, 3), (64, 12, 2), (60, 40, 3), (6, 46, 2)):
        s.circle(x, y, r, st[1], fill=True); s.px(x - 1, y - 1, st[3])                      # floating shards
    s.rect(22, 26, 50, 58, st[2]); s.rect(22, 26, 28, 58, st[3]); s.rect(44, 26, 50, 58, st[1])   # torso
    s.rect(18, 24, 54, 30, st[2]); s.line(18, 24, 54, 24, st[3])                           # shoulders
    s.rect(26, 6, 46, 24, st[2]); s.rect(26, 6, 31, 24, st[3]); s.rect(42, 6, 46, 24, st[1])     # carved head
    s.polygon([(24, 6), (36, 0), (48, 6)], st[3])                                         # crown ridge
    s.rect(29, 13, 33, 15, gold[4]); s.rect(39, 13, 43, 15, gold[4])                       # glowing eyes
    s.line(31, 19, 41, 19, st[0]); s.line(36, 7, 36, 11, gold[2])
    for x0, y0, x1, y1 in ((25, 32, 33, 40), (47, 32, 39, 40), (36, 42, 36, 54), (28, 50, 44, 50)):
        s.line(x0, y0, x1, y1, gold[3])                                                   # rune lines
    s.circle(36, 38, 3, gold[2], fill=True); s.px(36, 38, "#ffffff")                       # core rune
    s.rect(10, 28, 18, 50, st[2]); s.rect(54, 28, 62, 50, st[1])                           # arms
    s.rect(6, 50, 20, 56, st[2]); s.rect(52, 50, 66, 56, st[1])                           # fists
    s.rect(24, 58, 32, 68, st[2]); s.rect(40, 58, 48, 68, st[1])                          # legs
    s.rect(20, 68, 52, 70, st[0])
    s.line(46, 8, 44, 16, st[0]); s.line(52, 34, 50, 42, st[0])                           # cracks
    return done(s, "#1a140a")



SPRITES = {
    "mob_slime": slime, "mob_pigeon": pigeon, "mob_rat": rat, "mob_cat": cat, "mob_ant": ant,
    "mob_dog": dog_spirit, "mob_scarecrow": scarecrow, "mob_carp": carp, "mob_gecko": gecko,
    "mob_leaf": leaf_sprite, "mob_firefly": firefly, "mob_tuktuk": tuktuk, "mob_songthaew": songthaew,
    "mob_crab": crab, "mob_lantern": lantern, "mob_bat": bat, "mob_python": python_, "mob_lizard": lizard,
    "mob_krasue": krasue, "mob_sapling": sapling, "mob_wraith": wraith, "mob_elephant": elephant,
    "mob_mannequin": mannequin, "mob_dummy": lambda: dummy(False), "mob_dummy_armored": lambda: dummy(True),
    "boss_goblin_king": goblin_king, "boss_sale_queen": sale_queen, "boss_octane": octane,
    "boss_yaksha": yaksha, "boss_treant": treant,
    "boss_stationmaster": stationmaster, "boss_relic": relic_colossus,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    out = {}
    for name, fn in SPRITES.items():
        s = fn()
        s.save_png(os.path.join(OUT, f"{name}.png"))
        out[name] = s.composite(1)
    Z = 4
    cols = 6
    cw, ch = 72 * Z + 16, 72 * Z + 30
    rows = (len(out) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cw, rows * ch), (120, 160, 110, 255))
    d = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(out.items()):
        x, y = (i % cols) * cw + 8, (i // cols) * ch + 6
        big = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
        sheet.alpha_composite(big, (x + (72 * Z - big.width) // 2, y + 72 * Z - big.height))
        d.text((x, y + 72 * Z + 4), f"{n} {im.width}x{im.height}", fill=(255, 255, 255, 255))
    sheet.save(os.path.join(HERE, "preview.png"))
    print("OK", len(out), "sprites")


if __name__ == "__main__":
    main()
