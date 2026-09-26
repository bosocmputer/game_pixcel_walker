#!/usr/bin/env python3
"""
Hero design pilot — the original 32-bit "Walker" (MASTER_SPEC §5C, ROADMAP art round 5).

Concept: an ordinary city kid the [ระบบ] just awakened. Street clothes touched by magic:
  · dark hooded jacket with glowing cyan [ระบบ] seams (like circuit traces)
  · Lanna-pattern scarf, orange-red with gold diamonds (the myth layer), tail flying
  · one glowing cyan streak in the hair (the mark of awakening)
  · white sneakers with an orange sole — this is a walking game
64x96, about 3.5 heads, light from the top-left, 7-step hue-shifted ramps, dark outline.

    python pixel-art/hero-32-pilot/build.py   → sheet.png (poses 4x + 1x), variants.png
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite, ramp, mix  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

W, H = 64, 96
INK = "#1a1628"


def own_light(base):
    """Light target for a colour: its own hue pushed to full brightness, half-way to warm white."""
    r, g, b = (int(base[i:i + 2], 16) for i in (1, 3, 5))
    k = 255 / max(r, g, b, 1)
    return tuple(round((c * k + w) / 2) for c, w in zip((r, g, b), (255, 246, 222)))


def R(base, dark=(26, 18, 56), light=None):
    """7-step ramp, always dark -> light, base at index 3. Shadows lean cool purple, lights toward
    the colour's own hue + warm white (pixelstudio.ramp can come out non-monotonic on pale bases)."""
    light = light or own_light(base)
    out = [mix(base, "#%02x%02x%02x" % dark, t) for t in (0.66, 0.44, 0.22)] + [base]
    out += [mix(base, "#%02x%02x%02x" % light, t) for t in (0.3, 0.55, 0.78)]
    return out


def palette(skin="#e8ae88", hair="#34305a", jacket="#2c3e5c", scarf="#e0552a", glow="#5ff0ff"):
    return {
        "skin": R(skin, dark=(120, 40, 60)), "hair": R(hair), "jacket": R(jacket),
        "scarf": R(scarf, dark=(80, 10, 50)), "pants": R("#3a3a52"), "shoe": R("#d8d8e4"),
        "steel": R("#8c9ab4"), "gold": R("#e0a820", dark=(110, 40, 20)), "glow": glow, "shirt": R("#d8d0bc"),
    }


# ============================================================================================
# Shared helpers

def to_sprite(img):
    """A fresh single-layer Sprite holding `img` (so outlines see the whole composite)."""
    t = Sprite(W, H)
    t._img().paste(img, (0, 0))
    return t


def finish(s):
    out = to_sprite(s.composite(1))
    out.outline(INK, where="outside")
    return out


def lanna(s, x, y, gold):
    """A tiny gold diamond (the scarf's Lanna motif)."""
    s.px(x, y - 1, gold[5]); s.px(x - 1, y, gold[3]); s.px(x + 1, y, gold[3]); s.px(x, y + 1, gold[2]); s.px(x, y, gold[4])


# ============================================================================================
# Front view parts

