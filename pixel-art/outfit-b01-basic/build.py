#!/usr/bin/env python3
"""Outfit B01 — plain crew-neck T-shirt + jeans + sneakers (our own basics) — KEY FRAME wait_0.

The owner asked to master the basics first. Hand-pixelled on the base body, reading the SoC study
(learned cards 007 / 008 / 009) of plain villager shirts: 3–5 steps per material in LARGE clean
clusters — a lit block on the shoulders/upper chest, a mid body, dark sides and bottom — very few,
well placed creases, no scattered shadow dots.

Facing: the base faces RIGHT (near eye = 2 px at x23-24, far eye = 1 px at x29). The big arm on the
left is the NEAR arm, in front of the torso; the chest front sits right-of-centre under the chin.

Material indices in ROWS: tee 0 (inner line) … 4 (light) · jeans j k l m n (dark → light) ·
sneakers g h z · "." = body shows (skin). The same pixels render in two tee colours to check that
the structure reads on its own. The black silhouette is added one pixel OUTSIDE the clothes.

    python pixel-art/outfit-b01-basic/build.py
Outputs here: B01_tee_jeans/wait_0.png (white tee) and review_B01_wait0.png.
"""
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
AVATAR = os.path.join(ROOT, "apps", "game", "public", "assets", "avatar")
OUTFIT_ID = "B01_tee_jeans"
FRAME = "wait_0"
OUTLINE = (1, 1, 1)

TEES = {
    # white: blue-lavender shadows → warm white (never neutral grey, never pinkish next to skin)
    "white": ["#5c6080", "#8f95b3", "#c3c8da", "#e6e8ee", "#fdfaf0"],
    # mustard: brown shadow (H≈25) → warm yellow light (H≈45)
    "mustard": ["#3a2410", "#6e4a1c", "#a8782a", "#d2a23e", "#f0cc6a"],
}
OTHER = {
    "j": "#111a2e", "k": "#1e2e4d", "l": "#2f4a74", "m": "#4a6c9a", "n": "#7597bf",   # denim
    "g": "#6a6c7c", "h": "#b5b9c7", "z": "#f0f1f4",                                  # sneakers
}

# (row, first x, run). Body pixels for reference were read from body/wait_0.png.
ROWS = [
    (32, 29, "32"),                        # far shoulder top
    (33, 19, "3441"), (33, 27, "1332"),     # shoulders lit; collar edges (neck skin + jaw line show between)
    (34, 18, "34432122213321"),            # crew-neck rib dips at the front (1 2 2 2 1)
    (35, 18, "33322344433221"),            # lit block under the collar on the chest front
    (36, 17, "333220344333221"),           # armpit line (0) between near sleeve and torso
    (37, 17, "332210333332211"),
    (38, 17, "2221023333222111"),          # far sleeve appears at the back
    (39, 16, "11100023332221011"),         # sleeve hems: one dark row = cloth thickness
    (40, 21, "0233222210"),                # near forearm (skin) in front; torso edge = inner line
    (41, 20, "02233221210"),               # a single diagonal waist crease (1 at x27 → x26 below)
    (42, 20, "02223211210"),
    (43, 20, "01222221110"),
    (44, 20, "01222222110"),
    (45, 21, "0122222110"),
    (46, 21, "01111111110"),               # hem: the darkest cloth row, flares 1 px at the back
    (47, 21, "kmmlljllkj"),                # waistband, fly at x26
    (48, 21, "klmlkjklkj"),
    (49, 20, "kmnllkjlkj"),                # lit thigh column (n) on the near leg
    (50, 19, "kknmlkjklkj"),
    (51, 19, "kmnmlj"), (51, 26, "klkj"),
    (52, 19, "kmnnlj"), (52, 26, "kkj"),   # near knee lit
    (53, 18, "kmmlkj"), (53, 25, "jkkj"),
    (54, 18, "kmmlkj"), (54, 25, "kmmk"),  # far hem
    (55, 18, "klllj"), (55, 25, "ghzhh"),  # far sneaker (toe right)
    (56, 18, "lmmll"), (56, 25, "ghzzh"),  # near hem
    (57, 18, "ghzzh"), (57, 26, "zzzz"),   # far sole
    (58, 18, "ghzzzh"),
    (59, 19, "hzzzz"),                     # near sole
]


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


