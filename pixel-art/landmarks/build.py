#!/usr/bin/env python3
"""
16-bit landmark markers for the map: a small building standing on a round base plate whose rim
colour tells the kind (like PoGO stops/gyms). 48x52 each, light from the top-left.

    python pixel-art/landmarks/build.py

Outputs apps/game/public/assets/landmarks/<KIND>.png (1x) and preview.png here.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite, ramp  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

OUT = os.path.join(ROOT, "apps", "game", "public", "assets", "landmarks")
INK = "#1c1a28"
W, H = 48, 52


def R(base, n=5, hs=16):
    return ramp(base, n, hue_shift=hs)


def base(s, rim):
    """Round base plate at the bottom: coloured rim + stone top."""
    r = R(rim)
    s.ellipse(4, 40, 43, 51, r[1]); s.ellipse(4, 39, 43, 50, r[2], only="opaque")
    s.ellipse(8, 40, 39, 48, "#d8d0bc"); s.ellipse(8, 40, 30, 45, "#ece6d6", only="opaque")
    s.line(12, 41, 20, 41, "#ffffff")


def done(s):
    s.outline(INK, where="outside")
    return s


def temple():
    s = Sprite(W, H); base(s, "#e0a020")
    wall = R("#f2ece0", hs=8); roof = R("#c8342a", hs=16); roof2 = R("#2f8a4a", hs=16); gold = R("#f2c230", 5, 22)
    s.rect(12, 30, 35, 43, wall[2]); s.rect(12, 30, 15, 43, wall[3]); s.rect(32, 30, 35, 43, wall[1])
    s.rect(21, 34, 26, 43, "#6a3a1a"); s.line(23, 34, 23, 43, gold[2]); s.rect(21, 34, 26, 35, gold[2])   # door
    for x in (15, 30):
        s.rect(x, 34, x + 2, 38, "#3a2a1a")                                            # windows
    s.polygon([(6, 30), (24, 17), (41, 30)], roof[2]); s.polygon([(6, 30), (24, 17), (24, 30)], roof[3], only="opaque")
    s.line(6, 30, 41, 30, gold[2])
    s.polygon([(11, 23), (24, 10), (36, 23)], roof2[2]); s.polygon([(11, 23), (24, 10), (24, 23)], roof2[3], only="opaque")
    s.line(11, 23, 36, 23, gold[2])
    s.polygon([(16, 15), (24, 5), (31, 15)], roof[2]); s.line(16, 15, 31, 15, gold[2])
    for x, y, d in ((6, 30, -1), (41, 30, 1), (11, 23, -1), (36, 23, 1), (16, 15, -1), (31, 15, 1)):
        s.px(x + d, y - 1, gold[3]); s.px(x + 2 * d, y - 2, gold[3]); s.px(x + 2 * d, y - 3, gold[2])  # chofa
    s.line(24, 1, 24, 5, gold[3]); s.px(24, 0, gold[4])                                  # spire
    s.rect(9, 43, 38, 44, wall[1])
    return done(s)


def mall():
    s = Sprite(W, H); base(s, "#d23a8a")
    wall = R("#dfe6f2", hs=10); glass = R("#4a8ad8", hs=16); pink = R("#e0508a", hs=18)
    s.rect(8, 10, 39, 43, wall[2]); s.rect(8, 10, 12, 43, wall[3]); s.rect(35, 10, 39, 43, wall[1])
    for y in range(14, 34, 5):
        for x in range(12, 36, 6):
            s.rect(x, y, x + 3, y + 2, glass[2]); s.px(x, y, glass[4])
    s.rect(6, 6, 41, 10, pink[2]); s.line(6, 6, 41, 6, pink[3]); s.line(6, 10, 41, 10, pink[1])
    for x in range(10, 38, 4):
        s.px(x, 8, "#fff6c8")                                                             # sign lights
    s.rect(18, 35, 29, 43, glass[1]); s.line(23, 35, 23, 43, wall[3]); s.rect(16, 34, 31, 35, pink[2])  # entrance
    s.rect(34, 36, 38, 41, "#f2c230"); s.line(35, 34, 35, 36, INK); s.line(37, 34, 37, 36, INK); s.line(35, 34, 37, 34, INK)  # bag
    return done(s)


def convenience():
    s = Sprite(W, H); base(s, "#3aa06a")
    wall = R("#f6f0e1", hs=8); aw = "#2f8a4a"
    s.rect(9, 20, 38, 43, wall[2]); s.rect(9, 20, 12, 43, wall[3]); s.rect(35, 20, 38, 43, wall[1])
    s.rect(7, 14, 40, 19, "#ffffff")
    for x in range(7, 41, 4):
        s.rect(x, 14, x + 1, 19, aw)                                                       # striped awning
    s.line(7, 19, 40, 19, "#1f6a3a")
    s.rect(9, 8, 38, 13, "#f2a02a"); s.rect(9, 8, 38, 9, "#ffd08a"); s.rect(18, 10, 29, 11, "#ffffff")   # sign
    s.rect(12, 24, 22, 40, "#8fc8ff"); s.rect(12, 24, 13, 40, "#d8f0ff")                     # glass window
    s.rect(26, 26, 34, 43, "#4a8ad8"); s.line(30, 26, 30, 43, "#d8f0ff")                     # door
    s.rect(14, 30, 20, 31, "#e53935"); s.rect(14, 34, 20, 35, "#f2c230")                     # shelves
    return done(s)


def fuel():
    s = Sprite(W, H); base(s, "#e0602a")
    red = R("#d23a30", hs=16); pole = "#9aa4b0"
    s.rect(4, 10, 43, 15, red[2]); s.line(4, 10, 43, 10, red[3]); s.line(4, 15, 43, 15, red[1])
    s.rect(6, 12, 41, 12, "#ffffff")
    s.rect(8, 16, 9, 43, pole); s.rect(38, 16, 39, 43, pole)
    s.rect(18, 24, 29, 43, red[2]); s.rect(18, 24, 20, 43, red[3]); s.rect(20, 27, 27, 32, "#1f2a3a"); s.rect(21, 28, 26, 29, "#7affb0")
    s.line(29, 30, 33, 34, INK); s.line(33, 34, 33, 40, INK); s.rect(32, 40, 34, 42, "#3a3f58")   # hose
    s.rect(20, 35, 27, 37, "#f2c230")
    s.polygon([(38, 3), (46, 3), (46, 9), (42, 11), (38, 9)], "#f2c230"); s.px(41, 5, INK); s.px(42, 5, INK); s.px(42, 6, INK)  # price sign
    return done(s)


def park():
    s = Sprite(W, H); base(s, "#58b83a")
    leaf = R("#3a9a3a", hs=20); bark = R("#7a5a36")
    s.rect(21, 26, 26, 43, bark[2]); s.rect(21, 26, 22, 43, bark[3])
    s.circle(24, 16, 13, leaf[1], fill=True); s.circle(21, 13, 10, leaf[2], fill=True); s.circle(17, 9, 5, leaf[3], fill=True)
    s.circle(10, 22, 5, leaf[1], fill=True); s.circle(38, 21, 5, leaf[1], fill=True)
    for x, y in ((28, 10), (33, 16), (15, 20)):
        s.px(x, y, "#e8507a")                                                                # flowers
    s.rect(30, 38, 40, 39, "#a8743e"); s.rect(30, 36, 40, 36, "#a8743e"); s.px(31, 40, "#6a4424"); s.px(39, 40, "#6a4424")  # bench
    return done(s)


def home():
    s = Sprite(W, H); base(s, "#f2a02a")
    wall = R("#f2e2bf", hs=10); roof = R("#c8502a", hs=16)
    s.rect(11, 24, 36, 43, wall[2]); s.rect(11, 24, 14, 43, wall[3]); s.rect(33, 24, 36, 43, wall[1])
    s.polygon([(6, 25), (24, 9), (41, 25)], roof[2]); s.polygon([(6, 25), (24, 9), (24, 25)], roof[3], only="opaque")
    s.rect(31, 10, 34, 18, "#8a5a3a"); s.px(32, 8, "#d8d8d8"); s.px(33, 6, "#e8e8e8")          # chimney + smoke
    s.rect(20, 32, 27, 43, "#7a4a22"); s.px(26, 38, "#f2c230")
    s.rect(14, 28, 18, 32, "#8fc8ff"); s.rect(29, 28, 33, 32, "#8fc8ff"); s.px(14, 28, "#ffffff")
    s.circle(24, 19, 2, "#fff6c8", fill=True)
    return done(s)


# --------------------------------------------------------------------------------------------
# Worldwide places (docs/STORY.md §4)

def station():
    s = Sprite(W, H); base(s, "#3a7ae8")
    wall = R("#e6dcc8", hs=10); roof = R("#3a5ea8", hs=16)
    s.rect(5, 22, 42, 43, wall[2]); s.rect(5, 22, 8, 43, wall[3]); s.rect(39, 22, 42, 43, wall[1])
    s.polygon([(3, 22), (24, 12), (44, 22)], roof[2]); s.polygon([(3, 22), (24, 12), (24, 22)], roof[3], only="opaque")
    s.circle(24, 18, 4, "#fff6e0", fill=True); s.circle(24, 18, 4, INK); s.line(24, 18, 24, 15, INK); s.line(24, 18, 26, 18, INK)   # clock
    for x in (9, 31):
        s.rect(x, 27, x + 6, 35, "#8fc8ff"); s.px(x, 27, "#ffffff")                                   # windows
    s.rect(19, 29, 28, 43, "#6a4424"); s.ellipse(19, 26, 28, 32, "#6a4424"); s.line(23, 30, 23, 43, "#8a5a34")   # arch door
    for x in (6, 41):
        s.line(x, 44, x, 48, "#6a6470")
    s.line(6, 45, 41, 45, "#9aa4b0"); s.line(6, 47, 41, 47, "#9aa4b0")                                 # rails
    for x in range(8, 41, 4):
        s.line(x, 44, x, 48, "#8a5a34")
    return done(s)


def museum():
    s = Sprite(W, H); base(s, "#b89a6a")
    stone = R("#e8e0cc", hs=10)
    s.polygon([(4, 18), (24, 7), (43, 18)], stone[2]); s.polygon([(4, 18), (24, 7), (24, 18)], stone[3], only="opaque")
    s.circle(24, 14, 2, "#f2c230", fill=True)                                                          # relic glow in the pediment
    s.rect(5, 18, 42, 21, stone[1])
    for x in (8, 16, 27, 35):
        s.rect(x, 22, x + 4, 39, stone[2]); s.line(x, 22, x, 39, stone[3]); s.line(x + 4, 22, x + 4, 39, stone[0])   # columns
    s.rect(20, 28, 25, 39, "#4a3a2a")                                                                  # doorway
    s.rect(4, 39, 43, 41, stone[1]); s.rect(2, 41, 45, 43, stone[0])                                   # steps
    for x, y in ((12, 26), (31, 31)):
        s.px(x, y, "#f2c230")                                                                          # glowing runes
    return done(s)


def hospital():
    s = Sprite(W, H); base(s, "#2fb8a8")
    wall = R("#f2f4f6", hs=8); teal = R("#2fb8a8", hs=16)
    s.rect(10, 12, 37, 43, wall[2]); s.rect(10, 12, 13, 43, wall[3]); s.rect(34, 12, 37, 43, wall[1])
    for y in range(20, 36, 5):
        for x in range(14, 34, 5):
            s.rect(x, y, x + 2, y + 2, "#8fc8e8")
    s.rect(19, 36, 28, 43, teal[1]); s.line(23, 36, 23, 43, wall[3])                                   # doors
    # heart + plus sign on the roof (no Red Cross emblem)
    s.circle(21, 5, 2, "#e8507a", fill=True); s.circle(26, 5, 2, "#e8507a", fill=True)
    s.polygon([(19, 6), (28, 6), (23, 11)], "#e8507a")
    s.rect(22, 3, 24, 8, "#ffffff"); s.rect(21, 5, 25, 6, "#ffffff")
    s.rect(9, 11, 38, 12, teal[2])
    return done(s)


def market():
    s = Sprite(W, H); base(s, "#e07a2a")
    for i, (x, col) in enumerate(((4, "#d8323a"), (18, "#2f8a4a"), (32, "#f2a02a"))):
        s.rect(x + 1, 26, x + 11, 42, "#a87850"); s.rect(x + 1, 26, x + 2, 42, "#c89454")              # stall
        for k in range(0, 12, 3):
            s.rect(x + k, 18, x + k + 1, 25, col); s.rect(x + k + 2, 18, x + k + 2, 25, "#ffffff")       # striped awning
        s.line(x, 25, x + 11, 25, INK)
        fruit = ("#f2c230", "#e8507a", "#58d06a")[i]
        for fx in range(x + 2, x + 11, 3):
            s.circle(fx, 29, 1, fruit, fill=True)                                                     # produce
        s.rect(x + 2, 33, x + 10, 34, "#8a5a34")
    s.rect(14, 8, 33, 14, "#fff6e0"); s.rect(14, 8, 33, 9, "#f2c230"); s.line(18, 11, 29, 11, "#d8323a")   # banner
    s.line(14, 14, 14, 18, INK); s.line(33, 14, 33, 18, INK)
    return done(s)


def sanctuary():
    s = Sprite(W, H); base(s, "#e8dca8")
    wall = R("#f6f2e6", hs=8); gold = R("#f2c230", 5, 22)
    s.circle(24, 16, 15, "#f6e6a8", fill=True); s.circle(24, 16, 12, "#fff6d0", fill=True)             # soft halo
    s.rect(11, 24, 36, 43, wall[2]); s.rect(11, 24, 14, 43, wall[3]); s.rect(33, 24, 36, 43, wall[1])
    s.ellipse(14, 12, 33, 30, wall[2]); s.ellipse(14, 12, 23, 26, wall[3], only="opaque")               # dome
    s.rect(11, 23, 36, 24, gold[2])
    s.rect(20, 32, 27, 43, "#c8a060"); s.ellipse(20, 29, 27, 35, "#c8a060"); s.line(23, 32, 23, 43, gold[3])   # door
    for x in (14, 31):
        s.rect(x, 29, x + 2, 34, "#8fc8e8")
    for x, y in ((8, 41), (39, 41), (6, 38), (41, 38)):
        s.px(x, y, "#e8507a"); s.px(x, y - 1, "#58d06a")                                             # flowers
    return done(s)


def rift(color="#b85aff", core="#2a1a48", sparkle="#7ff0ff"):
    """A dimensional rift drawn behind gate buildings: pixel layer = violet/cyan, myth layer = gold."""
    s = Sprite(W, H)
    r = R(color, hs=24)
    s.ellipse(6, 0, 41, 40, r[1]); s.ellipse(8, 1, 39, 38, r[3]); s.ellipse(11, 4, 36, 35, core)
    for x, y in ((12, 10), (34, 8), (9, 24), (38, 26), (24, 2), (16, 33), (32, 34)):
        s.px(x, y, sparkle)
    for x, y in ((4, 14), (43, 18), (2, 30), (45, 6)):
        s.px(x, y, r[3])                                                                              # stray pixels
    return s


LANDMARKS = {
    "TEMPLE": temple, "MALL": mall, "CONVENIENCE": convenience, "FUEL": fuel, "PARK": park, "HOME": home,
    "STATION": station, "MUSEUM": museum, "HOSPITAL": hospital, "MARKET": market, "SANCTUARY": sanctuary,
}
# Gates show a rift behind the building (docs/STORY.md §5): pixel layer vs myth layer.
PIXEL_GATES = {"CONVENIENCE", "MALL", "FUEL", "STATION"}
MYTH_GATES = {"TEMPLE", "MUSEUM", "PARK"}


def main():
    os.makedirs(OUT, exist_ok=True)
    out = {}
    for name, fn in LANDMARKS.items():
        im = fn().composite(1).copy()
        if name in PIXEL_GATES or name in MYTH_GATES:
            back = (rift() if name in PIXEL_GATES else rift("#f2c230", "#4a2a10", "#fff6c8")).composite(1).copy()
            back.alpha_composite(im)
            im = back
        im.save(os.path.join(OUT, f"{name}.png"))
        out[name] = im
    Z = 5
    sheet = Image.new("RGBA", (len(out) * (W * Z + 12) + 12, H * Z + 40), (178, 214, 150, 255))
    d = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(out.items()):
        x = 12 + i * (W * Z + 12)
        sheet.alpha_composite(im.resize((W * Z, H * Z), Image.NEAREST), (x, 8))
        d.text((x, H * Z + 14), n, fill=(30, 30, 40, 255))
    sheet.save(os.path.join(HERE, "preview.png"))
    print("OK", len(out), "landmarks")


if __name__ == "__main__":
    main()
