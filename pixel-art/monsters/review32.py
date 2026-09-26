"""Review sheet for a 32-bit batch: old 16-bit (scaled to match) above, new 32-bit below, 3x zoom.

    python pixel-art/monsters/review32.py critters32   → review_critters32.png
"""
import importlib
import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OLD = os.path.join(HERE, "..", "..", "apps", "game", "public", "assets", "monsters")


def main(mod_name: str):
    mod = importlib.import_module(mod_name)
    Z = 3
    cells = []
    for name, fn in mod.SPRITES.items():
        new = fn().composite(1)
        old_path = os.path.join(OLD, f"{name}.png")
        old = Image.open(old_path).convert("RGBA") if os.path.exists(old_path) else Image.new("RGBA", (1, 1))
        k = max(1, round(new.width / old.width))
        cells.append((name, old.resize((old.width * k * Z, old.height * k * Z), Image.NEAREST), new.resize((new.width * Z, new.height * Z), Image.NEAREST)))
    cols = 5
    cw = max(max(o.width, n.width) for _, o, n in cells) + 16
    ch = max(o.height + n.height for _, o, n in cells) + 40
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cw, rows * ch), (70, 90, 80, 255))
    d = ImageDraw.Draw(sheet)
    for i, (name, old, new) in enumerate(cells):
        x, y = (i % cols) * cw + 8, (i // cols) * ch + 4
        d.text((x, y), name, fill=(255, 255, 255, 255))
        sheet.alpha_composite(old, (x, y + 14))
        sheet.alpha_composite(new, (x, y + 20 + old.height))
    out = os.path.join(HERE, f"review_{mod_name}.png")
    sheet.save(out)
    print("wrote", out, sheet.size)


if __name__ == "__main__":
    sys.path.insert(0, HERE)
    main(sys.argv[1] if len(sys.argv) > 1 else "critters32")
