#!/usr/bin/env python3
"""
Item icons for Pixel Walker — 24x24, one light source (top-left), hue-shifted ramps,
dark ink outline outside. Source of truth for apps/game/public/assets/items/*.png.

    python pixel-art/item-icons/build.py        (from the repo root, or from this folder)

Outputs: <id>.png (1x) into apps/game/public/assets/items/, slot_<slot>.png ghost icons for
empty equipment slots, and preview.png (8x, labelled) + silhouette.png here for review.
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


def runner_sneakers():
    s = canvas()
    w = ramp("#eeeeea", 5, hue_shift=12)
    red = ramp("#e53935", 4, hue_shift=16)
    sole = ramp("#4a4f58", 4)
    s.polygon([(4, 9), (10, 8), (13, 12), (20, 13), (21, 16), (21, 17), (3, 17)], w[2])  # upper
    s.polygon([(4, 10), (9, 9), (10, 11), (5, 12)], w[4], only="opaque")
    s.polygon([(14, 14), (21, 15), (21, 16), (14, 16)], w[1], only="opaque")
    s.rect(2, 17, 21, 19, sole[2]); s.line(2, 19, 21, 19, sole[0]); s.line(3, 17, 20, 17, sole[3])
    # speed stripe: a clean 2px swoosh rising toward the toe
    for x in range(6, 18):
        y = 15 - (x - 6) // 4
        s.px(x, y, red[2], only="opaque"); s.px(x, y + 1, red[1], only="opaque")
    s.line(4, 9, 4, 16, w[1])                                                        # heel counter
    for x, y in ((9, 9), (10, 10), (11, 11)):
        s.px(x, y, sole[1], only="opaque")                                           # laces
    return finish(s)


def straw_sandals():
    s = canvas()
    straw = ramp("#d9b46a", 5, hue_shift=16)
    strap = ramp("#7a4a22", 4)
    for ox in (2, 12):  # left and right sandal, top view
        s.ellipse(ox, 3, ox + 8, 21, straw[2])
        s.ellipse(ox + 1, 4, ox + 5, 18, straw[3], only="opaque")
        s.ellipse(ox + 5, 8, ox + 8, 21, straw[1], only="opaque")
        for y in range(6, 20, 3):
            s.line(ox + 1, y, ox + 7, y, straw[1], only="opaque")  # weave
        s.line(ox + 1, 8, ox + 7, 8, strap[2]); s.line(ox + 1, 9, ox + 7, 9, strap[1])
        s.line(ox + 4, 4, ox + 4, 8, strap[2])
    return finish(s)


def aegis_shield():
    s = canvas()
    blue = ramp("#2f6fd6", 5, hue_shift=18)
    gold = ramp("#e0b030", 4, hue_shift=20)
    s.polygon([(3, 3), (20, 3), (20, 12), (12, 21), (11, 21), (3, 12)], gold[1])   # rim
    s.polygon([(5, 5), (18, 5), (18, 12), (12, 19), (11, 19), (5, 12)], blue[2])
    s.polygon([(5, 5), (11, 5), (11, 18), (5, 12)], blue[3], only="opaque")
    s.polygon([(14, 12), (18, 12), (12, 19)], blue[1], only="opaque")
    s.line(3, 3, 20, 3, gold[3]); s.line(3, 4, 3, 12, gold[2])
    # emblem: star cross
    s.line(11, 7, 11, 16, gold[2]); s.line(12, 7, 12, 16, gold[1])
    s.line(8, 10, 15, 10, gold[2]); s.line(8, 11, 15, 11, gold[1])
    s.px(11, 7, gold[3]); s.px(8, 10, gold[3])
    s.px(7, 6, blue[4]); s.px(8, 6, blue[4])
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


ICONS = {
    "cotton_shirt": cotton_shirt,
    "training_sword": training_sword,
    "apprentice_staff": lambda: staff("knob"),
    "cloth_bandana": cloth_bandana,
    "straw_sandals": straw_sandals,
    "pixel_broadsword": pixel_broadsword,
    "convenience_club": convenience_club,
    "starlight_staff": lambda: staff("star"),
    "aegis_shield": aegis_shield,
    "iron_helm": iron_helm,
    "fuel_plate": fuel_plate,
    "runner_sneakers": runner_sneakers,
    "golden_luck_ring": golden_luck_ring,
    "red_potion": lambda: potion("#d8323c"),
    "blue_elixir": lambda: potion("#2f7fe0", tall=True),
    "whetstone": whetstone,
    "master_repair_kit": repair_kit,
}

# Empty-slot ghosts (RO style): the silhouette of a typical item in that slot, pale.
SLOT_GHOSTS = {
    "helmet": "iron_helm",
    "chest": "cotton_shirt",
    "weapon": "training_sword",
    "offhand": "aegis_shield",
    "boots": "runner_sneakers",
    "accessory": "golden_luck_ring",
}


def ghost(img):
    g = Image.new("RGBA", img.size, (0, 0, 0, 0))
    src, dst = img.load(), g.load()
    for y in range(img.height):
        for x in range(img.width):
            r, gg, b, a = src[x, y]
            if a:
                lum = (r * 3 + gg * 6 + b) / 10
                dst[x, y] = (196, 206, 222, 255) if lum > 60 else (168, 180, 200, 255)
    return g


def main():
    os.makedirs(OUT, exist_ok=True)
    rendered = {}
    for name, fn in ICONS.items():
        s = fn()
        s.save_png(os.path.join(OUT, f"{name}.png"))
        rendered[name] = s.composite(1)
    for slot, src in SLOT_GHOSTS.items():
        ghost(rendered[src]).save(os.path.join(OUT, f"slot_{slot}.png"))

    # Review sheets: 8x preview with labels, and silhouettes.
    names = list(rendered) + [f"slot_{k}" for k in SLOT_GHOSTS]
    imgs = list(rendered.values()) + [ghost(rendered[v]) for v in SLOT_GHOSTS.values()]
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
    print("OK", len(rendered), "icons +", len(SLOT_GHOSTS), "slot ghosts")


if __name__ == "__main__":
    main()