def head_front(s, P, oy=0):
    sk, hr = P["skin"], P["hair"]

    def y(v):
        return v + oy

    s.rect(29, y(31), 35, y(37), sk[2]); s.line(29, y(33), 35, y(33), sk[1])            # neck + chin shadow
    for ex in (19, 45):                                                                # ears
        s.ellipse(ex - 2, y(19), ex + 2, y(26), sk[3]); s.px(ex, y(22), sk[2])
    # hair back mass + side locks
    s.ellipse(17, y(3), 47, y(24), hr[2])
    s.polygon([(17, y(13)), (23, y(13)), (22, y(29)), (18, y(26))], hr[3])
    s.polygon([(41, y(13)), (47, y(13)), (46, y(26)), (42, y(29))], hr[1])
    s.ellipse(19, y(4), 38, y(16), hr[3], only=hr[2])
    s.ellipse(21, y(5), 30, y(10), hr[4], only=hr[3])
    s.ellipse(37, y(8), 48, y(24), hr[1], only=hr[2])
    # silhouette breaks: spiky tufts on the crown + a springy cowlick (ahoge)
    for pts, col in ((((36, y(6)), (44, y(1)), (42, y(9))), hr[2]), (((40, y(9)), (49, y(6)), (45, y(13))), hr[1]),
                     (((18, y(9)), (14, y(6)), (19, y(14))), hr[3])):
        s.polygon(pts, col)
    s.line(30, y(4), 33, y(1), hr[3]); s.line(33, y(1), 36, y(3), hr[3]); s.px(31, y(3), hr[4])
    # face on top (the hair above the hairline stays)
    s.ellipse(21, y(11), 43, y(34), sk[4])
    s.ellipse(37, y(26), 46, y(37), sk[3], only=sk[4])                                  # small soft shadow under the jaw
    s.line(27, y(34), 37, y(34), sk[3], only=sk[4])
    s.ellipse(23, y(13), 31, y(20), sk[5], only=sk[4])                                  # forehead light
    # bangs stop above the eyes
    for pts, col in ((((20, y(10)), (27, y(10)), (22, y(19))), hr[3]), (((25, y(9)), (33, y(9)), (29, y(18))), hr[3]),
                     (((31, y(9)), (39, y(9)), (36, y(18))), hr[2]), (((37, y(10)), (44, y(10)), (43, y(19))), hr[1])):
        s.polygon(pts, col)
    s.rect(21, y(9), 43, y(11), hr[2])
    s.polygon([(25, y(9)), (32, y(9)), (29, y(18))], P["glow"])                        # the awakened lock
    s.polygon([(29, y(9)), (32, y(9)), (29, y(18))], mix(P["glow"], "#1a3a8a", 0.35))
    s.line(26, y(10), 27, y(12), "#ffffff")
    s.px(23, y(6), hr[5]); s.px(24, y(5), hr[5]); s.px(28, y(4), hr[6]); s.px(29, y(4), hr[5])
    # face: brows, big glossy eyes, nose, mouth, blush
    s.line(24, y(19), 28, y(18), hr[1]); s.line(36, y(18), 40, y(19), hr[1])
    for ex in (24, 35):
        s.rect(ex, y(20), ex + 5, y(21), hr[0])                                         # lash line
        s.rect(ex, y(22), ex + 5, y(27), "#f6f4ff")
        s.rect(ex + 1, y(22), ex + 5, y(27), "#2a6ab0")
        s.rect(ex + 1, y(25), ex + 5, y(27), "#3fa8e8")
        s.rect(ex + 2, y(23), ex + 4, y(26), "#141c38")
        s.rect(ex + 1, y(22), ex + 2, y(23), "#ffffff")
        s.px(ex + 4, y(26), "#9af0ff")
    s.px(32, y(28), sk[3])
    s.line(30, y(31), 33, y(31), "#b85a4a"); s.px(34, y(30), "#b85a4a")
    s.line(22, y(29), 24, y(29), "#f5a090"); s.line(40, y(29), 42, y(29), "#f5a090")


