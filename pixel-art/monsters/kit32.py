"""
32-bit drawing kit for the monster sheet (art direction 2026-09-25, pilot: pixel-art/style-32-pilot).

Monsters are designed on the old 16-bit layout grid and drawn at 2x (`K`), then refined with
32-bit detail at full resolution: 7-step hue-shifted ramps, a shadow crescent on the lower right,
restacked lights toward the top-left, specular hot spots, a cool rim light on the shadow edge,
glossy eyes and a selective outline (dark inside, lit side lifted).
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite, ramp, mix  # noqa: E402,F401

K = 2          # old design grid -> 32-bit pixels
INK = "#1c1a28"
EYE_W = "#f6f4ff"


def R(base, n=7, hs=22):
    """7-step ramp: 0 deepest shadow .. 6 hottest highlight."""
    return ramp(base, n, hue_shift=hs)


def sp(w, h):
    """Canvas sized on the old grid (w, h) -> 2x pixels."""
    return Sprite(w * K, h * K)


def k(*v):
    """Old-grid numbers -> 2x pixels. Points (tuples) are scaled too, for polygons."""
    return [tuple(round(c * K) for c in a) if isinstance(a, tuple) else round(a * K) for a in v]


def body(s, x0, y0, x1, y1, r, *, light=True, shadow=True, spec=True, soft=False):
    """A lit volume (old-grid box): silhouette, restacked lights to the top-left, shadow crescent.
    soft=True: faces / skin — one gentle shadow band only (the deep crescent reads as dirt on a face)."""
    r = list(r) + [r[-1]] * max(0, 7 - len(r))       # short ramps: repeat the top shade
    if soft:
        r = r[1:] + [r[-1]]                           # faces sit one step lighter overall
    X0, Y0, X1, Y1 = k(x0, y0, x1, y1)
    X1 += K - 1
    Y1 += K - 1
    w, h = X1 - X0, Y1 - Y0
    s.ellipse(X0, Y0, X1, Y1, r[2])
    if shadow and soft:
        s.ellipse(X0 + w * 0.68, Y0 + h * 0.6, X1 + w * 0.3, Y1 + h * 0.35, r[1], only=r[2])
    elif shadow:
        s.ellipse(X0 + w * 0.35, Y0 + h * 0.4, X1 + w * 0.2, Y1 + h * 0.25, r[1], only=r[2])
        s.ellipse(X0 + w * 0.55, Y0 + h * 0.62, X1 + w * 0.3, Y1 + h * 0.4, r[0], only=r[1])
    if light:
        s.ellipse(X0 + 1, Y0 + 1, X0 + w * 0.72, Y0 + h * 0.7, r[3], only=r[2])
        s.ellipse(X0 + w * 0.08, Y0 + h * 0.08, X0 + w * 0.5, Y0 + h * 0.46, r[4], only=r[3])
    if spec:
        cx, cy = X0 + w * 0.26, Y0 + h * 0.22
        s.ellipse(cx - w * 0.07, cy - h * 0.05, cx + w * 0.07, cy + h * 0.05, r[5], only=r[4])
        s.px(round(cx - w * 0.03), round(cy - h * 0.02), r[6], only=r[5])


def disc(s, cx, cy, rad, r, **kw):
    """body() for a circle given on the old grid."""
    body(s, cx - rad, cy - rad, cx + rad, cy + rad, r, **kw)


def eye(s, x, y, iris="#3a2a5a", size=3, glow=None):
    """Glossy eye at old-grid (x, y). size = full-res height of the white."""
    X, Y = k(x, y)
    if glow:
        s.rect(X - 1, Y - 1, X + size, Y + size - 1, glow)
        s.px(X, Y, "#ffffff")
        return
    s.ellipse(X - 1, Y - 1, X + size, Y + size, EYE_W)
    s.ellipse(X, Y, X + size - 1, Y + size, iris)
    s.px(X, Y, "#ffffff")
    s.px(X + size - 1, Y + size - 1, mix(iris, "#ffffff", 0.45))


def rim(s, color, y_from=0.35, y_to=0.95, inset=1):
    """Cool reflected light one pixel inside the right edge, on the lower part of the sprite."""
    img = s._img()
    w, h = img.size
    px = img.load()
    for y in range(int(h * y_from), int(h * y_to)):
        for x in range(w - 1, -1, -1):
            if px[x, y][3]:
                xi = x - inset
                if xi > 0 and px[xi, y][3]:
                    s.px(xi, y, color)
                break


def selout(s, dark, lit=None):
    """Selective outline: `dark` inside the silhouette edge; top edge (and upper-left) lifted to `lit`."""
    s.outline(dark, where="inside")
    if not lit:
        return s
    img = s._img()
    w, h = img.size
    px = img.load()
    d = tuple(int(dark[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    L = tuple(int(lit[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    for y in range(h):
        for x in range(w):
            if px[x, y] != d:
                continue
            up = y == 0 or px[x, y - 1][3] == 0
            left = x == 0 or px[x - 1, y][3] == 0
            if up or (left and y < h * 0.55):
                px[x, y] = L
    return s


def outline(s, color):
    """Plain outside outline (small/complex silhouettes read better with it)."""
    s.outline(color, where="outside")
    return s


def finish(s, dark, lit=None, rim_color=None):
    if rim_color:
        rim(s, rim_color)
    return selout(s, dark, lit)


def cut(s, points):
    """Erase a polygon (e.g. the gap between a crab's pincers)."""
    from PIL import Image, ImageDraw
    img = s._img()
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    m = mask.load()
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            if m[x, y]:
                s.px(x, y, None)
