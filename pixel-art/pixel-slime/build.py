#!/usr/bin/env python3
"""Pixel Slime (สไลม์พิกเซล) — pixel-layer monster, rank E, Lv.1, water.

Drawn to the Pixel Walker ART_BIBLE (learned card 007): small monster on a 32×32 cell, feet at
bottom centre (16, 31), 3/4 view facing right, black 1 px silhouette, 6-step hue-shifted gel ramp,
2–4 px shadow clusters, dark underside, inner lines in the material's darkest step.

Design (ours, not SoC's): a sky-blue water drop whose tip leans back and is breaking off into
square pixel bits that float upward — the same "pixels rising from the rift" motif as the pixel-layer
gates in docs/STORY.md.

    python pixel-art/pixel-slime/build.py
Outputs (this folder): pixel_slime_idle0.png (1×), review_pixel_slime_idle0.png (for the owner).
Stage: KEY FRAME ONLY (idle 0). Other frames wait for the owner's approval.
"""
import colorsys
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))

from PIL import Image, ImageDraw  # noqa: E402
from pixelstudio import Sprite  # noqa: E402

W, H = 32, 32
FOOT = (16, 31)
OUTLINE = "#010101"


def hsv(h, s, v):
    r, g, b = colorsys.hsv_to_rgb(h / 360, s, v)
    return "#%02x%02x%02x" % (round(r * 255), round(g * 255), round(b * 255))


# Gel: 6 steps, dark → light. Hue 234 → 204 (~30°): shadows lean violet-navy, lights lean clear sky.
GEL = [hsv(h, s, v) for h, s, v in [
    (234, 0.72, 0.17), (227, 0.66, 0.36), (220, 0.60, 0.55),
    (213, 0.50, 0.72), (206, 0.36, 0.86), (200, 0.16, 0.95),
]]
EYE = GEL[0]            # pupils share the gel's darkest step (no near-duplicate navy)
EYE_LIT = "#eef6ff"

# Silhouette: inclusive [left, right] per row, outline included. A drop whose tip leans back (left),
# flaring into a round dome: the side steps shrink going down (3, 2, 2, 1, 1, 0 …) so the edge reads as
# a convex curve instead of a 1:1 cone.
_LEFT = [12, 11, 9, 7, 6, 5, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2, 3, 3, 4, 6]
_RIGHT = [14, 16, 19, 21, 23, 24, 25, 26, 26, 27, 27, 28, 28, 28, 29, 29, 29, 29, 28, 27, 25]
BODY_ROWS = {11 + i: (l, r) for i, (l, r) in enumerate(zip(_LEFT, _RIGHT))}
TOP, BOTTOM = min(BODY_ROWS), max(BODY_ROWS)

# Pixel bits breaking off the tip, drifting up and forward: (x0, y0, size) of the interior;
# each gets its own black outline.
BITS = [(14, 6, 3), (18, 1, 2)]
BIT_SHADES = {3: [[4, 4, 3], [3, 3, 2], [2, 2, 1]], 2: [[4, 3], [2, 1]]}

# Features (colours, not gel steps).
SPECULAR = [(9, 15), (10, 15), (8, 16), (9, 16), (8, 17), (12, 12), (13, 12)]  # top-front glints
BUBBLES = [[(6, 25), (7, 25), (6, 26)], [(24, 28), (25, 28), (25, 27)]]        # 3-px lit clusters in the gel
NEAR_EYE = [(19, 19), (20, 19), (19, 20), (20, 20), (19, 21), (20, 21)]
FAR_EYE = [(14, 20), (15, 20), (14, 21), (15, 21)]
EYE_GLINTS = [(19, 19), (14, 20)]
MOUTH = [(16, 23), (17, 24), (18, 23)]                          # darkest gel step, not black


def in_body(x, y):
    row = BODY_ROWS.get(y)
    return row is not None and row[0] <= x <= row[1]


def gel_step(x, y):
    """Light from top-front: bright crown, dark flanks, darkest underside (6-step ramp index)."""
    left, right = BODY_ROWS[y]
    half = max(1.0, (right - left) / 2)
    nx = (x - (left + right) / 2) / half
    t = (y - TOP) / (BOTTOM - TOP)
    value = 1.0 - 0.72 * t - 0.42 * nx * nx
    step = 4 if value >= 0.76 else 3 if value >= 0.50 else 2 if value >= 0.30 else 1
    if not in_body(x, y + 2):          # the last interior row above the outline = shadow row
        step = 1
    return step