# Which hand-pixelled rows each body frame wears. The front idle frames wait_0–7 differ from wait_0 only
# at the chin/neck (rows 31–33) and in skin shading the shirt already covers (ascii_frame.py shows it),
# so they all wear the same pixels — "a still body keeps still clothes" (ART_BIBLE). The outline is
# still recomputed per frame because it follows that frame's own silhouette.
FRONT_IDLE = [f"wait_{i}" for i in range(8)]
FRAME_ROWS = {f: ROWS for f in FRONT_IDLE}


def paint(tee="white", frame=FRAME):
    body = Image.open(os.path.join(AVATAR, "body", f"{frame}.png")).convert("RGBA")
    W, H = body.size
    pal = {str(i): c for i, c in enumerate(TEES[tee])} | OTHER
    filled = {}
    for y, x0, run in FRAME_ROWS[frame]:
        for i, ch in enumerate(run):
            if ch != ".":
                filled[(x0 + i, y)] = hexrgb(pal[ch])
    solid = lambda p: p in filled or (0 <= p[0] < W and 0 <= p[1] < H and body.getpixel(p)[3] >= 128)
    outline = {q for (x, y) in filled for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)) if not solid(q)}
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for p, c in filled.items():
        img.putpixel(p, c + (255,))
    for p in outline:
        img.putpixel(p, OUTLINE + (255,))
    return img


# ------------------------------------------------------------------------------------------------
# Review: zoom with grid, then 3× and 1× of the bare base / white tee / mustard tee

SKIN = {0x47: (0xCA, 0x96, 0x94), 0x8A: (0xF0, 0xD9, 0xC6)}
HAIR_RAMP = [(0x05, 0x05, 0x06), (0x15, 0x15, 0x1c), (0x23, 0x23, 0x2e), (0x34, 0x34, 0x45), (0x4a, 0x4a, 0x60), (0x68, 0x6a, 0x82)]


def dressed(layer_img):
    body = Image.open(os.path.join(AVATAR, "body", f"{FRAME}.png")).convert("RGBA")
    px = body.load()
    for y in range(body.height):
        for x in range(body.width):
            r, g, b, a = px[x, y]
            if a and r == g == b and r in SKIN:
                px[x, y] = SKIN[r] + (a,)
    if layer_img is not None:
        body.alpha_composite(layer_img)
    hair = Image.open(os.path.join(AVATAR, "hair", "male", "M01_short_messy", f"{FRAME}.png")).convert("RGBA")
    hp = hair.load()
    for y in range(hair.height):
        for x in range(hair.width):
            r, g, b, a = hp[x, y]
            hp[x, y] = (HAIR_RAMP[min(round(r / 40), 5)] + (255,)) if a >= 128 else (0, 0, 0, 0)
    body.alpha_composite(hair)
    return body


def scaled(img, k):
    return img.resize((img.width * k, img.height * k), Image.NEAREST)


