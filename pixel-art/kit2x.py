"""
2x redraw helper for the 32-bit move (MASTER_SPEC §5C) — used by pixel-art/landmarks and
pixel-art/home, whose shapes were authored on the old 16-bit grid.

`Canvas2x` has the same drawing calls as pixelstudio.Sprite but takes old-grid coordinates and
RE-RASTERISES the shapes at 2x (ellipses, circles and polygons come out with finer curves, not
doubled pixels). Lines and single pixels keep their old on-screen weight (2x2). Use `.s` (the
real 2x Sprite) for 32-bit detail passes at full resolution.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(ROOT, ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite, ramp, mix  # noqa: E402,F401

K = 2


def hexrgb(c):
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))


class Canvas2x:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.s = Sprite(w * K, h * K)

    # --- drawing on the old grid -------------------------------------------------------------
    def px(self, x, y, c, only=None):
        self.s.rect(x * K, y * K, x * K + K - 1, y * K + K - 1, c, only=only)
        return self

    def rect(self, x0, y0, x1, y1, c, fill=True, only=None):
        x0, x1 = sorted((x0, x1))
        y0, y1 = sorted((y0, y1))
        if fill:
            self.s.rect(x0 * K, y0 * K, x1 * K + K - 1, y1 * K + K - 1, c, only=only)
        else:
            for a in ((x0, y0, x1, y0), (x0, y1, x1, y1), (x0, y0, x0, y1), (x1, y0, x1, y1)):
                self.line(*a, c, only=only)
        return self

    def line(self, x0, y0, x1, y1, c, only=None):
        for dx in range(K):
            for dy in range(K):
                self.s.line(x0 * K + dx, y0 * K + dy, x1 * K + dx, y1 * K + dy, c, only=only)
        return self

    def ellipse(self, x0, y0, x1, y1, c, fill=True, only=None):
        X0, Y0, X1, Y1 = x0 * K, y0 * K, x1 * K + K - 1, y1 * K + K - 1
        self.s.ellipse(X0, Y0, X1, Y1, c, fill=fill, only=only)
        if not fill:
            # Keep the old ring weight (a 1 px ring on the old grid = 2 px here), with the finer curve.
            self.s.ellipse(X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, c, fill=False, only=only)
        return self

    def circle(self, cx, cy, r, c, fill=False, only=None):
        return self.ellipse(cx - r, cy - r, cx + r, cy + r, c, fill=fill, only=only)

    def polygon(self, pts, c, fill=True, only=None):
        self.s.polygon([(x * K + (K - 1) / 2, y * K + (K - 1) / 2) for x, y in pts], c, fill=fill, only=only)
        return self

    def get(self, x, y):
        return self.s.get(x * K, y * K)

    def layer(self, name):
        self.s.layer(name)
        return self

    # --- textures: the box is scaled, the pattern runs at full 2x resolution ------------------
    def _box(self, x0, y0, x1, y1):
        return x0 * K, y0 * K, x1 * K + K - 1, y1 * K + K - 1

    def gradient_dither(self, x0, y0, x1, y1, colors, **kw):
        self.s.gradient_dither(*self._box(x0, y0, x1, y1), colors, **kw)
        return self

    def dither(self, x0, y0, x1, y1, c1, c2, mix=0.5, **kw):
        self.s.dither(*self._box(x0, y0, x1, y1), c1, c2, mix, **kw)
        return self

    def noise(self, x0, y0, x1, y1, c, density=0.12, seed=0, **kw):
        self.s.noise(*self._box(x0, y0, x1, y1), c, density=density, seed=seed, **kw)
        return self

    def save_png(self, path, **kw):
        return self.s.save_png(path, **kw)

    def outline(self, c, where="outside"):
        self.s.outline(c, where=where)
        return self

    def composite(self, frame=None):
        return self.s.composite(frame)


def selout(s, dark, lit=None):
    """Selective outline on a full-res Sprite: dark inside edge, top edge lifted to `lit`."""
    s.outline(dark, where="inside")
    if not lit:
        return s
    img = s._img()
    w, h = img.size
    px = img.load()
    d = hexrgb(dark) + (255,)
    L = hexrgb(lit) + (255,)
    for y in range(h):
        for x in range(w):
            if px[x, y] != d:
                continue
            if y == 0 or px[x, y - 1][3] == 0 or ((x == 0 or px[x - 1, y][3] == 0) and y < h * 0.5):
                px[x, y] = L
    return s


def _shade(rgb, k):
    """k > 0 lightens toward a warm white, k < 0 darkens toward a cool blue-black (hue-shifted)."""
    r, g, b = rgb
    if k > 0:
        tr, tg, tb = 255, 246, 220
    else:
        tr, tg, tb = 20, 18, 48
        k = -k
    return (round(r + (tr - r) * k), round(g + (tg - g) * k), round(b + (tb - b) * k), 255)


def bevel(s, light=0.2, dark=0.22, skip=()):
    """32-bit panel pass: every flat colour region gets a 1 px lit top/left edge and a shaded
    bottom/right edge (like pressed metal / carved wood). `skip` = colours to leave untouched."""
    img = s._img()
    w, h = img.size
    src = img.copy().load()
    px = img.load()
    skip_rgb = {hexrgb(c) for c in skip}
    none = (0, 0, 0, 0)
    for y in range(h):
        for x in range(w):
            c = src[x, y]
            if c[3] == 0 or c[:3] in skip_rgb:
                continue
            up = src[x, y - 1] if y > 0 else none
            left = src[x - 1, y] if x > 0 else none
            down = src[x, y + 1] if y < h - 1 else none
            right = src[x + 1, y] if x < w - 1 else none
            if (up[3] and up[:3] != c[:3]) or (left[3] and left[:3] != c[:3]):
                px[x, y] = _shade(c[:3], light)
            elif (down[3] and down[:3] != c[:3]) or (right[3] and right[:3] != c[:3]):
                px[x, y] = _shade(c[:3], -dark)


def rim(s, color, y_from=0.3, y_to=0.97):
    """Cool reflected light one pixel inside the right silhouette edge."""
    img = s._img()
    w, h = img.size
    px = img.load()
    for y in range(int(h * y_from), int(h * y_to)):
        for x in range(w - 1, 0, -1):
            if px[x, y][3]:
                if px[x - 1, y][3]:
                    s.px(x - 1, y, color)
                break
