#!/usr/bin/env python3
"""Original six-pose Novice sword study — preview only, never wired into the game.

This explores a more detailed tactical-chibi silhouette from first principles.  It uses
the action timing learned from the user-provided reference, but no source pixels,
palette, hairstyle, clothing design, or model are reused.

    python pixel-art/novice-battle-attack/build.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))

from pixelstudio import Sprite  # noqa: E402

W, H = 64, 72

# 13-colour original palette: a cool indigo novice with one saffron accent.
INK = "#182238"
INK_LIT = "#2a3959"
SKIN_SHADE = "#b66d65"
SKIN = "#e6a989"
SKIN_LIT = "#ffd0a5"
HAIR_SHADE = INK_LIT
HAIR = "#526a9f"
HAIR_LIT = "#9aa9d1"
CLOTH_SHADE = "#25476f"
CLOTH = "#3f709b"
CLOTH_LIT = "#75b2cc"
SASH = "#dea94c"
STEEL = "#b6d7df"
STEEL_LIT = "#efffff"

PALETTE = [
    INK, INK_LIT, SKIN_SHADE, SKIN, SKIN_LIT, HAIR, HAIR_LIT,
    CLOTH_SHADE, CLOTH, CLOTH_LIT, SASH, STEEL, STEEL_LIT,
]


def sword(s, grip, tip, highlight=True):
    """A one-pixel-stepped, tapered blade.  It is redrawn per pose, never rotated."""
    gx, gy = grip
    tx, ty = tip
    dx, dy = tx - gx, ty - gy
    # The broad side follows the shorter axis to remain legible at any diagonal.
    ox, oy = (0, 1) if abs(dx) >= abs(dy) else (1, 0)
    s.polygon([
        (gx - ox, gy - oy), (gx + ox, gy + oy),
        (tx + ox, ty + oy), (tx, ty), (tx - ox, ty - oy),
    ], STEEL)
    if highlight:
        s.line(gx, gy, tx, ty, STEEL_LIT)
    s.line(gx - 2, gy - 1, gx + 2, gy + 1, SASH)
    s.px(gx - 3, gy - 1, INK_LIT)
    s.px(gx + 3, gy + 1, INK_LIT)


def feet(s, back, front, top=54):
    """Stable y=65 contact line: every pose changes the body, never the pivot feet."""
    bx, bw = back
    fx, fw = front
    s.polygon([(bx + 2, top), (bx + 7, top + 1), (bx + bw, 62), (bx + bw - 1, 64), (bx - 1, 64), (bx - 2, 61)], CLOTH_SHADE)
    s.polygon([(fx + 2, top - 1), (fx + 7, top), (fx + fw, 62), (fx + fw - 1, 64), (fx - 1, 64), (fx - 2, 61)], INK_LIT)
    s.rect(bx - 2, 63, bx + bw + 1, 65, INK)
    s.rect(fx - 2, 63, fx + fw + 2, 65, INK)
    s.line(bx, 63, bx + bw - 1, 63, INK_LIT)
    s.line(fx, 63, fx + fw, 63, INK_LIT)


def cape(s, pts, lit=False):
    s.polygon(pts, CLOTH_SHADE)
    if lit:
        x0, y0 = pts[0]
        s.polygon([(x0 + 2, y0 + 2), pts[1], pts[2], (pts[3][0] + 2, pts[3][1] - 2)], CLOTH)


def torso(s, pts, belt_y, shoulder_lit=True):
    s.polygon(pts, CLOTH)
    xs = [x for x, _ in pts]
    left, right = min(xs), max(xs)
    mid = (left + right) // 2
    if shoulder_lit:
        s.polygon([(left + 3, belt_y - 11), (left + 10, belt_y - 13), (mid + 2, belt_y - 7), (left + 7, belt_y - 4)], CLOTH_LIT)
    # A dark inner fold tapers the tunic instead of leaving a flat rectangular torso.
    s.polygon([(mid + 2, belt_y - 6), (right - 3, belt_y - 4), (right - 5, belt_y + 6), (mid + 1, belt_y + 7)], CLOTH_SHADE)
    s.line(left + 3, belt_y, right - 3, belt_y, SASH)
    s.px(left + 5, belt_y - 1, STEEL_LIT)
    s.px(right - 5, belt_y + 1, INK_LIT)


def head_mass(s, x, y, back=False):
    """A short swept indigo hairstyle with an unmistakably original head shape."""
    s.polygon([(x + 2, y + 4), (x + 6, y + 1), (x + 14, y + 2), (x + 18, y + 7), (x + 17, y + 16), (x + 13, y + 20), (x + 5, y + 19), (x + 1, y + 14)], HAIR_SHADE)
    if back:
        s.polygon([(x + 4, y + 5), (x + 8, y + 3), (x + 15, y + 7), (x + 16, y + 15), (x + 12, y + 18), (x + 5, y + 16)], HAIR)
        s.polygon([(x + 6, y + 5), (x + 10, y + 4), (x + 13, y + 7), (x + 7, y + 8)], HAIR_LIT)
        return
    s.polygon([(x + 5, y + 7), (x + 15, y + 6), (x + 16, y + 13), (x + 12, y + 18), (x + 6, y + 16), (x + 4, y + 12)], SKIN)
    s.polygon([(x + 6, y + 14), (x + 14, y + 13), (x + 12, y + 18), (x + 7, y + 17)], SKIN_SHADE)
    # Asymmetric fringe; the three clear clumps make the light direction obvious.
    s.polygon([(x + 3, y + 6), (x + 7, y + 2), (x + 14, y + 3), (x + 17, y + 7), (x + 13, y + 9), (x + 10, y + 7), (x + 7, y + 10), (x + 4, y + 11)], HAIR)
    s.polygon([(x + 6, y + 4), (x + 9, y + 3), (x + 11, y + 5), (x + 7, y + 6)], HAIR_LIT)


def face(s, x, y):
    # Details are placed after the external outline so eyes never create dirty halos.
    s.px(x + 12, y + 11, INK)
    s.px(x + 13, y + 11, INK)
    s.px(x + 14, y + 12, SKIN_LIT)
    s.line(x + 10, y + 16, x + 12, y + 16, SKIN_SHADE)


def hand(s, x, y):
    s.rect(x - 1, y - 1, x + 2, y + 2, SKIN)
    s.px(x - 1, y - 1, SKIN_LIT)
    s.px(x + 2, y + 2, SKIN_SHADE)


def ready(s):
    feet(s, (22, 9), (35, 9))
    cape(s, [(22, 36), (18, 43), (19, 54), (27, 55), (30, 42)], lit=True)
    torso(s, [(25, 34), (39, 35), (43, 46), (39, 55), (27, 55), (22, 45)], 48)
    # The sword rests across the forward side rather than slicing through the face.
    sword(s, (42, 47), (54, 31))
    s.polygon([(37, 39), (42, 41), (44, 47), (41, 49), (36, 44)], CLOTH_LIT)
    hand(s, 42, 47)
    head_mass(s, 25, 14)
    s.outline(INK, where="outside")
    face(s, 25, 14)


def windup(s):
    # Crouched, wider and shifted left: a readable anticipation silhouette.
    feet(s, (17, 11), (32, 10), top=56)
    cape(s, [(20, 39), (12, 44), (14, 56), (25, 57), (30, 45)], lit=True)
    torso(s, [(21, 37), (35, 36), (40, 47), (35, 57), (22, 57), (17, 47)], 50)
    sword(s, (19, 40), (8, 18))
    s.polygon([(24, 39), (20, 39), (16, 35), (14, 31), (17, 29), (22, 34)], CLOTH_LIT)
    hand(s, 18, 39)
    head_mass(s, 20, 19)
    s.outline(INK, where="outside")
    face(s, 20, 19)


def release(s):
    # The sword is behind the head for one frame, preserving a clean readable face.
    feet(s, (25, 8), (39, 10))
    cape(s, [(25, 36), (20, 43), (22, 54), (30, 55), (34, 43)], lit=False)
    torso(s, [(28, 34), (42, 35), (46, 46), (42, 55), (30, 55), (25, 45)], 48)
    sword(s, (43, 45), (34, 17))
    head_mass(s, 28, 14)
    s.polygon([(39, 39), (45, 41), (46, 46), (43, 48), (38, 44)], CLOTH_LIT)
    hand(s, 43, 45)
    s.outline(INK, where="outside")
    face(s, 28, 14)


def contact(s):
    # The widest stance and longest reach.  This is held at the impact timing.
    feet(s, (30, 8), (44, 11))
    cape(s, [(30, 37), (24, 44), (27, 55), (35, 56), (39, 44)], lit=False)
    torso(s, [(33, 35), (47, 36), (51, 46), (47, 55), (35, 55), (30, 45)], 48)
    head_mass(s, 33, 14)
    s.polygon([(44, 39), (51, 41), (55, 45), (53, 49), (45, 45)], CLOTH_LIT)
    hand(s, 54, 46)
    sword(s, (53, 45), (61, 24))
    # A sparse steel smear is part of the blade, not a separate magical effect.
    s.line(57, 35, 61, 29, STEEL_LIT)
    s.px(62, 27, STEEL_LIT)
    s.outline(INK, where="outside")
    face(s, 33, 14)


def follow(s):
    # Back-facing hair and shoulder mass make the follow-through read without rotating a cell.
    feet(s, (28, 9), (42, 10))
    cape(s, [(28, 36), (22, 43), (25, 55), (35, 56), (42, 45)], lit=True)
    torso(s, [(31, 35), (45, 37), (50, 48), (45, 56), (33, 56), (28, 45)], 49, shoulder_lit=False)
    head_mass(s, 31, 15, back=True)
    s.polygon([(43, 42), (50, 46), (53, 53), (50, 55), (44, 48)], CLOTH_LIT)
    hand(s, 51, 53)
    sword(s, (51, 52), (60, 62), highlight=False)
    s.outline(INK, where="outside")


def recover(s):
    feet(s, (26, 9), (39, 9))
    cape(s, [(26, 36), (20, 43), (22, 55), (31, 55), (35, 43)], lit=True)
    torso(s, [(29, 34), (43, 35), (47, 46), (43, 55), (31, 55), (26, 45)], 48)
    head_mass(s, 29, 14)
    s.polygon([(40, 40), (45, 43), (47, 49), (44, 51), (39, 45)], CLOTH_LIT)
    hand(s, 45, 50)
    sword(s, (45, 50), (55, 62))
    s.outline(INK, where="outside")
    face(s, 29, 14)


POSES = [ready, windup, release, contact, follow, recover]
# The contact pose starts at 260ms, giving the engine a clean future sync point.
DURATIONS = [90, 110, 60, 100, 95, 145]


def main():
    s = Sprite(W, H, palette=PALETTE)
    for index, (pose, duration) in enumerate(zip(POSES, DURATIONS), start=1):
        if index > 1:
            s.add_frame(copy=False)
        pose(s)
        s.set_duration(duration)
    s.tag("slash", 1, len(POSES))
    s.save_spritesheet(os.path.join(HERE, "novice_slash_preview_strip.png"), layout="horizontal", tag="slash")
    s.preview(os.path.join(HERE, "preview.png"), scale=5, bg="#1b2742", cols=6)
    s.save_gif(os.path.join(HERE, "preview.gif"), scale=5, tag="slash", bg="#1b2742")
    s.save_silhouette(os.path.join(HERE, "silhouette_contact.png"), frame=4, scale=5)
    s.stats()
    print("OK original Novice preview: 6 frames, 64x72, pivot y=65")


if __name__ == "__main__":
    main()