def grid(img, k):
    z = scaled(img, k)
    out = Image.new("RGBA", z.size, (214, 210, 200, 255))
    out.alpha_composite(z)
    d = ImageDraw.Draw(out)
    for x in range(0, out.width + 1, k):
        d.line([(x, 0), (x, out.height)], fill=(178, 174, 166, 255) if (x // k) % 4 else (120, 112, 106, 255))
    for y in range(0, out.height + 1, k):
        d.line([(0, y), (out.width, y)], fill=(178, 174, 166, 255) if (y // k) % 4 else (120, 112, 106, 255))
    return out


def review(layers):
    crop = (12, 10, 38, 62)
    looks = [("base", dressed(None))] + [(n, dressed(l)) for n, l in layers.items()]
    zoom = grid(looks[1][1].crop(crop), 10)
    cw = 26 + 8
    row3 = Image.new("RGBA", (cw * len(looks) * 3, 52 * 3), (214, 210, 200, 255))
    row1 = Image.new("RGBA", (cw * len(looks), 52), (214, 210, 200, 255))
    for i, (_, im) in enumerate(looks):
        row3.alpha_composite(scaled(im.crop(crop), 3), (i * cw * 3, 0))
        row1.alpha_composite(im.crop(crop), (i * cw, 0))
    pad = 20
    sheet = Image.new("RGBA", (pad * 3 + zoom.width + row3.width, pad * 2 + 24 + max(zoom.height, row3.height + pad + 70)), (244, 242, 236, 255))
    d = ImageDraw.Draw(sheet)
    d.text((pad, 8), "B01 TEE + JEANS  -  frame wait_0 (key frame, hand-pixelled)   zoom 10x + grid  |  3x  |  1x", fill=(40, 40, 50, 255))
    top = pad + 12
    sheet.alpha_composite(zoom, (pad, top))
    d.text((pad + 4, top + 4), "wait_0", fill=(170, 30, 30, 255))
    x2 = pad * 2 + zoom.width
    sheet.alpha_composite(row3, (x2, top))
    for i, (n, _) in enumerate(looks):
        d.text((x2 + i * cw * 3 + 4, top + row3.height + 2), n, fill=(40, 40, 50, 255))
    sheet.alpha_composite(row1, (x2, top + row3.height + pad + 6))
    d.text((x2, top + row3.height + pad + row1.height + 10), "1x (true size)", fill=(60, 60, 70, 255))
    return sheet


def styled(frame_entry, layer_img, ramp=HAIR_RAMP):
    """One idle frame as the game shows it: body (skin) → outfit → the style's own hair file."""
    body = Image.open(os.path.join(AVATAR, frame_entry["body"])).convert("RGBA")
    px = body.load()
    for y in range(body.height):
        for x in range(body.width):
            r, g, b, a = px[x, y]
            if a and r == g == b and r in SKIN:
                px[x, y] = SKIN[r] + (a,)
    body.alpha_composite(layer_img)
    hair = Image.open(os.path.join(AVATAR, frame_entry["hair"])).convert("RGBA")
    hp = hair.load()
    for y in range(hair.height):
        for x in range(hair.width):
            r, g, b, a = hp[x, y]
            hp[x, y] = (ramp[min(round(r / 40), 5)] + (255,)) if a >= 128 else (0, 0, 0, 0)
    body.alpha_composite(hair)
    return body


def review_idle(tee="white", styles=("M02_shaggy_bangs", "F03_wavy_shoulder")):
    """Every idle frame of each style whose body is in the finished set, in the game's order, at 3×
    (labelled with the body frame), plus a looping GIF — clothes must not move while the body breathes."""
    import json
    manifest = json.load(open(os.path.join(AVATAR, "manifest.json"), encoding="utf-8"))
    crop, k, cw = (12, 10, 38, 62), 3, 26 + 6
    rows, gif = [], []
    for sid in styles:
        style = next(s for s in manifest["styles"] if s["id"] == sid)
        frames = [f for f in style["anims"]["idle"] if os.path.basename(f["body"])[:-4] in FRAME_ROWS]
        strip = Image.new("RGBA", (cw * len(frames) * k, 52 * k + 14), (214, 210, 200, 255))
        d = ImageDraw.Draw(strip)
        for i, f in enumerate(frames):
            name = os.path.basename(f["body"])[:-4]
            im = styled(f, paint(tee, name)).crop(crop)
            strip.alpha_composite(scaled(im, k), (i * cw * k, 0))
            hair_no = os.path.basename(f["hair"])[:-4].split("_")[-1]
            d.text((i * cw * k + 4, 52 * k), f"#{i + 1} {name} h{hair_no}", fill=(40, 40, 50, 255))
            if sid == styles[0]:
                gif.append(scaled(im, 4))
        rows.append((sid, strip))
    W = max(s.width for _, s in rows) + 40
    sheet = Image.new("RGBA", (W, sum(s.height + 26 for _, s in rows) + 30), (244, 242, 236, 255))
    d = ImageDraw.Draw(sheet)
    d.text((20, 8), f"B01 idle (front set wait_0-7), {tee} tee - the game's idle order per hairstyle, 3x, body frame under each", fill=(40, 40, 50, 255))
    y = 30
    for sid, s in rows:
        d.text((20, y), sid, fill=(150, 30, 30, 255))
        sheet.alpha_composite(s, (20, y + 14))
        y += s.height + 26
    sheet.save(os.path.join(HERE, "review_B01_idle_front.png"))
    bg = [Image.new("RGBA", g.size, (214, 210, 200, 255)) for g in gif]
    for b, g in zip(bg, gif):
        b.alpha_composite(g)
    bg[0].save(os.path.join(HERE, "B01_idle_front.gif"), save_all=True, append_images=bg[1:], duration=350, loop=0)


if __name__ == "__main__":
    layers = {n: paint(n) for n in TEES}
    out_dir = os.path.join(HERE, OUTFIT_ID)
    os.makedirs(out_dir, exist_ok=True)
    for f in FRAME_ROWS:
        paint("white", f).save(os.path.join(out_dir, f"{f}.png"))
    review(layers).save(os.path.join(HERE, "review_B01_wait0.png"))
    review_idle()
    for n, l in layers.items():
        cols = {l.getpixel((x, y))[:3] for y in range(l.height) for x in range(l.width) if l.getpixel((x, y))[3]}
        print(f"{n}: {len(cols)} colours")
    print("frames:", ", ".join(FRAME_ROWS))
