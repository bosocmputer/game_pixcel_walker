#!/usr/bin/env python3
"""Outfit A03 — "Win Walker" motorbike-taxi rider (our own design) — KEY FRAME wait_0, v2 hand-pixelled.

v1 was painted procedurally from the body-part map and came out as flat colour blocks; the owner
rejected it. v2 is placed pixel by pixel like the SoC study (learned cards 007 / 008 / 009):
  * planes, not bands: the chest's front plane is lit, the side plane is dark, far limbs one step darker
  * a high-contrast opening: the vest is open in a V over a white tee, the ผ้าขาวม้า knot hangs above it
  * a navy long-sleeve jacket under the orange vest (orange vs navy reads far better than orange vs skin)
  * creases: elbow, vest folds, crotch; jeans with a lit thigh column, lit knee and a rolled cuff
  * signature piece = the burnt-orange win vest with a cream number bib whose "1" glows rift-cyan
    (the pixel layer's marker, docs/STORY.md); flowing piece = the red ผ้าขาวม้า tail behind the far shoulder
  * white sneakers with an orange stripe that echoes the vest; values fall vest > jeans, soles pale
The black silhouette is added automatically one pixel OUTSIDE every garment pixel that touches empty
space, so the clothes end up 1 px thicker than the body everywhere (the ART_BIBLE rule).

    python pixel-art/outfit-a03-win/build.py
Outputs here: A03_win_vest/wait_0.png (layer) and review_A03_wait0.png (for the owner).
"""
import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
AVATAR = os.path.join(ROOT, "apps", "game", "public", "assets", "avatar")
sys.path.insert(0, os.path.join(ROOT, "pixel-art", "pixel-slime"))
from build import our_character, scaled  # noqa: E402  (shared review helpers)

OUTFIT_ID = "A03_win_vest"
FRAME = "wait_0"
OUTLINE = (1, 1, 1)

# Ramps, darkest → lightest. Each hue-shifts (shadows cooler/redder, lights warmer); the darkest
# step of a material is its inner line.
PAL = {
    # navy jacket (H≈235 violet shadow → H≈215 sky light)
    "a": "#151a2e", "b": "#232c4a", "c": "#334169", "d": "#4a5d8c", "e": "#6b82ad",
    # burnt-orange win vest (brick-red shadow → warm yellow-orange light)
    "1": "#3b140d", "2": "#6e2412", "3": "#a8421a", "4": "#d0661f", "5": "#ec8d2e", "6": "#f9b957",
    # white tee (blue-lavender shadow → warm white)
    "t": "#6d6e8e", "u": "#a3a8c2", "v": "#d9dbe6", "w": "#fbf8ee",
    # ผ้าขาวม้า red (+ cream checks = tee "v")
    "r": "#4a0f1a", "s": "#8c1f2a", "R": "#c8413d", "q": "#e9dcc8",
    # denim (indigo shadow → faded blue)
    "j": "#111a2e", "k": "#1e2e4d", "l": "#2f4a74", "m": "#4a6c9a", "n": "#7597bf",
    # sneakers
    "g": "#5a5c6e", "h": "#a9adbd", "z": "#eceef2",
    # rift-cyan glow (the focal accent)
    "x": "#2aa0c8", "X": "#7ff0ff",
}

# (row, first x, run) — "." inside a run leaves the body showing (skin: neck, hands).
# Cell 48×64, feet at (24, 58); the body's own pixels were read from body/wait_0.png.
ROWS = [
    (32, 21, "rssssssrrr"),                # collar round the neck, shadowed under the chin
    (33, 19, "eeRRRRsssrcb"),              # shoulders + the collar's lit bulge
    (33, 31, "sr"),                        # ผ้าขาวม้า tail leaving the back of the neck
    (34, 18, "deed5Rs544332b"),            # knot hanging at the front (x23-24)
    (34, 32, "sr"),
    (35, 18, "ddcb5sr543322b"),
    (35, 32, "qq"),                        # one cream check of the cloth (a 2-px block)
    (36, 17, "ddcca6wvu43321b"),           # the V opens: white tee, lit left
    (36, 33, "sr"),
    (37, 17, "dccba6vu54vXv1b"),           # number bib on the side plane, the "1" glows
    (37, 34, "r"),
    (38, 17, "ccbba55u54vXu1ba"),          # V tip; far sleeve starts
    (39, 16, "dccbba55444uxt1ba"),
    (40, 16, "ccabba544433321bba"),        # elbow crease on the near sleeve
    (41, 16, "ccbba5444233221baa"),        # vest fold (2 at x25)
    (42, 16, "bcbba4443323221a"),          # far cuff; far hand stays skin
    (43, 16, "bbbaa4433332211"),
    (44, 16, "cccba3332322211"),           # near cuff: a lit band over the hand
    (45, 21, "2333222211"),
    (46, 21, "2332222111"),
    (47, 21, "11222111111"),               # vest hem: darkest cloth row, flares 1 px at the back
    (48, 21, "lmmlljkkjj"),                # jeans under the hem; crotch line x26
    (49, 20, "lnmllkjlkj"),                # lit thigh column (n)
    (50, 19, "klnmlkjklkj"),
    (51, 19, "kmnmlkjkkkj"),
    (52, 19, "kmnnlj"), (52, 26, "kkj"),   # near knee lit
    (53, 18, "klmlkj"), (53, 25, "jkkj"),
    (54, 18, "kmmlkj"), (54, 25, "knmk"),  # far rolled cuff
    (55, 18, "lnnml"), (55, 25, "gghhg"),  # near rolled cuff; far sneaker
    (56, 18, "hzzhg"), (56, 25, "g44hg"),  # orange stripe echoes the vest
    (57, 18, "g44hg"), (57, 25, "hzzzh"),
    (58, 18, "ghzhhg"),
    (59, 19, "zzzzh"),                     # near sole
]


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def paint():
    body = Image.open(os.path.join(AVATAR, "body", f"{FRAME}.png")).convert("RGBA")
    W, H = body.size
    filled = {}
    for y, x0, run in ROWS:
        for i, ch in enumerate(run):
            if ch != ".":
                filled[(x0 + i, y)] = hexrgb(PAL[ch])
    solid = lambda p: p in filled or (0 <= p[0] < W and 0 <= p[1] < H and body.getpixel(p)[3] >= 128)
    # Black silhouette one pixel outside the clothes (→ clothes 1 px thicker than the body).
    outline = set()
    for (x, y) in filled:
        for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if not solid(q):
                outline.add(q)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for p, c in filled.items():
        img.putpixel(p, c + (255,))
    for p in outline:
        img.putpixel(p, OUTLINE + (255,))
    return img


