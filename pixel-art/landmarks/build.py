#!/usr/bin/env python3
"""
Map pins in the story's visual language (docs/STORY.md §5):

- Gates are ONLY rifts — a tear in the air, no building. Two layers x six ranks:
    pixel layer (convenience store, mall, fuel, station): dark glitching tear, square pixels breaking off
    myth layer  (temple, museum):                         tear of golden light with kranok flame edges
    world boss  (large park):                             the biggest golden tear with a crown
  Rank = edge colour (E grey · D green · C blue · B purple · A orange · S gold) and tear height.
  Open gates are 4-frame strips; a closed gate is a thin grey crack sealed by [ระบบ] brackets.
- Services (hospital, market): a small [ระบบ] hologram diamond with the service icon.
- Sanctuary (places of worship without a gate): a soft light column on a lotus ring, no faith symbols.
- Home: the player's house with a banner.

    python pixel-art/landmarks/build.py

Outputs apps/game/public/assets/landmarks/*.png (1x; stale files removed) and preview.png here.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite, ramp  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

OUT = os.path.join(ROOT, "apps", "game", "public", "assets", "landmarks")
INK = "#0c0818"
RANKS = ["E", "D", "C", "B", "A", "S"]
RANK = {"E": "#9aa4b0", "D": "#3ad07a", "C": "#3a9aff", "B": "#b05aff", "A": "#ff8a2a", "S": "#ffd23a"}
HEIGHT = {"E": 40, "D": 46, "C": 52, "B": 58, "A": 62, "S": 66}
FRAMES = 4
GW, GH = 56, 76          # gate frame
WW, WH = 64, 100         # world-boss frame (room for the crown)


def R(base, n=5, hs=16):
    return ramp(base, n, hue_shift=hs)


# --------------------------------------------------------------------------------------------
# Rifts

def spine(i, h, f, amp=3.0):
    """Zig-zag centre line of the tear (a crack in the air), shimmering a little per frame."""
    pts = [0, 3, -2, 2, -3, 1, 0]
    t = i / max(1, h - 1) * (len(pts) - 1)
    k = int(t)
    u = t - k
    x = pts[k] * (1 - u) + pts[min(k + 1, len(pts) - 1)] * u
    return round(x * amp / 3 + math.sin(i * 0.9 + f * 1.7) * 0.5)


def belly(i, h):
    return math.sin(math.pi * i / (h - 1)) ** 1.3


def pixel_rift(rank, f):
    """Pixel layer: a glitching dark tear; edge pixels break off and drift up; data rain inside."""
    s = Sprite(GW, GH)
    col = R(RANK[rank], hs=20)
    h = HEIGHT[rank]
    cx = GW // 2
    top = GH - 8 - h
    maxw = 4 + h // 14
    g = random.Random(11 + ord(rank))
    jag = [g.choice([0, 0, 1, -1, 1]) for _ in range(h)]
    glitch = (f * 17 + ord(rank)) % (h - 10) + 5            # one horizontal glitch slice per frame
    for k in range(10):                                       # corrupted ground
        x = cx + g.randint(-11, 11)
        s.px(x, GH - 6 + g.randint(-1, 1), col[2] if k % 3 else col[4])
    s.ellipse(cx - 8, GH - 8, cx + 8, GH - 5, "#1a1030")
    for i in range(h):
        y = top + i
        hw = round(belly(i, h) * maxw) + (jag[(i + f) % h] if 4 < i < h - 5 else 0)
        wob = spine(i, h, f) + (2 if glitch <= i < glitch + 2 else 0)
        x0, x1 = cx - hw + wob, cx + hw + wob
        if hw <= 0:
            s.px(cx + wob, y, col[4])
            continue
        s.line(x0, y, x1, y, "#0a0620")
        s.px(x0, y, col[3]); s.px(x1, y, col[3])
        s.px(x0 - 1, y, col[2]); s.px(x1 + 1, y, col[2])
        if (i + f) % 3 == 0:                                   # faint aura
            s.px(x0 - 3, y, col[1]); s.px(x1 + 3, y, col[1])
        for x in range(x0 + 2, x1 - 1):                        # data rain scrolling down
            if (x * 7 + (y - f * 3) * 13) % 23 == 0:
                s.px(x, y, "#7ff0ff" if (x + y) % 2 else "#ff7ae0")
    for i in range(3, h - 3):
        s.px(cx + spine(i, h, f), top + i, "#2a1860")          # deep core
    for k in range(9):                                        # pixels breaking off and floating up
        side = -1 if k % 2 else 1
        yy = top + (k * 11 + f * 5) % h
        xx = cx + spine((k * 11) % h, h, f) + side * (maxw + 3 + (k * 3 + f) % 6)
        sz = 1 if k % 3 else 0
        s.rect(xx, yy - f, xx + sz, yy - f + sz, col[3] if k % 2 else "#7ff0ff")
    s.outline(INK, where="outside")
    return s


def myth_rift(rank, f, world=False):
    """Myth layer: a tear of golden light with kranok flame edges and rising sparks."""
    W, H = (WW, WH) if world else (GW, GH)
    s = Sprite(W, H)
    edge = R(RANK[rank], hs=18)
    gold = R("#f2c230", 5, 22)
    h = HEIGHT[rank] + (12 if world else 0)
    cx = W // 2
    top = H - 8 - h
    maxw = 5 + h // 12 + (1 if world else 0)
    s.ellipse(cx - 10, H - 8, cx + 10, H - 4, gold[1]); s.ellipse(cx - 7, H - 7, cx + 7, H - 5, gold[3])   # light pool
    for i in range(h):
        y = top + i
        hw = round(belly(i, h) * maxw)
        wob = spine(i, h, f, amp=2.4)
        x0, x1 = cx - hw + wob, cx + hw + wob
        if hw <= 0:
            s.px(cx + wob, y, gold[4])
            continue
        for x in range(x0, x1 + 1):
            d = abs(x - (cx + wob)) / max(1, hw)
            s.px(x, y, "#fffbe8" if d < 0.3 else gold[4] if d < 0.6 else gold[3] if d < 0.85 else gold[2])
        s.px(x0 - 1, y, edge[3]); s.px(x1 + 1, y, edge[3])
        if i % 5 == (f % 5) and 3 < i < h - 4:                 # kranok flame flicks
            s.px(x0 - 2, y - 1, edge[2]); s.px(x0 - 3, y - 2, edge[4])
            s.px(x1 + 2, y - 1, edge[2]); s.px(x1 + 3, y - 2, edge[4])
    for k in range(10 + (6 if world else 0)):                  # rising sparks (leaf-green for the world tree)
        xx = cx + ((k * 7) % 25) - 12
        yy = top + h - ((k * 9 + f * 6) % (h + 6))
        s.px(xx, yy, ("#b6f28c" if world and k % 3 == 0 else "#fff6c8") if k % 2 else gold[3])
    if world:                                                   # world-boss crown
        for x, y in ((cx - 5, top - 6), (cx, top - 9), (cx + 5, top - 6)):
            s.polygon([(x - 2, y + 4), (x, y), (x + 2, y + 4)], gold[3])
        s.rect(cx - 7, top - 3, cx + 7, top - 2, gold[2]); s.px(cx, top - 3, "#e0303a")
    s.outline(INK, where="outside")
    return s


def sealed(rank):
    """Closed gate: a thin grey crack held shut by three [ระบบ] seal brackets; the lock shows the rank."""
    s = Sprite(GW, GH)
    h = HEIGHT[rank]
    cx = GW // 2
    top = GH - 8 - h
    s.ellipse(cx - 9, GH - 8, cx + 9, GH - 5, "#2a2a38")
    for i in range(h):
        y = top + i
        hw = round(math.sin(math.pi * i / (h - 1)) ** 0.75 * 2)
        wob = spine(i, h, 0)
        s.line(cx - hw + wob, y, cx + hw + wob, y, "#3a3450")
        s.px(cx + wob, y, "#5a5270")
    for k in range(3):
        y = top + (k + 1) * h // 4
        s.rect(cx - 7, y, cx + 7, y + 2, "#1c2a50"); s.line(cx - 7, y + 1, cx + 7, y + 1, "#4fd8ff")
        for x in (cx - 7, cx + 7):
            s.rect(x - 1, y - 1, x, y + 3, "#4fd8ff")          # [ ] bracket ends
    my = top + h // 2
    s.rect(cx - 3, my - 2, cx + 3, my + 4, "#0c1226"); s.rect(cx - 2, my - 1, cx + 2, my + 3, RANK[rank]); s.px(cx, my + 1, "#0c1226")
    s.outline(INK, where="outside")
    return s


def strip(frames):
    ims = [fr.composite(1) for fr in frames]
    w, h = ims[0].width, ims[0].height
    im = Image.new("RGBA", (w * len(ims), h), (0, 0, 0, 0))
    for i, fr in enumerate(ims):
        im.alpha_composite(fr, (i * w, 0))
    return im


# --------------------------------------------------------------------------------------------
# Places without a gate

def beacon(icon):
    """Service of the Walker association: a [ระบบ] hologram diamond on a light plate."""
    s = Sprite(32, 44)
    s.ellipse(6, 36, 25, 42, "#1c2a50"); s.ellipse(8, 37, 23, 41, "#4fd8ff"); s.ellipse(11, 38, 20, 40, "#c8f6ff")
    s.line(15, 24, 15, 36, "#4fd8ff"); s.line(16, 24, 16, 36, "#c8f6ff")
    s.polygon([(15, 2), (28, 13), (15, 25), (2, 13)], "#141c38")
    s.polygon([(15, 2), (28, 13), (15, 25), (2, 13)], "#4fd8ff", fill=False)
    s.polygon([(15, 4), (26, 13), (15, 23), (4, 13)], "#1e2c54", fill=False)
    for x, y in ((15, 2), (28, 13), (15, 25), (2, 13)):
        s.px(x, y, "#c8f6ff")                                   # bracket-bright corners
    icon(s)
    s.outline(INK, where="outside")
    return s


def heart_plus(s):
    s.circle(12, 11, 2, "#e8507a", fill=True); s.circle(18, 11, 2, "#e8507a", fill=True)
    s.polygon([(10, 12), (20, 12), (15, 18)], "#e8507a")
    s.rect(14, 8, 16, 14, "#ffffff"); s.rect(12, 10, 18, 12, "#ffffff")


def basket(s):
    s.ellipse(9, 12, 21, 19, "#c8a060"); s.line(10, 14, 20, 14, "#8a5a34"); s.line(11, 17, 19, 17, "#8a5a34")
    for x, c in ((12, "#f2c230"), (15, "#e8507a"), (18, "#58d06a")):
        s.circle(x, 10, 1, c, fill=True)


def sanctuary():
    """Places of worship without a gate: a soft light column on a lotus ring — no faith symbols."""
    s = Sprite(32, 48)
    s.ellipse(3, 38, 28, 46, "#e6d69a"); s.ellipse(6, 39, 25, 45, "#fff6d0")
    for k in range(10):
        a = k / 10 * math.tau
        x, y = round(15.5 + math.cos(a) * 11), round(42 + math.sin(a) * 3.2)
        s.px(x, y, "#58d06a"); s.px(x, y - 1, "#9ae88a")          # lotus leaves
    for k in range(5):
        a = k / 5 * math.pi + math.pi
        s.px(round(15.5 + math.cos(a) * 5), round(40 + math.sin(a) * 1.5), "#f6a8c8")   # petals
    for x in range(10, 22):
        a = 1 - abs(x - 15.5) / 6
        for y in range(3, 41):
            fade = y / 41
            if a > 0.75:
                s.px(x, y, "#fffbe8")
            elif a > 0.45 and (x + y) % 2 == 0:
                s.px(x, y, "#fff2c0")
            elif (x + y) % 4 == 0 and fade > 0.2:
                s.px(x, y, "#f6e6a8")
    for x, y in ((7, 12), (25, 18), (9, 28), (23, 6)):
        s.px(x, y, "#fff6c8")                                   # floating motes
    s.outline("#b89a4a", where="outside")
    return s


def home():
    s = Sprite(40, 50)
    wall = R("#f2e2bf", hs=10)
    roof = R("#c8502a", hs=16)
    s.ellipse(4, 42, 35, 48, "#f2a02a"); s.ellipse(8, 43, 31, 47, "#ffd08a")
    s.rect(9, 24, 30, 44, wall[2]); s.rect(9, 24, 12, 44, wall[3]); s.rect(27, 24, 30, 44, wall[1])
    s.polygon([(5, 25), (20, 11), (34, 25)], roof[2]); s.polygon([(5, 25), (20, 11), (20, 25)], roof[3], only="opaque")
    s.rect(17, 33, 23, 44, "#7a4a22"); s.px(22, 38, "#f2c230")
    for x in (11, 25):
        s.rect(x, 28, x + 3, 31, "#ffe08a"); s.px(x, 28, "#fff6c8")   # warm lit windows
    s.line(29, 2, 29, 16, "#3a3f58")                                   # banner pole
    s.polygon([(30, 2), (38, 4), (30, 8)], "#4f7fe0"); s.px(31, 4, "#a8c4ff")
    s.outline(INK, where="outside")
    return s


# --------------------------------------------------------------------------------------------

def main():
    os.makedirs(OUT, exist_ok=True)
    files = {}
    for r in RANKS:
        files[f"rift_pixel_{r}"] = strip([pixel_rift(r, f) for f in range(FRAMES)])
        files[f"rift_myth_{r}"] = strip([myth_rift(r, f) for f in range(FRAMES)])
        files[f"rift_world_{r}"] = strip([myth_rift(r, f, world=True) for f in range(FRAMES)])
        files[f"sealed_{r}"] = sealed(r).composite(1).copy()
    files["HOSPITAL"] = beacon(heart_plus).composite(1).copy()
    files["MARKET"] = beacon(basket).composite(1).copy()
    files["SANCTUARY"] = sanctuary().composite(1).copy()
    files["HOME"] = home().composite(1).copy()
    for name, im in files.items():
        im.save(os.path.join(OUT, f"{name}.png"))
    for f in os.listdir(OUT):                                    # remove the old building pins
        if f.endswith(".png") and f[:-4] not in files:
            os.remove(os.path.join(OUT, f))

    # Review sheet: frame 0 of every open rift by rank, the sealed ones, then the other places.
    Z = 3
    rows = [
        [files[f"rift_pixel_{r}"].crop((0, 0, GW, GH)) for r in RANKS],
        [files[f"rift_myth_{r}"].crop((0, 0, GW, GH)) for r in RANKS],
        [files[f"rift_world_{r}"].crop((0, 0, WW, WH)) for r in RANKS],
        [files[f"sealed_{r}"] for r in RANKS],
        [files["HOSPITAL"], files["MARKET"], files["SANCTUARY"], files["HOME"]],
    ]
    cell = WW * Z + 16
    sheet = Image.new("RGBA", (6 * cell, sum(max(i.height for i in row) * Z + 24 for row in rows)), (176, 214, 150, 255))
    d = ImageDraw.Draw(sheet)
    y = 4
    for row in rows:
        rh = max(i.height for i in row) * Z
        for i, im in enumerate(row):
            big = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
            sheet.alpha_composite(big, (i * cell + (cell - big.width) // 2, y + rh - big.height))
        y += rh + 24
    for i, r in enumerate(RANKS):
        d.text((i * cell + 8, 2), r, fill=(28, 26, 40, 255))
    sheet.save(os.path.join(HERE, "preview.png"))
    print("OK", len(files), "landmark files")


if __name__ == "__main__":
    main()