def scarf_front(s, P, oy=0, flutter=0):
    sc, gold = P["scarf"], P["gold"]

    def y(v):
        return v + oy

    s.ellipse(21, y(34), 43, y(41), sc[3])
    s.ellipse(21, y(34), 35, y(39), sc[4], only=sc[3])
    s.line(22, y(40), 42, y(40), sc[1])
    s.polygon([(36, y(39)), (42, y(39)), (41 + flutter, y(55)), (37 + flutter, y(53))], sc[3])
    s.polygon([(39, y(39)), (42, y(39)), (41 + flutter, y(55)), (39 + flutter, y(54))], sc[2], only=sc[3])
    for x, yy in ((25, 37), (30, 38), (35, 37), (39, 44), (39 + flutter // 2, 49)):
        lanna(s, x, y(yy), gold)
    for x in (37, 39, 41):
        s.px(x + flutter, y(56), sc[2])


def jacket_front(s, P, oy=0, swing=0):
    jk, sk = P["jacket"], P["skin"]

    def y(v):
        return v + oy

    # arms first: slight outward angle, swinging opposite to the legs
    for side in (-1, 1):
        sw = swing * side
        if side < 0:
            top_out, top_in, hand_x = 15, 21, 14 + sw
        else:
            top_out, top_in, hand_x = 49, 43, 50 + sw
        col, edge = (jk[3], jk[4]) if side < 0 else (jk[2], jk[1])
        s.polygon([(top_out, y(41)), (top_in, y(40)), (hand_x - side * 4, y(58)), (hand_x, y(58))], col)
        s.line(top_out - side, y(43), hand_x, y(56), edge)
        cx = hand_x - (0 if side < 0 else 3)
        s.rect(cx, y(57), cx + 4, y(59), jk[1])
        s.line(cx, y(57), cx + 4, y(57), P["glow"])
        s.ellipse(cx, y(59), cx + 4, y(64), sk[3]); s.px(cx + 1, y(60), sk[5])          # hand
    # body: tapered, rounded shoulders
    s.polygon([(20, y(40)), (44, y(40)), (43, y(65)), (21, y(65))], jk[3])
    s.ellipse(16, y(38), 27, y(47), jk[3]); s.ellipse(37, y(38), 48, y(47), jk[2])       # shoulders
    s.polygon([(32, y(40)), (44, y(40)), (43, y(65)), (32, y(65))], jk[2], only=jk[3])
    s.polygon([(20, y(40)), (26, y(40)), (24, y(65)), (21, y(65))], jk[4], only=jk[3])
    s.ellipse(17, y(38), 23, y(42), jk[5], only=jk[3])                                   # shoulder light
    s.rect(21, y(62), 43, y(65), jk[1], only="opaque"); s.line(21, y(62), 43, y(62), jk[4], only="opaque")
    s.polygon([(29, y(41)), (35, y(41)), (34, y(62)), (30, y(62))], P["shirt"][4])
    s.line(32, y(41), 32, y(62), P["shirt"][2])
    for pts in (((23, y(46)), (23, y(53)), (26, y(57)), (26, y(61))), ((41, y(46)), (41, y(51)), (38, y(54)), (38, y(61)))):
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            s.line(x0, y0, x1, y1, P["glow"])
        s.px(pts[-1][0], pts[-1][1], "#ffffff")
    s.line(36, y(55), 40, y(55), jk[1]); s.line(36, y(56), 40, y(56), jk[4])            # pocket
    # hood gathered behind the neck
    s.ellipse(21, y(33), 43, y(43), jk[2]); s.ellipse(22, y(33), 35, y(40), jk[4], only=jk[2])


def legs_front(s, P, step=0):
    pn, sh = P["pants"], P["shoe"]
    s.rect(24, 63, 40, 67, pn[3])                                                        # hips
    for side, x0 in ((-1, 24), (1, 33)):
        lift = 2 if step == side else 0
        y1 = 85 - lift
        s.rect(x0, 64, x0 + 7, y1, pn[3])
        s.rect(x0 + 5, 64, x0 + 7, y1, pn[2])
        s.rect(x0, 64, x0 + 1, y1, pn[4])
        s.line(x0 + 1, 74 - lift, x0 + 6, 74 - lift, pn[2]); s.line(x0 + 1, 75 - lift, x0 + 6, 75 - lift, pn[4])
        sx0, sx1 = (x0 - 2, x0 + 7) if side < 0 else (x0, x0 + 9)
        s.rect(sx0, y1 + 1, sx1, y1 + 6, sh[4])
        s.rect(sx0 + 1, y1 + 1, sx1 - 1, y1 + 2, sh[6])
        s.rect(sx0 + (5 if side < 0 else 1), y1 + 2, sx0 + (8 if side < 0 else 4), y1 + 4, sh[2])   # side panel
        s.line(sx0, y1 + 5, sx1, y1 + 5, "#ff8a3a"); s.line(sx0, y1 + 6, sx1, y1 + 6, "#c85a1a")
        s.px(x0 + 3, y1 + 2, P["glow"])
    s.line(32, 66, 32, 76, pn[1])                                                        # inseam


def front(P, step=0):
    """step: 0 = stand, 1 = left foot lifted (passing), -1 = right foot lifted."""
    s = Sprite(W, H)
    legs_front(s, P, step)
    s.layer("upper")
    oy = -1 if step else 0                                                                # body rises while passing
    jacket_front(s, P, oy, swing=step * 2)
    scarf_front(s, P, oy, flutter=step)
    head_front(s, P, oy)
    return finish(s)


# ============================================================================================
# Side view (facing right). Seen from the right, the viewer faces the hero's RIGHT side, so the
# glowing lock shows and the scarf's back tail flies out behind.

def head_side(s, P, ox=0, oy=0):
    sk, hr = P["skin"], P["hair"]

    def X(v):
        return v + ox

    def Y(v):
        return v + oy

    s.rect(X(30), Y(30), X(35), Y(37), sk[2])                                           # neck
    s.ellipse(X(17), Y(3), X(44), Y(27), hr[2])                                          # skull + hair mass
    s.polygon([(X(18), Y(14)), (X(31), Y(14)), (X(31), Y(31)), (X(24), Y(31)), (X(18), Y(24))], hr[2])
    for pts, col in ((((22, 7), (13, 4), (19, 13)), hr[3]), (((19, 12), (12, 14), (19, 19)), hr[2]),
                     (((19, 19), (14, 23), (21, 25)), hr[1]), (((27, 4), (31, 0), (34, 5)), hr[3])):
        s.polygon([(X(a), Y(b)) for a, b in pts], col)
    s.ellipse(X(18), Y(4), X(36), Y(16), hr[3], only=hr[2])
    s.ellipse(X(21), Y(5), X(29), Y(9), hr[4], only=hr[3])
    s.ellipse(X(18), Y(21), X(31), Y(33), hr[1], only=hr[2])
    s.line(X(35), Y(3), X(38), Y(0), hr[3]); s.line(X(38), Y(0), X(41), Y(2), hr[3])      # ahoge
    # face
    s.ellipse(X(27), Y(11), X(44), Y(34), sk[4])
    s.rect(X(44), Y(23), X(45), Y(26), sk[4]); s.px(X(45), Y(27), sk[3])                  # nose
    s.ellipse(X(27), Y(29), X(33), Y(36), sk[3], only=sk[4])                              # jaw shadow
    s.line(X(34), Y(34), X(41), Y(34), sk[3], only=sk[4])
    s.ellipse(X(35), Y(12), X(42), Y(18), sk[5], only=sk[4])
    s.polygon([(X(27), Y(12)), (X(32), Y(12)), (X(31), Y(23)), (X(27), Y(25))], hr[2])   # hair in front of the ear
    s.ellipse(X(28), Y(19), X(32), Y(26), sk[3]); s.px(X(30), Y(22), sk[2]); s.px(X(29), Y(20), sk[4])
    # fringe: points sweep down and forward
    s.rect(X(29), Y(8), X(44), Y(11), hr[2])
    for pts, col in ((((29, 9), (36, 9), (33, 19)), hr[3]), (((37, 9), (44, 9), (40, 18)), hr[2]),
                     (((41, 10), (46, 11), (45, 17)), hr[1])):
        s.polygon([(X(a), Y(b)) for a, b in pts], col)
    s.polygon([(X(33), Y(8)), (X(38), Y(8)), (X(36), Y(18))], P["glow"])                  # the awakened lock
    s.polygon([(X(36), Y(8)), (X(38), Y(8)), (X(36), Y(18))], mix(P["glow"], "#1a3a8a", 0.35))
    s.line(X(34), Y(9), X(35), Y(11), "#ffffff")
    # eye in profile, brow, mouth, blush
    s.line(X(39), Y(18), X(42), Y(17), hr[1])
    s.line(X(39), Y(21), X(42), Y(21), hr[0]); s.px(X(38), Y(22), hr[0])
    s.rect(X(39), Y(22), X(42), Y(27), "#2a6ab0"); s.rect(X(39), Y(25), X(42), Y(27), "#3fa8e8")
    s.rect(X(40), Y(23), X(41), Y(26), "#141c38"); s.px(X(39), Y(22), "#ffffff"); s.px(X(39), Y(23), "#ffffff")
    s.px(X(42), Y(22), "#f6f4ff"); s.px(X(42), Y(26), "#9af0ff")
    s.line(X(41), Y(31), X(43), Y(31), "#b85a4a")
    s.line(X(35), Y(29), X(37), Y(29), "#f5a090")


def scarf_side(s, P, ox=0, oy=0, flutter=0):
    """flutter 0..2 lifts the back tail (wind while walking / swinging)."""
    sc, gold = P["scarf"], P["gold"]

    def X(v):
        return v + ox

    def Y(v):
        return v + oy

    f = flutter
    s.polygon([(X(27), Y(36)), (X(29), Y(40)), (X(15), Y(47 - 2 * f)), (X(9), Y(46 - 3 * f)), (X(13), Y(42 - 2 * f))], sc[3])
    s.polygon([(X(24), Y(38)), (X(27), Y(40)), (X(16), Y(51 - 2 * f)), (X(11), Y(51 - 3 * f))], sc[2])
    s.line(X(10), Y(46 - 3 * f), X(14), Y(43 - 2 * f), sc[5])
    lanna(s, X(18), Y(43 - 2 * f), gold)
    s.ellipse(X(25), Y(33), X(40), Y(41), sc[3])
    s.ellipse(X(25), Y(33), X(36), Y(38), sc[4], only=sc[3])
    s.line(X(26), Y(40), X(39), Y(40), sc[1])
    lanna(s, X(30), Y(37), gold); lanna(s, X(36), Y(37), gold)


def torso_side(s, P, ox=0, oy=0):
    jk = P["jacket"]

    def X(v):
        return v + ox

    def Y(v):
        return v + oy

    s.ellipse(X(20), Y(33), X(32), Y(45), jk[3]); s.ellipse(X(21), Y(33), X(29), Y(39), jk[4], only=jk[3])   # hood
    s.polygon([(X(24), Y(40)), (X(39), Y(40)), (X(41), Y(64)), (X(23), Y(64))], jk[3])
    s.polygon([(X(24), Y(40)), (X(28), Y(40)), (X(27), Y(64)), (X(23), Y(64))], jk[4], only=jk[3])
    s.polygon([(X(36), Y(40)), (X(39), Y(40)), (X(41), Y(64)), (X(38), Y(64))], jk[2], only=jk[3])
    s.line(X(39), Y(42), X(41), Y(61), P["shirt"][4])                                     # shirt at the open front
    s.rect(X(23), Y(61), X(41), Y(64), jk[1], only="opaque"); s.line(X(23), Y(61), X(41), Y(61), jk[4], only="opaque")
    s.line(X(25), Y(46), X(25), Y(58), P["glow"]); s.line(X(25), Y(58), X(28), Y(60), P["glow"])
    s.px(X(28), Y(60), "#ffffff")


def arm_side(s, P, sx, sy, hx, hy, near=True):
    """One sleeve from shoulder (sx, sy) to hand (hx, hy), glowing cuff + hand."""
    jk, sk = P["jacket"], P["skin"]
    body, edge = (jk[3], jk[4]) if near else (jk[1], jk[2])
    dx, dy = hx - sx, hy - sy
    n = max(1, (dx * dx + dy * dy) ** 0.5)
    px_, py_ = -dy / n, dx / n                                                             # perpendicular
    w0, w1 = 4, 2.6
    s.polygon([(sx + px_ * w0, sy + py_ * w0), (sx - px_ * w0, sy - py_ * w0),
               (hx - px_ * w1, hy - py_ * w1), (hx + px_ * w1, hy + py_ * w1)], body)
    s.ellipse(sx - 4, sy - 3, sx + 4, sy + 4, body)
    s.line(round(sx - px_ * 3), round(sy - py_ * 3), round(hx - px_ * 2), round(hy - py_ * 2), edge)
    cx, cy = hx - dx / n * 2, hy - dy / n * 2
    s.line(round(cx + px_ * 3), round(cy + py_ * 3), round(cx - px_ * 3), round(cy - py_ * 3), P["glow"] if near else jk[0])
    s.ellipse(hx - 2, hy - 2, hx + 3, hy + 3, sk[3] if near else sk[2])
    if near:
        s.px(hx, hy - 1, sk[5])


def leg_side(s, P, hip_x, foot_x, foot_y=85, near=True):
    pn, sh = P["pants"], P["shoe"]
    body = pn[3] if near else pn[1]
    s.polygon([(hip_x - 4, 63), (hip_x + 4, 63), (foot_x + 4, foot_y), (foot_x - 4, foot_y)], body)
    if near:
        s.line(hip_x - 4, 63, foot_x - 4, foot_y, pn[4]); s.line(hip_x + 4, 63, foot_x + 4, foot_y, pn[2])
    fy = foot_y + 1
    top, mid = (sh[4], sh[6]) if near else (sh[2], sh[3])
    s.rect(foot_x - 5, fy, foot_x + 5, fy + 4, top)
    s.ellipse(foot_x + 2, fy, foot_x + 8, fy + 5, top)
    s.line(foot_x - 4, fy, foot_x + 4, fy, mid)
    if near:
        s.rect(foot_x - 2, fy + 1, foot_x + 1, fy + 3, sh[2]); s.px(foot_x + 5, fy + 1, P["glow"])
    s.line(foot_x - 5, fy + 4, foot_x + 8, fy + 4, "#ff8a3a" if near else "#c85a1a")
    s.line(foot_x - 5, fy + 5, foot_x + 7, fy + 5, "#c85a1a" if near else "#8a3a1a")


def side(P, stride=0):
    """stride: 0 = stand; >0 = contact pose with the near leg forward by `stride` px."""
    s = Sprite(W, H)
    leg_side(s, P, 31, 31 - stride, near=False)
    arm_side(s, P, 32, 43, 32 + stride // 2 + 1, 60, near=False)
    s.layer("mid")
    oy = 0 if stride == 0 else 1
    s.rect(24, 60, 40, 66, P["pants"][3])
    leg_side(s, P, 33, 33 + stride, near=True)
    s.layer("upper")
    torso_side(s, P, 0, oy)
    scarf_side(s, P, 0, oy, flutter=1 if stride else 0)
    head_side(s, P, 0, oy)
    arm_side(s, P, 31, 43 + oy, 31 - stride // 2, 60 + oy, near=True)
    return finish(s)


# ============================================================================================
# Sword + side slash (attack cells are wider: 96x96, body at the same pivot, +16 px)

def sword(s, P, hx, hy, ang, L=34):
    """Hilt at the hand (hx, hy), blade along `ang` degrees (0 = right, 90 = down).
    Steel blade with a glowing [ระบบ] fuller, gold guard, wrapped grip."""
    import math
    st, gold = P["steel"], P["gold"]
    ux, uy = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    vx, vy = -uy, ux

    def at(t, w=0.0):
        return (hx + ux * t + vx * w, hy + uy * t + vy * w)

    def seg(t0, w0, t1, w1, c):
        a, b = at(t0, w0), at(t1, w1)
        s.line(round(a[0]), round(a[1]), round(b[0]), round(b[1]), c)

    s.polygon([at(-7, -1.5), at(-7, 1.5), at(-2, 1.5), at(-2, -1.5)], "#3a2a3a")         # grip
    pm = at(-8)
    s.ellipse(round(pm[0]) - 1, round(pm[1]) - 1, round(pm[0]) + 1, round(pm[1]) + 1, gold[4])
    s.polygon([at(2, -2.2), at(2, 2.2), at(L - 4, 2.2), at(L, 0), at(L - 4, -2.2)], st[3])  # blade
    s.polygon([at(2, -2.2), at(L - 4, -2.2), at(L, 0), at(2, 0)], st[5])                 # lit half
    seg(3, -2, L - 3, -2, st[6])
    seg(4, 0, L - 6, 0, P["glow"])                                                         # fuller glow
    s.polygon([at(-1, -5), at(-1, 5), at(2, 5), at(2, -5)], gold[3])                     # guard
    seg(-1, -4, -1, 4, gold[5])


def smear(s, P, cx, cy, r0, r1, a0, a1):
    """Swing trail: a solid crescent from angle a0 to a1 (degrees), thick at a1 (the blade end),
    thinning toward a0; glow outer band, white core."""
    import math
    n = 18

    def arc(rf):
        pts = []
        for i in range(n + 1):
            t = i / n
            a = math.radians(a0 + (a1 - a0) * t)
            r = rf(t)
            pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
        return pts

    th = lambda t: (r1 - r0) * (0.12 + 0.88 * t)                                          # noqa: E731
    s.polygon(arc(lambda t: r1) + arc(lambda t: r1 - th(t))[::-1], mix(P["glow"], "#ffffff", 0.2))
    s.polygon(arc(lambda t: r1 - 1) + arc(lambda t: r1 - 1 - th(t) * 0.45)[::-1], "#ffffff")


def slash(P, phase):
    """phase 0 = wind-up (sword cocked over the back shoulder), 1 = strike (lunge + trail)."""
    WB, D = 96, 16
    s = Sprite(WB, H)
    lean, fb, fn = (-2, 22, 38) if phase == 0 else (3, 14, 46)
    leg_side(s, P, D + 30, D + fb, near=False)
    if phase == 0:
        arm_side(s, P, D + 33 + lean, 43, D + 24, 14, near=False)
    s.layer("mid")
    s.rect(D + 24, 60, D + 40, 66, P["pants"][3])
    leg_side(s, P, D + 33, D + fn, near=True)
    s.layer("upper")
    oy = 0 if phase == 0 else 2
    torso_side(s, P, D + lean, oy)
    scarf_side(s, P, D + lean, oy, flutter=2)
    head_side(s, P, D + lean, oy)
    s.layer("weapon")
    if phase == 0:
        sword(s, P, D + 21, 16, 188)                                                      # cocked over the shoulder, blade back
        arm_side(s, P, D + 29 + lean, 43, D + 21, 16, near=True)
    else:
        smear(s, P, D + 34, 44, 30, 42, -80, 38)
        arm_side(s, P, D + 36, 44 + oy, D + 51, 54, near=True)
        sword(s, P, D + 51, 54, 38)
    out = Sprite(WB, H)
    out._img().paste(s.composite(1), (0, 0))
    out.outline(INK, where="outside")
    return out


# ============================================================================================
# Back view

def back(P):
    s = Sprite(W, H)
    legs_front(s, P, 0)
    for x0 in (22, 33):                                                                   # heel tabs
        s.rect(x0 + 3, 86, x0 + 5, 88, "#ff8a3a")
    s.layer("upper")
    jk, hr, sc, sk = P["jacket"], P["hair"], P["scarf"], P["skin"]
    for side_ in (-1, 1):                                                                 # arms
        top_out, top_in, hx = (15, 21, 14) if side_ < 0 else (49, 43, 50)
        col, edge = (jk[3], jk[4]) if side_ < 0 else (jk[2], jk[1])
        s.polygon([(top_out, 41), (top_in, 40), (hx - side_ * 4, 58), (hx, 58)], col)
        s.line(top_out - side_, 43, hx, 56, edge)
        cx = hx - (0 if side_ < 0 else 3)
        s.rect(cx, 57, cx + 4, 59, jk[1]); s.line(cx, 57, cx + 4, 57, P["glow"])
        s.ellipse(cx, 59, cx + 4, 64, sk[2])
    s.polygon([(20, 40), (44, 40), (43, 65), (21, 65)], jk[3])
    s.ellipse(16, 38, 27, 47, jk[3]); s.ellipse(37, 38, 48, 47, jk[2])
    s.polygon([(32, 40), (44, 40), (43, 65), (32, 65)], jk[2], only=jk[3])
    s.rect(21, 62, 43, 65, jk[1], only="opaque"); s.line(21, 62, 43, 62, jk[4], only="opaque")
    # hood lying on the shoulders
    s.ellipse(19, 36, 45, 51, jk[2]); s.ellipse(20, 36, 38, 47, jk[3], only=jk[2])
    s.ellipse(21, 36, 30, 42, jk[4], only=jk[3])
    s.ellipse(24, 38, 40, 46, jk[1]); s.ellipse(25, 38, 39, 44, jk[0], only=jk[1])          # hood opening
    # [ระบบ] sigil between the shoulder blades + seams
    g = P["glow"]
    s.circle(32, 56, 4, g); s.px(32, 51, g); s.px(32, 61, g); s.line(27, 56, 23, 56, g); s.line(37, 56, 41, 56, g)
    s.px(32, 56, "#ffffff"); s.px(31, 55, g); s.px(33, 57, g)
    s.line(23, 50, 23, 56, g); s.line(41, 50, 41, 56, g)
    # scarf: band + the back tail hanging down the right shoulder blade
    s.ellipse(21, 33, 43, 40, sc[3]); s.ellipse(21, 33, 34, 38, sc[4], only=sc[3]); s.line(22, 39, 42, 39, sc[1])
    s.polygon([(33, 38), (39, 38), (40, 54), (35, 56)], sc[3])
    s.polygon([(36, 38), (39, 38), (40, 54), (37, 55)], sc[2], only=sc[3])
    lanna(s, 36, 44, P["gold"]); lanna(s, 37, 50, P["gold"])
    for x in (35, 37, 39):
        s.px(x, 57, sc[2])
    # head from behind
    s.rect(29, 30, 35, 35, sk[2])
    for ex in (19, 45):
        s.ellipse(ex - 2, 19, ex + 2, 26, sk[3])
    s.ellipse(17, 3, 47, 30, hr[2])
    for pts, col in ((((28, 6), (20, 1), (22, 9)), hr[3]), (((24, 9), (15, 6), (19, 13)), hr[3]),
                     (((46, 9), (50, 6), (45, 14)), hr[1]), (((22, 26), (26, 33), (30, 27)), hr[2]),
                     (((29, 27), (32, 34), (35, 27)), hr[2]), (((34, 27), (38, 33), (42, 26)), hr[1])):
        s.polygon(pts, col)
    s.ellipse(19, 4, 38, 18, hr[3], only=hr[2]); s.ellipse(21, 5, 30, 10, hr[4], only=hr[3])
    s.ellipse(36, 10, 48, 30, hr[1], only=hr[2])
    s.line(34, 4, 31, 1, hr[3]); s.line(31, 1, 28, 3, hr[3])                              # ahoge from behind
    s.polygon([(38, 6), (42, 7), (40, 16)], P["glow"])                                    # the lock peeks over the crown
    s.px(24, 6, hr[5]); s.px(25, 5, hr[5])
    return finish(s)


def variants():
    """Recolours: hair / skin / jacket / scarf / glow. Idea: the seam glow follows the class element."""
    sets = [
        ("default", {}),
        ("ember", dict(hair="#6a3424", skin="#c98a60", jacket="#5a2432", scarf="#e0b020", glow="#ffb040")),
        ("frost", dict(hair="#c8cce0", skin="#f0c0a0", jacket="#24403a", scarf="#3a8ad8", glow="#9affd8")),
        ("night", dict(hair="#1c1a24", skin="#8a5a3c", jacket="#7a7e90", scarf="#e0552a", glow="#5ff0ff")),
        ("bloom", dict(hair="#d86a98", skin="#f0c4a4", jacket="#3a2c5c", scarf="#f0e0c0", glow="#ff7ad8")),
        ("leaf", dict(hair="#3a5a2a", skin="#d89a70", jacket="#e0d8c4", scarf="#2a8a5a", glow="#9aff5a")),
    ]
    Z = 3
    img = Image.new("RGBA", (len(sets) * (W * Z + 12) + 12, H * Z + 40), (58, 70, 96, 255))
    d = ImageDraw.Draw(img)
    for i, (name, kw) in enumerate(sets):
        sp = front(palette(**kw), 0).composite(1)
        x = 12 + i * (W * Z + 12)
        img.alpha_composite(sp.resize((W * Z, H * Z), Image.NEAREST), (x, 28))
        d.text((x, 8), name, fill=(255, 255, 255, 255))
    img.save(os.path.join(HERE, "variants.png"))


# ============================================================================================

def main():
    P = palette()
    poses = [("front idle", front(P, 0)), ("front walk", front(P, 1)), ("side idle", side(P, 0)),
             ("side walk", side(P, 8)), ("back idle", back(P)), ("slash wind-up", slash(P, 0)), ("slash strike", slash(P, 1))]
    Z = 3
    ims = [(n, sp.composite(1)) for n, sp in poses]
    tw = sum(im.width * Z + 16 for _, im in ims) + 16
    sheet = Image.new("RGBA", (tw, H * Z + 60 + H + 20), (58, 70, 96, 255))
    d = ImageDraw.Draw(sheet)
    x = 12
    for name, im in ims:
        sheet.alpha_composite(im.resize((im.width * Z, H * Z), Image.NEAREST), (x, 28))
        d.text((x, 8), name, fill=(255, 255, 255, 255))
        x += im.width * Z + 16
    x = 12
    for name, im in ims:                                                                  # true size
        sheet.alpha_composite(im, (x, H * Z + 44))
        x += im.width + 12
    sheet.save(os.path.join(HERE, "sheet.png"))
    variants()
    print("OK")


if __name__ == "__main__":
    main()
