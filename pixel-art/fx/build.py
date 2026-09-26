#!/usr/bin/env python3
"""
Battle effects for Pixel Walker — pixel-art sprite sheets plus projectiles. 32-bit (2026-09-26,
MASTER_SPEC §5C): designed on the 48x48 / 16x16 grids and re-rasterised at 2x by kit2x (96x96
frames, 32x32 projectiles; rings and bursts get finer curves). Drawn procedurally per frame (radius / height / scatter by time) so each
animation is smooth and consistent. Bright core → coloured body → dark rim, hard pixels, no AA.

    python pixel-art/fx/build.py

Outputs apps/game/public/assets/fx/<name>.png, fx.json (frame counts) and preview.png here.
"""
import json
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite, ramp  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

sys.path.insert(0, os.path.join(ROOT, "pixel-art"))
from kit2x import K, Canvas2x  # noqa: E402

OUT = os.path.join(ROOT, "apps", "game", "public", "assets", "fx")
F = 48
C = F // 2


def R(base, n=5, hs=18):
    return ramp(base, n, hue_shift=hs)


def strip(frames):
    """Combine per-frame Sprites into one horizontal strip image."""
    img = Image.new("RGBA", (F * K * len(frames), F * K), (0, 0, 0, 0))
    for i, s in enumerate(frames):
        img.alpha_composite(s.composite(1), (i * F * K, 0))
    return img


def ring(s, cx, cy, r, c, thick=1):
    for t in range(thick):
        s.circle(cx, cy, max(1, r - t), c)


def sparkle(s, x, y, c, big=False):
    s.px(x, y, c)
    if big:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            s.px(x + dx, y + dy, c)


def rng(seed):
    return random.Random(seed)


# --------------------------------------------------------------------------------------------
# Physical

def slash(n=6, col="#ffffff"):
    """A solid crescent swept around the target, drawn at full 2x resolution: bright leading
    edge, colour body, fading tail (32-bit: no striped arcs)."""
    frames = []
    r = R(col, hs=10)
    for i in range(n):
        c = Canvas2x(F, F)
        f = c.s
        cx = cy = C * K
        a0, a1 = -2.4 + i * 0.55, -2.4 + i * 0.55 + 1.6
        steps = 120
        for k in range(steps):
            t = k / (steps - 1)                                  # 0 tail .. 1 leading edge
            a = a0 + (a1 - a0) * t
            width = 2 + round(6 * t) if i < n - 2 else 2 + round(3 * t)
            for w in range(width):
                rad = 34 - w
                col_ = r[4] if w == 0 else r[3] if w < width * 0.5 else r[2]
                if t < 0.25 and w > 1:
                    continue
                f.px(round(cx + math.cos(a) * rad), round(cy + math.sin(a) * rad), col_)
        if i < n - 1:
            ex, ey = cx + math.cos(a1) * 32, cy + math.sin(a1) * 32
            f.rect(round(ex) - 1, round(ey) - 4, round(ex) + 1, round(ey) + 4, "#ffffff")
            f.rect(round(ex) - 4, round(ey) - 1, round(ex) + 4, round(ey) + 1, "#ffffff")
        frames.append(c)
    return strip(frames)


def impact(n=5, col="#ffe29a", big=False):
    frames = []
    r = R(col, hs=20)
    for i in range(n):
        s = Canvas2x(F, F)
        rad = 4 + i * (5 if big else 4)
        spikes = 8
        for k in range(spikes):
            a = k * math.tau / spikes + (0.3 if k % 2 else 0)
            ln = rad + (4 if k % 2 == 0 else 1)
            for t in range(max(2, rad - 3), ln):
                c = r[4] if t < rad else r[2]
                s.px(round(C + math.cos(a) * t), round(C + math.sin(a) * t), c)
        if i < 2:
            s.circle(C, C, 5 - i * 2, "#ffffff", fill=True)
        elif i < n - 1:
            ring(s, C, C, rad - 1, r[3])
        frames.append(s)
    return strip(frames)


# --------------------------------------------------------------------------------------------
# Elements

