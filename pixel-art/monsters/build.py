#!/usr/bin/env python3
"""
Monster sprites for Pixel Walker — 32-bit style (art direction 2026-09-25; pilot in
pixel-art/style-32-pilot). Drawn at 2x the old 16-bit grid: critters 64 px, medium 64-112 px,
bosses 128-144 px, shown 1 art pixel = 1 screen pixel. Facing RIGHT (battle mirrors side B),
light from the top-left, 7-step hue-shifted ramps, rim light, selective outline.

The drawings live in three modules sharing kit32.py:
    critters32.py   batch 1 (slime, pigeon, rat, cat, ant, firefly, gecko, carp, crab, dog)
    mid32.py        batch 2 (scarecrow ... training dummies)
    bosses32.py     batch 3 (the seven landmark / world bosses)

    python pixel-art/monsters/build.py
    python pixel-art/monsters/review32.py <module>   # old-vs-new review sheet for one batch

Outputs apps/game/public/assets/monsters/<sprite>.png + <sprite>_anim.png (1x) and preview.png,
anim.png here. The 16-bit originals are in git history (before 2026-09-26).
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from PIL import Image, ImageDraw  # noqa: E402

import bosses32  # noqa: E402
import critters32  # noqa: E402
import mid32  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "apps", "game", "public", "assets", "monsters")

SPRITES = {**critters32.SPRITES, **mid32.SPRITES, **bosses32.SPRITES}


# ============================================================================================
# Battle animation (ROADMAP ⚔️ 3.1): puppeted frames made from each finished sprite by moving
# whole pixel rows (1-2 px, never resampled, so the art stays crisp):
#   0 idle · 1 breathe (upper body squashes 2 px) · 2 attack (leans forward) · 3 hurt (flinches back)
# Moves are in 32-bit pixels (2x the 16-bit ones) so they read the same on screen.

def _rows(im, fn):
    """Rebuild `im` moving each row y by fn(y) -> (dx, dy). Moved rows are pasted over still ones."""
    w, h = im.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    moved = []
    for y in range(h):
        dx, dy = fn(y)
        row = im.crop((0, y, w, y + 1))
        (moved if (dx or dy) else out.paste(row, (0, y), row)) is None or moved.append((row, dx, y + dy))
    for row, dx, y in moved:
        if 0 <= y < h:
            out.paste(row, (dx, y), row)
    return out


def anim_strip(im):
    box = im.getbbox()
    top, bottom = box[1], box[3]
    body = bottom - top
    waist = top + int(body * 0.6)          # legs/base below this stay planted
    lean = lambda y, n: round(n * (waist - y) / max(1, waist - top)) if y < waist else 0
    frames = [
        im,
        _rows(im, lambda y: (0, 2) if y < waist else (0, 0)),
        _rows(im, lambda y: (lean(y, 4) + 2, 0)),
        _rows(im, lambda y: (-lean(y, 4) - 2, 2 if y < waist else 0)),
    ]
    w, h = im.size
    strip = Image.new("RGBA", (w * 4, h), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        strip.alpha_composite(fr, (i * w, 0))
    return strip


def main():
    os.makedirs(OUT, exist_ok=True)
    out = {}
    for name, fn in SPRITES.items():
        s = fn()
        s.save_png(os.path.join(OUT, f"{name}.png"))
        out[name] = s.composite(1)
        anim_strip(out[name]).save(os.path.join(OUT, f"{name}_anim.png"))
    Z = 2
    cols = 6
    cw, ch = 144 * Z + 16, 144 * Z + 30
    rows = (len(out) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cw, rows * ch), (120, 160, 110, 255))
    d = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(out.items()):
        x, y = (i % cols) * cw + 8, (i // cols) * ch + 6
        big = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
        sheet.alpha_composite(big, (x + (144 * Z - big.width) // 2, y + 144 * Z - big.height))
        d.text((x, y + 144 * Z + 4), f"{n} {im.width}x{im.height}", fill=(255, 255, 255, 255))
    sheet.save(os.path.join(HERE, "preview.png"))
    # Animation review: every strip, 3x
    strips = [Image.open(os.path.join(OUT, f"{n}_anim.png")) for n in out]
    aw = max(st.width for st in strips) * 2 + 16
    ah = sum(st.height * 2 + 6 for st in strips) + 8
    anim = Image.new("RGBA", (aw, ah), (120, 160, 110, 255))
    y = 4
    for st in strips:
        anim.alpha_composite(st.resize((st.width * 2, st.height * 2), Image.NEAREST), (8, y))
        y += st.height * 2 + 6
    anim.save(os.path.join(HERE, "anim.png"))
    print("OK", len(out), "sprites + anim strips")


if __name__ == "__main__":
    main()
