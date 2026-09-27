#!/usr/bin/env python3
"""Drafting aid for hand-pixelling outfit frames (not part of the art output).

    python pixel-art/outfit-b01-basic/ascii_frame.py wait_2 [--ref wait_0]

Prints the body frame as ASCII (# outline, o skin base, s skin shade) for rows 31–60, marking where
it differs from the reference frame:  + = body here but not in ref,  - = body in ref but gone here,
* = both have body but a different pixel class. Rows are labelled with y, columns with x % 10, so
the (row, first_x, run) entries in build.py can be written against it.
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
AVATAR = os.path.abspath(os.path.join(HERE, "..", "..", "apps", "game", "public", "assets", "avatar"))


def classes(frame):
    img = Image.open(os.path.join(AVATAR, "body", f"{frame}.png")).convert("RGBA")
    out = {}
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = img.getpixel((x, y))
            if a >= 128:
                out[(x, y)] = "#" if r < 10 else "o" if r == 138 else "s" if r == 71 else "w"
    return out


def main():
    frame = sys.argv[1]
    ref = sys.argv[sys.argv.index("--ref") + 1] if "--ref" in sys.argv else "wait_0"
    cur, old = classes(frame), classes(ref)
    x0, x1 = 12, 38
    print(f"{frame} vs {ref}")
    print("    " + "".join(str(x % 10) for x in range(x0, x1)))
    for y in range(31, 61):
        row = []
        for x in range(x0, x1):
            c, o = cur.get((x, y)), old.get((x, y))
            if c and not o:
                row.append("+")
            elif o and not c:
                row.append("-")
            elif c and o and c != o:
                row.append("*")
            else:
                row.append(c or ".")
        print(f"{y:>3} " + "".join(row))


if __name__ == "__main__":
    main()