def fire(n=7):
    frames = []
    r = R("#ff7a2a", hs=24)
    g = rng(3)
    tongues = [(g.randint(-12, 12), g.randint(10, 20), g.random() * 6) for _ in range(9)]
    for i in range(n):
        s = Canvas2x(F, F)
        life = i / (n - 1)
        for x0, h, ph in tongues:
            hh = h * (0.4 + 0.9 * math.sin(math.pi * min(1, life * 1.3 + 0.1)))
            base = 42
            for t in range(int(hh)):
                w = max(0, round(3 * (1 - t / max(1, hh)) + 0.5))
                x = C + x0 + round(math.sin(t * 0.5 + ph + i) * 1.5)
                y = base - t
                c = r[4] if t < hh * 0.25 else r[3] if t < hh * 0.55 else r[2] if t < hh * 0.8 else r[1]
                for dx in range(-w, w + 1):
                    s.px(x + dx, y, c)
        if i > 1:
            for k in range(4):
                s.px(C + g.randint(-16, 16), 40 - int(life * 36) - k * 3, "#ffe29a")
        frames.append(s)
    return strip(frames)


def water(n=6):
    frames = []
    r = R("#3f9ae8", hs=18)
    g = rng(7)
    drops = [(g.uniform(-2.8, -0.3), g.uniform(8, 17)) for _ in range(12)]
    for i in range(n):
        s = Canvas2x(F, F)
        t = i / (n - 1)
        # splash ring on the ground
        s.ellipse(C - 6 - i * 3, 38 - i // 2, C + 6 + i * 3, 42 + i // 2, r[2] if i < n - 1 else r[1], fill=False)
        for a, v in drops:
            d = v * t * 1.6
            x = C + math.cos(a) * d
            y = 38 + math.sin(a) * d + 18 * t * t
            s.circle(round(x), round(y), 1 if i > 3 else 2, r[3], fill=True)
            s.px(round(x) - 1, round(y) - 1, r[4])
        if i < 3:
            s.polygon([(C - 3, 38), (C + 3, 38), (C, 38 - 14 + i * 3)], r[3])
        frames.append(s)
    return strip(frames)


def lightning(n=6):
    frames = []
    g = rng(11)
    pts = [(C + g.randint(-3, 3), 0)]
    for y in range(6, 44, 6):
        pts.append((C + g.randint(-7, 7), y))
    for i in range(n):
        s = Canvas2x(F, F)
        if i in (1, 2, 3):
            for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
                s.line(x0 - 1, y0, x1 - 1, y1, "#b58f12")
                s.line(x0 + 1, y0, x1 + 1, y1, "#fff6a8")
                s.line(x0, y0, x1, y1, "#ffffff")
            if i == 2:
                for x0, y0 in pts[2::2]:
                    s.line(x0, y0, x0 + g.randint(-9, 9), y0 + 5, "#fff6a8")
        rr = 3 + i * 3
        if i >= 1:
            ring(s, C, 42, rr, "#fff6a8" if i < 4 else "#b58f12")
            for k in range(6):
                a = k * math.tau / 6 + i
                s.px(round(C + math.cos(a) * rr), round(42 + math.sin(a) * rr * 0.5), "#ffffff")
        frames.append(s)
    return strip(frames)


def ice(n=6):
    frames = []
    r = R("#8fd8ff", hs=14)
    shards = [(-12, 14), (-5, 22), (3, 26), (10, 18), (15, 11), (-17, 8)]
    for i in range(n):
        s = Canvas2x(F, F)
        grow = min(1, i / 3)
        shatter = max(0, i - 3)
        for dx, h in shards:
            hh = int(h * grow)
            if shatter:
                for k in range(3):
                    s.px(C + dx + (k - 1) * shatter * 3, 42 - hh + k * 4 - shatter * 2, r[4])
                continue
            for t in range(hh):
                w = max(0, round(2.5 * (1 - t / max(1, h))))
                for x in range(-w, w + 1):
                    s.px(C + dx + x, 42 - t, r[4] if x < 0 else r[2] if x > 0 else r[3])
        frames.append(s)
    return strip(frames)


def earth(n=6):
    frames = []
    r = R("#a0773a", hs=14)
    g = rng(5)
    rocks = [(g.randint(-14, 14), g.uniform(3, 7), g.uniform(-1.2, 1.2)) for _ in range(8)]
    for i in range(n):
        s = Canvas2x(F, F)
        t = i / (n - 1)
        s.ellipse(C - 14, 38, C + 14, 44, r[0] if i < n - 1 else r[1])            # crack in the ground
        s.line(C - 10, 41, C + 10, 41, "#1c1a28")
        for x0, v, drift in rocks:
            y = 40 - v * 8 * t + 22 * t * t
            x = C + x0 + drift * 10 * t
            if y > 44:
                continue
            s.rect(round(x) - 1, round(y) - 1, round(x) + 1, round(y) + 1, r[2])
            s.px(round(x) - 1, round(y) - 1, r[4])
        frames.append(s)
    return strip(frames)


def holy(n=7):
    frames = []
    r = R("#fff1a8", hs=20)
    for i in range(n):
        s = Canvas2x(F, F)
        w = [2, 5, 8, 9, 8, 5, 2][i]
        s.rect(C - w, 0, C + w, 44, r[2])
        s.rect(C - max(1, w // 2), 0, C + max(1, w // 2), 44, r[4])
        s.ellipse(C - w - 6, 40, C + w + 6, 46, r[3])
        for k in range(8):
            a = k * math.tau / 8 + i * 0.4
            rr = 8 + i * 2
            sparkle(s, round(C + math.cos(a) * rr), round(30 + math.sin(a) * rr * 0.6), "#ffffff", big=(k % 2 == 0))
        frames.append(s)
    return strip(frames)


def shadow(n=6):
    frames = []
    r = R("#8a5ce8", hs=22)
    g = rng(9)
    blobs = [(g.uniform(0, math.tau), g.uniform(4, 16)) for _ in range(10)]
    for i in range(n):
        s = Canvas2x(F, F)
        t = i / (n - 1)
        for a, d in blobs:
            dd = d * (0.4 + t)
            x, y = C + math.cos(a + t * 2) * dd, C + math.sin(a + t * 2) * dd * 0.8
            rad = max(1, round(4 * (1 - t)))
            s.circle(round(x), round(y), rad, r[1], fill=True)
            s.px(round(x), round(y), r[3])
        if i < n - 1:
            for k in range(3):                                                           # tendrils
                a = k * math.tau / 3 + t * 3
                for j in range(10):
                    s.px(round(C + math.cos(a + j * 0.15) * j * 1.6), round(C + math.sin(a + j * 0.15) * j * 1.6), "#2a1848")
        frames.append(s)
    return strip(frames)


def poison(n=6):
    frames = []
    r = R("#6fcf4a", hs=18)
    g = rng(13)
    bub = [(g.randint(-14, 14), g.randint(0, 5), g.randint(2, 4)) for _ in range(9)]
    for i in range(n):
        s = Canvas2x(F, F)
        for x0, off, rad in bub:
            y = 42 - ((i + off) * 6) % 40
            rr = max(1, rad - (1 if y < 14 else 0))
            s.circle(C + x0, y, rr, r[2])
            s.px(C + x0 - 1, y - 1, r[4])
        s.ellipse(C - 12, 38, C + 12, 44, r[1])
        frames.append(s)
    return strip(frames)


# --------------------------------------------------------------------------------------------
# Support / status

def heal(n=7):
    frames = []
    g = rng(17)
    parts = [(g.randint(-15, 15), g.randint(0, 20)) for _ in range(9)]
    for i in range(n):
        s = Canvas2x(F, F)
        ring(s, C, 40, 6 + i * 2, "#8dff8a" if i < 4 else "#3aa06a")
        for x0, off in parts:
            y = 42 - ((i * 5 + off) % 38)
            c = "#ffffff" if (x0 + i) % 3 == 0 else "#8dff8a"
            s.px(C + x0, y, c); s.px(C + x0 - 1, y, c); s.px(C + x0 + 1, y, c); s.px(C + x0, y - 1, c); s.px(C + x0, y + 1, c)
        frames.append(s)
    return strip(frames)


def shield(n=6):
    frames = []
    r = R("#6fb7ff", hs=16)
    for i in range(n):
        s = Canvas2x(F, F)
        rad = [6, 12, 17, 18, 18, 17][i]
        pts = [(round(C + math.cos(a) * rad), round(C + math.sin(a) * rad)) for a in [k * math.tau / 6 + math.pi / 6 for k in range(6)]]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
            s.line(x0, y0, x1, y1, r[3])
        if i >= 2:
            for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
                s.line((x0 + C) // 2, (y0 + C) // 2, (x1 + C) // 2, (y1 + C) // 2, r[2])
        if i in (2, 3):
            sparkle(s, pts[0][0], pts[0][1], "#ffffff", big=True)
            sparkle(s, pts[3][0], pts[3][1], "#ffffff", big=True)
        frames.append(s)
    return strip(frames)


def arrows(n=6, up=True, col="#ffb347"):
    frames = []
    r = R(col, hs=18)
    for i in range(n):
        s = Canvas2x(F, F)
        for k, x0 in enumerate((-12, 0, 12)):
            y = (40 - ((i * 6 + k * 9) % 36)) if up else (8 + ((i * 6 + k * 9) % 36))
            d = -1 if up else 1
            for t in range(5):
                s.px(C + x0 - t, y - d * t + d * 4, r[3]); s.px(C + x0 + t, y - d * t + d * 4, r[3])
            s.rect(C + x0 - 1, y + (2 if up else -8), C + x0 + 1, y + (8 if up else -2), r[2])
            s.px(C + x0, y + (4 if up else -4), r[4])
        frames.append(s)
    return strip(frames)


def stun(n=6):
    frames = []
    for i in range(n):
        s = Canvas2x(F, F)
        for k in range(3):
            a = k * math.tau / 3 + i * math.tau / n
            x, y = round(C + math.cos(a) * 12), round(12 + math.sin(a) * 4)
            for dx, dy in ((0, -2), (0, 2), (-2, 0), (2, 0), (0, -1), (0, 1), (-1, 0), (1, 0), (0, 0)):
                s.px(x + dx, y + dy, "#fff1a8")
            s.px(x, y, "#ffffff")
        frames.append(s)
    return strip(frames)


def cast(n=6, col="#b8a0ff"):
    frames = []
    r = R(col, hs=18)
    for i in range(n):
        s = Canvas2x(F, F)
        rx = [4, 10, 16, 20, 20, 18][i]
        ry = max(2, rx // 3)
        s.ellipse(C - rx, 40 - ry, C + rx, 40 + ry, r[3], fill=False)
        if rx > 8:
            s.ellipse(C - rx + 4, 40 - ry + 1, C + rx - 4, 40 + ry - 1, r[2], fill=False)
            for k in range(6):
                a = k * math.tau / 6 + i * 0.5
                s.px(round(C + math.cos(a) * (rx - 2)), round(40 + math.sin(a) * (ry - 1)), "#ffffff")
        if i >= 2:
            for k in range(4):
                s.px(C - 12 + k * 8, 36 - (i * 4 + k * 5) % 28, r[4])
        frames.append(s)
    return strip(frames)


def smoke(n=6):
    frames = []
    r = R("#b8b0c8", hs=10)
    for i in range(n):
        s = Canvas2x(F, F)
        for k in range(6):
            a = k * math.tau / 6
            d = 4 + i * 3
            rad = max(1, 6 - i)
            s.circle(round(C + math.cos(a) * d), round(34 + math.sin(a) * d * 0.5 - i * 2), rad, r[2] if i < 3 else r[1], fill=True)
        frames.append(s)
    return strip(frames)


# --------------------------------------------------------------------------------------------
# Projectiles 16x16 (2 frames)

def projectile(kind):
    img = Image.new("RGBA", (64, 32), (0, 0, 0, 0))
    for f in range(2):
        s = Canvas2x(16, 16)
        if kind == "fireball":
            s.circle(9, 8, 4 + f, "#ff7a2a", fill=True); s.circle(10, 7, 2, "#fff1a8", fill=True)
            for k in range(4):
                s.px(3 - k % 2, 8 + (k - 2), "#ffb347")
        elif kind == "orb_water":
            s.circle(8, 8, 4, "#3f9ae8", fill=True); s.circle(7, 7, 2, "#bfe6ff", fill=True); s.px(3 - f, 8, "#8fc8ff")
        elif kind == "orb_holy":
            s.circle(8, 8, 3 + f, "#fff1a8", fill=True); s.circle(8, 8, 1, "#ffffff", fill=True)
            s.px(8, 2, "#ffffff"); s.px(8, 14, "#ffffff"); s.px(2, 8, "#ffffff"); s.px(14, 8, "#ffffff")
        elif kind == "orb_shadow":
            s.circle(8, 8, 4, "#4a2f6e", fill=True); s.circle(8, 8, 2, "#b8a0ff", fill=True); s.px(3 - f, 9, "#8a5ce8")
        elif kind == "spark":
            s.line(2, 8, 14, 8, "#fff6a8"); s.line(8, 3 + f, 8, 13 - f, "#fff6a8"); s.px(8, 8, "#ffffff")
        elif kind == "arrow":
            s.line(1, 8, 13, 8, "#c8a060"); s.px(14, 8, "#d8e0ec"); s.px(13, 7, "#d8e0ec"); s.px(13, 9, "#d8e0ec")
            s.px(1, 7, "#e53935"); s.px(1, 9, "#e53935"); s.px(2, 7, "#e53935"); s.px(2, 9, "#e53935")
        elif kind == "rock":
            s.circle(8, 8, 3, "#9a9486", fill=True); s.px(7, 7, "#cfc8b8"); s.px(9 + f, 10, "#6b655a")
        s.outline("#1c1a28", where="outside")
        img.alpha_composite(s.composite(1), (f * 32, 0))
    return img


SHEETS = {
    "slash": lambda: slash(), "slash_red": lambda: slash(col="#ff6b6b"), "impact": lambda: impact(), "crit": lambda: impact(6, "#ffd23a", big=True),
    "fire": fire, "water": water, "lightning": lightning, "ice": ice, "earth": earth, "holy": holy, "shadow": shadow,
    "poison": poison, "heal": heal, "mana": lambda: heal_tinted(), "shield": shield, "buff": lambda: arrows(up=True),
    "debuff": lambda: arrows(up=False, col="#6fb7ff"), "stun": stun, "cast": lambda: cast(), "cast_holy": lambda: cast(col="#fff1a8"),
    "cast_fire": lambda: cast(col="#ff9a4a"), "smoke": smoke,
}


def heal_tinted():
    """Mana potion: the heal sparkles recoloured blue."""
    im = heal()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r_, g_, b_, a = px[x, y]
            if a:
                px[x, y] = (min(255, b_ // 2 + 40), min(255, g_ // 2 + 90), 255, a) if (r_, g_, b_) != (255, 255, 255) else (255, 255, 255, a)
    return im


PROJECTILES = ["fireball", "orb_water", "orb_holy", "orb_shadow", "spark", "arrow", "rock"]


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    sheets = {}
    for name, fn in SHEETS.items():
        im = fn()
        im.save(os.path.join(OUT, f"{name}.png"))
        sheets[name] = im
        meta[name] = {"frames": im.width // (F * K), "size": F * K}
    for name in PROJECTILES:
        im = projectile(name)
        im.save(os.path.join(OUT, f"p_{name}.png"))
        meta[f"p_{name}"] = {"frames": 2, "size": 32}
    with open(os.path.join(OUT, "fx.json"), "w") as f:
        json.dump(meta, f, indent=1)
    Z = 1
    FF = F * K
    maxw = max(im.width for im in sheets.values())
    sheet = Image.new("RGBA", (maxw * Z + 150, len(sheets) * (FF * Z + 6) + 60), (40, 44, 66, 255))
    d = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(sheets.items()):
        y = i * (FF * Z + 6) + 4
        d.text((4, y + 4), n, fill=(255, 255, 255, 255))
        sheet.alpha_composite(im, (140, y))
    x = 140
    for n in PROJECTILES:
        im = Image.open(os.path.join(OUT, f"p_{n}.png")).convert("RGBA")
        sheet.alpha_composite(im.resize((im.width * 2, im.height * 2), Image.NEAREST), (x, len(sheets) * (FF * Z + 6) + 8))
        x += 110
    sheet.save(os.path.join(HERE, "preview.png"))
    print("OK", len(sheets), "sheets +", len(PROJECTILES), "projectiles")


if __name__ == "__main__":
    main()