# ------------------------------------------------------------------------------------------------
# Review sheet: zoom with grid + in-game 3× beside the approved A01/A02 + 1×

HAIR_RAMP = [(0x05, 0x05, 0x06), (0x15, 0x15, 0x1c), (0x23, 0x23, 0x2e), (0x34, 0x34, 0x45), (0x4a, 0x4a, 0x60), (0x68, 0x6a, 0x82)]


def with_outfit(layer_img):
    """Our character (base body + M01 hair) wearing the new layer: skin body → A03 layer → hair."""
    body = Image.open(os.path.join(AVATAR, "body", f"{FRAME}.png")).convert("RGBA")
    px = body.load()
    for y in range(body.height):
        for x in range(body.width):
            r, g, b, a = px[x, y]
            if a and r == g == b and r in (0x47, 0x8A):
                px[x, y] = ((0xCA, 0x96, 0x94) if r == 0x47 else (0xF0, 0xD9, 0xC6)) + (a,)
    body.alpha_composite(layer_img)
    hair = Image.open(os.path.join(AVATAR, "hair", "male", "M01_short_messy", f"{FRAME}.png")).convert("RGBA")
    hp = hair.load()
    for y in range(hair.height):
        for x in range(hair.width):
            r, g, b, a = hp[x, y]
            hp[x, y] = (HAIR_RAMP[min(round(r / 40), 5)] + (255,)) if a >= 128 else (0, 0, 0, 0)
    body.alpha_composite(hair)
    return body


def grid(img, k, bg=(214, 210, 200, 255)):
    z = scaled(img, k).convert("RGBA")
    out = Image.new("RGBA", z.size, bg)
    out.alpha_composite(z)
    d = ImageDraw.Draw(out)
    for x in range(0, out.width + 1, k):
        d.line([(x, 0), (x, out.height)], fill=(178, 174, 166, 255) if (x // k) % 4 else (120, 112, 106, 255))
    for y in range(0, out.height + 1, k):
        d.line([(0, y), (out.width, y)], fill=(178, 174, 166, 255) if (y // k) % 4 else (120, 112, 106, 255))
    return out


def review(layer_img):
    ours = with_outfit(layer_img)
    crop = (12, 10, 38, 62)
    zoom = grid(ours.crop(crop), 10)
    a01 = our_character(FRAME, "A01_starter_leather")
    a02 = our_character(FRAME, "A02_light_armor")
    trio = Image.new("RGBA", ((26 * 3 + 16) * 3, 52 * 3), (214, 210, 200, 255))
    for i, im in enumerate((a01, a02, ours)):
        trio.alpha_composite(scaled(im.crop(crop), 3), (i * (26 + 8) * 3, 0))
    one = Image.new("RGBA", (26 * 3 + 16, 52), (214, 210, 200, 255))
    for i, im in enumerate((a01, a02, ours)):
        one.alpha_composite(im.crop(crop), (i * (26 + 8), 0))
    pad = 20
    W = pad * 3 + zoom.width + trio.width
    H = pad * 2 + 24 + max(zoom.height, trio.height + pad + one.height + 16)
    sheet = Image.new("RGBA", (W, H), (244, 242, 236, 255))
    d = ImageDraw.Draw(sheet)
    d.text((pad, 8), "A03 WIN VEST v2 (hand-pixelled)  -  frame wait_0   zoom 10x + grid  |  3x: A01 / A02 / A03  |  1x", fill=(40, 40, 50, 255))
    top = pad + 12
    sheet.alpha_composite(zoom, (pad, top))
    d.text((pad + 4, top + 4), "wait_0", fill=(170, 30, 30, 255))
    x2 = pad * 2 + zoom.width
    sheet.alpha_composite(trio, (x2, top))
    for i, name in enumerate(("A01", "A02", "A03 v2")):
        d.text((x2 + i * (26 + 8) * 3 + 4, top + trio.height + 2), name, fill=(40, 40, 50, 255))
    sheet.alpha_composite(one, (x2, top + trio.height + pad + 6))
    d.text((x2, top + trio.height + pad + one.height + 10), "1x (true size)", fill=(60, 60, 70, 255))
    return sheet


if __name__ == "__main__":
    layer = paint()
    os.makedirs(os.path.join(HERE, OUTFIT_ID), exist_ok=True)
    layer.save(os.path.join(HERE, OUTFIT_ID, f"{FRAME}.png"))
    review(layer).save(os.path.join(HERE, "review_A03_wait0.png"))
    cols = {layer.getpixel((x, y))[:3] for y in range(layer.height) for x in range(layer.width) if layer.getpixel((x, y))[3]}
    print(f"wrote {OUTFIT_ID}/{FRAME}.png ({len(cols)} colours) and review_A03_wait0.png")
