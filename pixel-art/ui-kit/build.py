#!/usr/bin/env python3
"""
UI kit for Pixel Walker — window frames, buttons and wells as 9-slice PNGs, plus interface icons.
32-bit (2026-09-26, MASTER_SPEC §5C): frames are drawn natively at 24x24 with an 8 px slice and
shown 1:1 (CSS: border-image: url(x.png) 8 fill / 8px); icons are designed on a 16 grid and
re-rasterised at 32x32 by kit2x (+ bevel), shown 1:1 at 32 px.

    python pixel-art/ui-kit/build.py

Outputs apps/game/public/assets/ui/*.png and preview.png (6x) here for review.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite, ramp, mix  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

sys.path.insert(0, os.path.join(ROOT, "pixel-art"))
from kit2x import K, Canvas2x, bevel  # noqa: E402

N = 24          # 9-slice piece size
SL = 8          # slice (corner) size

OUT = os.path.join(ROOT, "apps", "game", "public", "assets", "ui")
INK = "#1c1a28"

# One palette for the whole UI: warm paper windows, blue headers, orange accent (brand colour).
PAPER = {"fill": "#f6f0e1", "hi": "#ffffff", "sh": "#cdbf9f", "ink": INK}
THEMES = {
    "panel": PAPER,
    "btn": {"fill": "#efe5cf", "hi": "#ffffff", "sh": "#b3a27e", "ink": INK},
    "btn-primary": {"fill": "#f5a031", "hi": "#ffd896", "sh": "#b8620f", "ink": INK},
    "btn-blue": {"fill": "#4f7fe0", "hi": "#a8c4ff", "sh": "#2c4c9e", "ink": INK},
    "btn-danger": {"fill": "#dc4a3c", "hi": "#ffa493", "sh": "#8e2218", "ink": INK},
    "btn-dark": {"fill": "#3a3f58", "hi": "#6d7596", "sh": "#1f2233", "ink": INK},
}


def _notched_border(s, c, n):
    """1 px ink border with 2 px rounded corners."""
    s.line(2, 0, n - 2, 0, c); s.line(2, n, n - 2, n, c); s.line(0, 2, 0, n - 2, c); s.line(n, 2, n, n - 2, c)
    for x, y in ((1, 1), (n - 1, 1), (1, n - 1), (n - 1, n - 1)):
        s.px(x, y, c)


def frame(t, pressed=False):
    """Beveled 24x24 frame (8 px slice): rounded ink border, top sheen, soft gradient body,
    2-step lit edge top-left, 3 px raised lip bottom-right (pressed = sunk, no lip)."""
    s = Sprite(N, N)
    n = N - 1
    fill, hi, sh, ink = t["fill"], t["hi"], t["sh"], t["ink"]
    top = mix(fill, hi, 0.3)
    s.rect(1, 1, n - 1, n - 1, fill)
    for x in range(1, n):
        s.px(x, 1, None if x in (1, n - 1) else fill)
    if pressed:
        s.rect(2, 2, n - 2, 4, mix(fill, sh, 0.45))                     # inner shadow at the top
        s.line(2, 2, 2, n - 2, mix(fill, sh, 0.45))
        s.line(2, n - 2, n - 2, n - 2, hi)
    else:
        s.rect(2, 2, n - 2, 9, top)                                      # upper half catches light
        s.line(3, 3, n - 4, 3, mix(top, hi, 0.6))                        # sheen
        s.line(2, 2, n - 2, 2, hi); s.line(2, 2, 2, n - 4, hi)           # lit edge
        s.line(3, 2, 3, n - 5, mix(fill, hi, 0.55))
        s.line(n - 2, 3, n - 2, n - 3, sh)                               # shaded right edge
        for i, col in enumerate((sh, sh, mix(sh, ink, 0.35))):           # raised lip
            s.line(2, n - 3 + i if i < 2 else n - 1, n - 2, n - 3 + i if i < 2 else n - 1, col)
    _notched_border(s, ink, n)
    return s


def well():
    """Inset well for slots and gauges: shaded top-left, light bottom-right."""
    s = Sprite(N, N)
    n = N - 1
    s.rect(1, 1, n - 1, n - 1, "#e6dcc6")
    s.rect(2, 2, n - 2, 3, "#b8ab8e"); s.line(2, 2, 2, n - 2, "#b8ab8e"); s.line(3, 3, 3, n - 3, "#cfc2a4")
    s.line(2, 2, n - 2, 2, "#9c8f73")
    s.line(2, n - 2, n - 2, n - 2, "#ffffff"); s.line(n - 2, 3, n - 2, n - 2, "#ffffff")
    s.line(3, n - 3, n - 3, n - 3, "#f4ecd8")
    _notched_border(s, "#6d6250", n)
    return s


def selected():
    """Highlight frame for a selected slot (2 px orange + light inner line)."""
    s = Sprite(N, N)
    n = N - 1
    o, l = "#f08c00", "#ffd896"
    _notched_border(s, o, n)
    s.line(2, 1, n - 2, 1, o); s.line(1, 2, 1, n - 2, o); s.line(2, n - 1, n - 2, n - 1, o); s.line(n - 1, 2, n - 1, n - 2, o)
    s.line(2, 2, n - 2, 2, l); s.line(2, 2, 2, n - 2, l)
    return s


def sys_frame(edge, glow, fill="#141c38"):
    """[ระบบ] window (docs/STORY.md §5): dark navy hologram, 2-tone glowing edge, bracket corners."""
    s = Sprite(N, N)
    n = N - 1
    s.rect(1, 1, n - 1, n - 1, fill)
    s.line(2, 2, n - 2, 2, "#1e2c54"); s.line(2, 3, n - 2, 3, "#18244a")      # light from the top
    s.line(2, n - 2, n - 2, n - 2, "#0c1226")
    s.line(1, 0, n - 1, 0, edge); s.line(1, n, n - 1, n, edge); s.line(0, 1, 0, n - 1, edge); s.line(n, 1, n, n - 1, edge)
    s.line(1, 1, n - 1, 1, mix(edge, fill, 0.55)); s.line(1, 1, 1, n - 1, mix(edge, fill, 0.55))   # inner glow
    for x0, y0, dx, dy in ((0, 0, 1, 1), (n, 0, -1, 1), (0, n, 1, -1), (n, n, -1, -1)):              # bracket corners
        for i in range(5):
            s.px(x0 + dx * i, y0, glow); s.px(x0, y0 + dy * i, glow)
        s.px(x0 + dx, y0 + dy, edge)
    return s


SYS_FRAMES = {"sys": ("#4fd8ff", "#c8f6ff"), "sys-gold": ("#f2c230", "#fff2b0"), "sys-red": ("#ff5a5a", "#ffc8c8")}


# --------------------------------------------------------------------------------------------
# 16x16 icons

def icon():
    return Canvas2x(16, 16)


def done(s):
    bevel(s.s, light=0.22, dark=0.18, skip=(INK,))
    s.outline(INK, where="outside")
    return s


def ic_char():
    s = icon()
    skin = ramp("#f0c090", 4, hue_shift=14); cloth = ramp("#f5a031", 4, hue_shift=16); hair = ramp("#3a3050", 3)
    s.rect(3, 10, 12, 14, cloth[2]); s.rect(3, 10, 5, 14, cloth[3]); s.rect(11, 11, 12, 14, cloth[1])
    s.circle(8, 6, 4, skin[2], fill=True); s.px(6, 4, skin[3]); s.px(10, 8, skin[1])
    s.rect(4, 2, 12, 4, hair[1]); s.px(5, 5, hair[1]); s.px(11, 5, hair[1]); s.px(6, 2, hair[2])
    s.px(7, 6, INK); s.px(10, 6, INK)
    return done(s)


def ic_bag():
    s = icon()
    b = ramp("#b0703a", 5, hue_shift=16)
    s.rect(3, 5, 12, 14, b[2]); s.rect(3, 5, 4, 14, b[3]); s.rect(11, 6, 12, 14, b[1])
    s.rect(3, 5, 12, 8, b[1]); s.line(3, 5, 12, 5, b[3])            # flap
    s.rect(7, 8, 8, 9, "#f2c230")                                     # buckle
    s.line(6, 2, 9, 2, b[1]); s.px(5, 3, b[1]); s.px(10, 3, b[1]); s.px(5, 4, b[1]); s.px(10, 4, b[1])  # handle
    s.line(4, 12, 11, 12, b[1])
    return done(s)


def ic_party():
    s = icon()
    a = ramp("#4f7fe0", 4); c = ramp("#f5a031", 4); skin = "#f0c090"
    s.circle(5, 5, 2, skin, fill=True); s.rect(2, 9, 8, 14, a[2]); s.rect(2, 9, 3, 14, a[3])
    s.circle(11, 6, 2, skin, fill=True); s.rect(8, 10, 14, 14, c[2]); s.rect(13, 10, 14, 14, c[1])
    s.px(4, 3, "#3a3050"); s.px(5, 3, "#3a3050"); s.px(6, 3, "#3a3050"); s.px(10, 4, "#3a3050"); s.px(11, 4, "#3a3050"); s.px(12, 4, "#3a3050")
    return done(s)


def ic_home():
    s = icon()
    roof = ramp("#d8453a", 4, hue_shift=16); wall = ramp("#f2e2bf", 4)
    s.polygon([(1, 8), (8, 1), (15, 8)], roof[2]); s.line(1, 8, 8, 1, roof[3]); s.line(9, 2, 14, 7, roof[1])
    s.rect(3, 8, 13, 14, wall[2]); s.rect(11, 8, 13, 14, wall[1])
    s.rect(7, 10, 9, 14, "#7a4a22"); s.px(8, 12, "#f2c230")
    s.rect(4, 9, 5, 10, "#6fb7ff"); s.rect(11, 9, 12, 10, "#4d8ee0")
    return done(s)


def ic_settings():
    s = icon()
    g = ramp("#9aa4b0", 4, hue_shift=14)
    s.circle(8, 8, 5, g[2], fill=True)
    for x, y in ((8, 1), (8, 15), (1, 8), (15, 8), (3, 3), (13, 3), (3, 13), (13, 13)):
        s.rect(min(x, 8) if x < 8 else x - 1, y if y < 8 else y - 1, (min(x, 8) if x < 8 else x - 1) + 1, (y if y < 8 else y - 1) + 1, g[2])
    s.circle(8, 8, 2, None, fill=True)
    s.px(6, 5, g[3]); s.px(5, 6, g[3]); s.px(10, 11, g[0]); s.px(11, 10, g[0])
    return done(s)


def ic_auto():
    s = icon()
    m = ramp("#8fb0f0", 4, hue_shift=16)
    s.rect(3, 5, 12, 13, m[2]); s.rect(3, 5, 12, 6, m[3]); s.rect(11, 7, 12, 13, m[1])
    s.line(8, 2, 8, 4, m[1]); s.px(8, 1, "#e53935")                  # antenna
    s.rect(5, 8, 6, 9, "#22e3a0"); s.rect(9, 8, 10, 9, "#22e3a0")     # eyes
    s.line(6, 11, 9, 11, m[0])
    s.px(2, 9, m[1]); s.px(13, 9, m[1])
    return done(s)


def ic_plus():
    s = icon()
    s.rect(6, 2, 9, 13, "#f6f0e1"); s.rect(2, 6, 13, 9, "#f6f0e1")
    return done(s)


def ic_minus():
    s = icon()
    s.rect(2, 6, 13, 9, "#f6f0e1")
    return done(s)


def ic_compass():
    s = icon()
    s.circle(8, 8, 6, "#f6f0e1", fill=True); s.circle(8, 8, 6, "#b3a27e")
    s.polygon([(8, 3), (10, 8), (6, 8)], "#e53935")
    s.polygon([(6, 8), (10, 8), (8, 13)], "#3a3f58")
    s.px(8, 8, "#f2c230")
    return done(s)


def ic_run():
    s = icon()
    w = ramp("#f4f4ee", 4); r = "#e53935"
    s.polygon([(2, 7), (6, 6), (8, 9), (13, 10), (14, 12), (2, 12)], w[2])
    s.rect(1, 12, 14, 13, "#4a4f58")
    s.line(4, 11, 11, 9, r); s.px(3, 7, w[3]); s.px(4, 7, w[3])
    s.line(9, 3, 13, 3, "#8fb0f0"); s.line(11, 5, 15, 5, "#8fb0f0")  # speed lines
    return done(s)


def ic_pin():
    s = icon()
    r = ramp("#e53935", 4, hue_shift=16)
    s.circle(8, 6, 4, r[2], fill=True); s.polygon([(5, 8), (11, 8), (8, 14)], r[2])
    s.circle(8, 6, 1, "#ffffff", fill=True); s.px(6, 4, r[3]); s.px(10, 9, r[1])
    return done(s)


def ic_coin():
    s = icon()
    g = ramp("#f2c230", 5, hue_shift=22)
    s.circle(8, 8, 6, g[2], fill=True); s.circle(8, 8, 6, g[1])
    s.circle(8, 8, 4, g[3]); s.line(8, 5, 8, 11, g[1]); s.px(5, 5, g[4]); s.px(6, 4, g[4])
    return done(s)


def ic_swords():
    s = icon()
    st = ramp("#d8e0ec", 4); h = "#7a4a22"; gd = "#f2c230"
    s.line(3, 2, 12, 11, st[2]); s.line(4, 2, 13, 11, st[3])
    s.line(12, 2, 3, 11, st[2]); s.line(13, 2, 4, 11, st[1])
    s.line(10, 12, 13, 9, gd); s.line(2, 9, 5, 12, gd)
    s.line(13, 12, 14, 13, h); s.line(2, 12, 1, 13, h)
    return done(s)


def ic_skull():
    s = icon()
    b = ramp("#f2ecdc", 4)
    s.circle(8, 7, 5, b[2], fill=True); s.rect(5, 11, 11, 13, b[2])
    s.rect(5, 6, 6, 8, INK); s.rect(10, 6, 11, 8, INK); s.px(8, 9, INK)
    s.px(6, 12, b[0]); s.px(8, 12, b[0]); s.px(10, 12, b[0]); s.px(5, 4, b[3]); s.px(6, 3, b[3])
    return done(s)


def ic_close():
    s = icon()
    for i in range(10):
        s.px(3 + i, 3 + i, "#f6f0e1"); s.px(4 + i, 3 + i, "#f6f0e1")
        s.px(12 - i, 3 + i, "#f6f0e1"); s.px(13 - i, 3 + i, "#f6f0e1")
    return done(s)


def ic_heart():
    s = icon()
    r = ramp("#e53955", 4, hue_shift=14)
    s.circle(5, 6, 3, r[2], fill=True); s.circle(10, 6, 3, r[2], fill=True)
    s.polygon([(2, 7), (13, 7), (8, 13)], r[2]); s.px(4, 4, r[3]); s.px(5, 4, r[3]); s.px(10, 10, r[1])
    return done(s)


def ic_drop():
    s = icon()
    b = ramp("#3f86e8", 4, hue_shift=16)
    s.polygon([(8, 2), (12, 9), (4, 9)], b[2]); s.circle(8, 10, 4, b[2], fill=True)
    s.px(6, 9, b[3]); s.px(6, 10, b[3]); s.px(10, 12, b[1])
    return done(s)


def ic_star():
    s = icon()
    y = ramp("#f2c230", 4, hue_shift=20)
    s.polygon([(8, 1), (10, 6), (15, 6), (11, 9), (13, 14), (8, 11), (3, 14), (5, 9), (1, 6), (6, 6)], y[2])
    s.px(8, 3, y[3]); s.px(7, 5, y[3]); s.px(11, 11, y[1])
    return done(s)


def ic_quest():
    s = icon()
    paper, rod = "#f2e6c0", "#a8743e"
    s.rect(4, 3, 11, 13, paper); s.line(4, 3, 4, 13, "#fffaf0"); s.line(11, 3, 11, 13, "#cdbf9f")
    s.rect(3, 2, 12, 3, rod); s.rect(3, 13, 12, 14, rod)
    s.rect(7, 5, 8, 9, "#e0302a"); s.rect(7, 11, 8, 11, "#e0302a")                  # "!"
    return done(s)


def ic_gate():
    s = icon()
    s.ellipse(2, 1, 13, 14, "#9a4fd0"); s.ellipse(3, 2, 12, 13, "#c88aff"); s.ellipse(5, 4, 10, 11, "#2a1a48")
    s.px(7, 6, "#7ff0ff"); s.px(9, 9, "#7ff0ff"); s.px(1, 4, "#c88aff"); s.px(14, 11, "#c88aff")
    return done(s)


def ic_chat():
    s = icon()
    s.rect(2, 3, 13, 10, "#f6f0e1"); s.polygon([(4, 10), (7, 10), (4, 13)], "#f6f0e1")
    s.px(5, 6, INK); s.px(8, 6, INK); s.px(11, 6, INK)
    return done(s)


ICONS = {
    "char": ic_char, "bag": ic_bag, "party": ic_party, "home": ic_home, "settings": ic_settings,
    "auto": ic_auto, "plus": ic_plus, "minus": ic_minus, "compass": ic_compass, "run": ic_run,
    "pin": ic_pin, "coin": ic_coin, "swords": ic_swords, "skull": ic_skull, "close": ic_close,
    "heart": ic_heart, "drop": ic_drop, "star": ic_star, "chat": ic_chat, "quest": ic_quest, "gate": ic_gate,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    pieces = {name: frame(t) for name, t in THEMES.items()}
    for name in ("btn", "btn-primary", "btn-blue", "btn-danger", "btn-dark"):
        pieces[f"{name}-down"] = frame(THEMES[name], pressed=True)
    pieces["well"] = well()
    for name, (edge, glow) in SYS_FRAMES.items():
        pieces[name] = sys_frame(edge, glow)
    pieces["selected"] = selected()
    for name, s in pieces.items():
        s.save_png(os.path.join(OUT, f"{name}.png"))
    icons = {}
    for name, fn in ICONS.items():
        s = fn()
        s.save_png(os.path.join(OUT, f"i-{name}.png"))
        icons[name] = s.composite(1)

    # Review sheet: 9-slices stretched like CSS does, and icons at 2x / 6x.
    Z = 6
    sheet = Image.new("RGBA", (980, 560), (70, 110, 80, 255))
    d = ImageDraw.Draw(sheet)
    x = 10
    for name, s in pieces.items():
        im = s.composite(1)
        w, h = 68, 32  # stretch the centre like border-image
        big = Image.new("RGBA", (w, h))
        c = SL
        for (sx0, sx1, dx0, dx1) in ((0, c, 0, c), (c, N - c, c, w - c), (N - c, N, w - c, w)):
            for (sy0, sy1, dy0, dy1) in ((0, c, 0, c), (c, N - c, c, h - c), (N - c, N, h - c, h)):
                part = im.crop((sx0, sy0, sx1, sy1)).resize((dx1 - dx0, dy1 - dy0), Image.NEAREST)
                big.alpha_composite(part, (dx0, dy0))
        sheet.alpha_composite(big.resize((w * 2, h * 2), Image.NEAREST), (x, 10) if x < 900 else (x - 900, 90))
        d.text((x if x < 900 else x - 900, 78 if x < 900 else 158), name, fill=(255, 255, 255, 255))
        x += 150
    y0 = 200
    for i, (name, im) in enumerate(icons.items()):
        cx, cy = 10 + (i % 10) * 96, y0 + (i // 10) * 130
        sheet.alpha_composite(im.resize((32 * 2, 32 * 2), Image.NEAREST), (cx, cy))
        sheet.alpha_composite(im, (cx + 66, cy + 32))
        d.text((cx, cy + 70), name, fill=(255, 255, 255, 255))
    sheet.save(os.path.join(HERE, "preview.png"))
    print("OK", len(pieces), "frames,", len(icons), "icons")


if __name__ == "__main__":
    main()