def despeckle(grid):
    """Remove lone pixels: a gel pixel whose 4 neighbours all differ takes the majority neighbour."""
    changed = True
    while changed:
        changed = False
        for (x, y), c in list(grid.items()):
            if c not in GEL:
                continue
            nbr = [grid.get((x + dx, y + dy)) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            same = [n for n in nbr if n == c]
            gel_nbr = [n for n in nbr if n in GEL]
            if not same and gel_nbr:
                grid[(x, y)] = max(set(gel_nbr), key=gel_nbr.count)
                changed = True


def draw_idle0():
    grid = {}
    # body interior
    for y, (left, right) in BODY_ROWS.items():
        for x in range(left, right + 1):
            edge = not all(in_body(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            grid[(x, y)] = OUTLINE if edge else GEL[gel_step(x, y)]
    despeckle(grid)
    for p in SPECULAR:
        grid[p] = GEL[5]
    for bubble in BUBBLES:
        for p in bubble:
            grid[p] = GEL[4]
    for p in NEAR_EYE + FAR_EYE:
        grid[p] = EYE
    for p in EYE_GLINTS:
        grid[p] = EYE_LIT
    for p in MOUTH:
        grid[p] = GEL[0]
    # floating pixel bits
    for x0, y0, n in BITS:
        for yy in range(y0 - 1, y0 + n + 1):
            for xx in range(x0 - 1, x0 + n + 1):
                grid[(xx, yy)] = OUTLINE
        for j in range(n):
            for i in range(n):
                grid[(x0 + i, y0 + j)] = GEL[BIT_SHADES[n][j][i] + (1 if (i, j) == (0, 0) else 0)]
    return grid


def to_sprite(grid):
    s = Sprite(W, H)
    for (x, y), c in grid.items():
        s.px(x, y, c)
    return s


# ------------------------------------------------------------------------------------------------
# Review sheet: our approved character beside the slime (same pixel size), zoom with grid, 3×.

AVATAR = os.path.join(ROOT, "apps", "game", "public", "assets", "avatar")
SKIN = {0x47: (0xCA, 0x96, 0x94), 0x8A: (0xF0, 0xD9, 0xC6)}
HAIR_BLACK = ["#050506", "#15151c", "#23232e", "#343445", "#4a4a60", "#686a82"]


def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def our_character(frame="wait_0", outfit="A01_starter_leather", hair="hair/male/M01_short_messy"):
    """Approved look: base body (skin recoloured) + A01 outfit + hair tone map — the density to match."""
    body = Image.open(os.path.join(AVATAR, "body", f"{frame}.png")).convert("RGBA")
    px = body.load()
    for y in range(body.height):
        for x in range(body.width):
            r, g, b, a = px[x, y]
            if a and r == g == b and r in SKIN:
                px[x, y] = (*SKIN[r], a)
    body.alpha_composite(Image.open(os.path.join(AVATAR, "outfit", outfit, f"{frame}.png")).convert("RGBA"))
    hair_img = Image.open(os.path.join(AVATAR, hair, f"{frame}.png")).convert("RGBA")
    hp = hair_img.load()
    ramp = [hex_rgb(c) for c in HAIR_BLACK]
    for y in range(hair_img.height):
        for x in range(hair_img.width):
            r, g, b, a = hp[x, y]
            if a >= 128:
                hp[x, y] = (*ramp[min(round(r / 40), 5)], 255)
            else:
                hp[x, y] = (0, 0, 0, 0)
    body.alpha_composite(hair_img)
    return body


def scaled(img, k):
    return img.resize((img.width * k, img.height * k), Image.NEAREST)


def grid_zoom(img, k):
    z = scaled(img, k).convert("RGBA")
    bg = Image.new("RGBA", z.size, (214, 210, 200, 255))
    bg.alpha_composite(z)
    d = ImageDraw.Draw(bg)
    for x in range(0, bg.width + 1, k):
        d.line([(x, 0), (x, bg.height)], fill=(150, 146, 138, 255) if (x // k) % 8 else (110, 100, 96, 255))
    for y in range(0, bg.height + 1, k):
        d.line([(0, y), (bg.width, y)], fill=(150, 146, 138, 255) if (y // k) % 8 else (110, 100, 96, 255))
    return bg


def review(slime, label):
    char = our_character()
    pad, gap = 24, 28
    zoom = grid_zoom(slime, 12)                      # 384 × 384
    # side by side at 1× and 3× on a shared ground line (character feet y=58, slime feet y=31)
    def pair(k):
        w = (48 + 8 + 32) * k
        canvas = Image.new("RGBA", (w, 64 * k), (214, 210, 200, 255))
        canvas.alpha_composite(scaled(char, k), (0, 0))
        canvas.alpha_composite(scaled(slime, k), ((48 + 8) * k, (58 - 31) * k))
        return canvas
    one, three = pair(1), pair(3)
    sheet_w = pad * 2 + zoom.width + gap + three.width
    sheet_h = pad * 2 + 28 + max(zoom.height, three.height + gap + one.height + 20)
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (244, 242, 236, 255))
    d = ImageDraw.Draw(sheet)
    d.text((pad, pad - 4), f"PIXEL SLIME  -  {label}   (32x32, feet at 16,31)   zoom 12x + grid  |  in-game 3x beside our A01 character  |  1x", fill=(40, 40, 50, 255))
    top = pad + 20
    sheet.alpha_composite(zoom, (pad, top))
    d.text((pad + 4, top + 4), "#0", fill=(160, 30, 30, 255))
    x2 = pad + zoom.width + gap
    sheet.alpha_composite(three, (x2, top))
    d.text((x2 + 4, top + 4), "3x", fill=(160, 30, 30, 255))
    sheet.alpha_composite(one, (x2, top + three.height + gap))
    d.text((x2, top + three.height + gap + one.height + 4), "1x (true size)", fill=(60, 60, 70, 255))
    return sheet


if __name__ == "__main__":
    s = to_sprite(draw_idle0())
    s.save_png(os.path.join(HERE, "pixel_slime_idle0.png"))
    s.save_silhouette(os.path.join(HERE, "silhouette_idle0.png"))
    img = Image.open(os.path.join(HERE, "pixel_slime_idle0.png")).convert("RGBA")
    review(img, "idle frame 0 (key frame)").save(os.path.join(HERE, "review_pixel_slime_idle0.png"))
    s.stats()
    print("wrote pixel_slime_idle0.png, review_pixel_slime_idle0.png")
