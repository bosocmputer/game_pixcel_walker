"""32-bit medium monsters (batch 2): old 32-56 px grid x2. See kit32.py for the style rules."""
from kit32 import EYE_W, INK, R, body, cut, disc, eye, finish, k, mix, outline, sp


def scarecrow():
    s = sp(40, 48)
    w = R("#a8743e", 7, 14)
    straw = R("#e8c860", 7, 20)
    cloth = R("#4f7fa0", 7, 18)
    s.rect(36, 40, 43, 92, w[2]); s.rect(36, 40, 38, 92, w[3]); s.rect(42, 40, 43, 92, w[1])      # pole
    s.rect(6, 44, 73, 49, w[2]); s.line(6, 44, 73, 44, w[4]); s.line(6, 49, 73, 49, w[1])           # crossbar
    for x in (4, 72):                                                                              # straw hands
        for i in range(6):
            s.line(x, 46, x + (i - 3) * 2 // 1 if x < 40 else x + (3 - i) * 2, 56 + i % 3, straw[2 + i % 3])
    s.polygon(k((10, 22), (29, 22), (31, 38), (8, 38)), cloth[2])                                  # shirt
    s.polygon(k((10, 22), (16, 22), (12, 38), (8, 38)), cloth[3], only=cloth[2])
    s.polygon(k((24, 22), (29, 22), (31, 38), (26, 38)), cloth[1], only=cloth[2])
    for y in range(48, 76, 6):
        s.line(22, y, 56, y + 1, cloth[1], only=cloth[2])                                          # weave
    s.rect(44, 54, 53, 63, "#c8583a"); s.rect(45, 55, 52, 56, "#e87a5a")                           # patch + stitches
    for x in range(44, 54, 3):
        s.px(x, 53, INK); s.px(x, 64, INK)
    for x in range(18, 62, 4):                                                                     # straw hem
        s.line(x, 76, x - 1, 81, straw[2 + (x // 4) % 3])
    disc(s, 20, 14, 7.5, R("#e0d0a8", 7, 12), soft=True)                                           # sack head
    for x in range(30, 50, 3):
        s.px(x, 38, "#8a6a4a")                                                                     # stitched mouth
    s.line(30, 35, 49, 35, "#5a3a2a")
    for ex in (32, 46):                                                                            # button eyes (with thread cross)
        s.circle(ex, 26, 3, INK, fill=True); s.circle(ex, 26, 2, "#3a3a58", fill=True)
        s.px(ex - 1, 25, "#9a9ac8"); s.px(ex + 1, 27, "#9a9ac8")
    s.polygon(k((8, 9), (32, 9), (27, 6), (24, 1), (16, 1), (13, 6)), straw[3])                   # straw hat
    s.polygon(k((24, 1), (27, 6), (32, 9), (22, 9)), straw[2], only=straw[3])
    s.line(16, 18, 64, 18, straw[1]); s.rect(28, 10, 52, 13, "#c8342a"); s.line(28, 10, 52, 10, "#e85a4a")
    for x in range(18, 64, 5):
        s.px(x, 20, straw[4])
    return finish(s, "#3a2a1a", straw[4])


def leaf_sprite():
    s = sp(40, 44)
    g = R("#58b83a", 7, 22)
    for box, vein in (((6, 14, 34, 46), (20, 18, 24, 42)), ((46, 14, 74, 46), (60, 18, 56, 42))):   # leaf wings
        s.ellipse(*box, g[2]); s.ellipse(box[0] + 2, box[1] + 2, box[2] - 8, box[3] - 10, g[3], only=g[2])
        s.line(*vein, g[1])
    s.polygon(k((20, 6), (29, 20), (26, 34), (20, 38), (14, 34), (11, 20)), g[3])                 # body leaf
    s.polygon(k((20, 6), (22, 20), (20, 38), (14, 34), (11, 20)), g[4], only=g[3])
    s.polygon(k((22, 20), (29, 20), (26, 34), (20, 38)), g[2], only=g[3])
    s.line(40, 16, 40, 72, g[1])
    for y in range(24, 70, 8):
        s.line(40, y, 32, y - 5, g[2], only=g[4]); s.line(40, y, 48, y - 5, g[1], only=g[3])
    disc(s, 20, 20, 5.5, R("#f4e0b8", 7, 12), soft=True)                                           # face
    eye(s, 17, 19, iris="#2a4a1a", size=3); eye(s, 21.5, 19, iris="#2a4a1a", size=3)
    s.line(38, 47, 41, 47, "#e8707a"); s.px(33, 45, "#ffb0b8"); s.px(46, 45, "#ffb0b8")
    s.line(40, 2, 40, 12, "#7a5a2a"); s.ellipse(41, 0, 48, 5, g[4])                               # sprout
    for x, y in ((12, 64), (66, 68), (16, 80)):
        s.px(x, y, "#d8ffb0"); s.px(x + 1, y + 1, "#b6f28c")
    return finish(s, "#1f4a1a", g[4])


def tuktuk():
    s = sp(48, 40)
    b = R("#3aa0c8", 7, 20)
    roof = R("#c8342a", 7, 16)
    chrome = R("#c9d2dc", 6, 8)
    s.polygon(k((4, 6), (34, 6), (38, 10), (4, 10)), roof[3]); s.line(8, 12, 68, 12, roof[5]); s.rect(8, 18, 76, 21, roof[1])
    for x in range(10, 72, 6):
        s.rect(x, 21, x + 2, 24, "#f6f0e1")                                                        # fringe
    for x in (10, 56):
        s.rect(x, 20, x + 2, 54, chrome[2]); s.line(x, 20, x, 54, chrome[4])
    s.rect(*k(6, 18, 28, 28), b[3]); s.rect(12, 36, 24, 57, b[4], only=b[3]); s.rect(44, 36, 57, 57, b[2], only=b[3])
    s.rect(16, 26, 52, 36, "#2a1f3a"); s.rect(18, 28, 50, 32, "#4a3a5a")                          # dark cabin + bench
    for ex in (30, 40):
        s.rect(ex, 28, ex + 3, 30, "#b8f0ff"); s.px(ex, 28, "#ffffff")                             # ghost eyes in the cabin
    s.polygon(k((28, 16), (38, 18), (44, 26), (44, 30), (28, 30)), b[3])
    s.polygon([(56, 32), (76, 36), (88, 52), (88, 60), (70, 60)], b[2], only=b[3])
    s.polygon(k((33, 12), (37, 12), (39, 17), (33, 17)), "#1f2a3a"); s.line(68, 26, 74, 26, "#5a7aa8")   # windscreen
    s.circle(86, 44, 4, "#f2e25a", fill=True); s.circle(85, 43, 2, "#ffffff", fill=True)          # headlight
    s.line(86, 48, 88, 48, "#fff6c8")
    for cx in (20, 80):
        s.circle(cx, 64, 8, "#2a2a34", fill=True); s.circle(cx, 64, 5, "#3a3a48", fill=True)
        s.circle(cx, 64, 2, chrome[3], fill=True); s.px(cx - 1, 63, "#ffffff"); s.line(cx - 6, 58, cx - 2, 57, "#5a5a6a")
    for x, y in ((2, 32), (4, 48), (92, 20)):
        s.px(x, y, "#c8b0ff"); s.px(x + 1, y + 1, "#8a78d8")
    return finish(s, INK, None)


def songthaew():
    s = sp(56, 40)
    r = R("#d23a30", 7, 18)
    s.rect(*k(4, 8, 36, 30), r[3]); s.rect(8, 16, 72, 21, r[4]); s.line(8, 16, 72, 16, r[5]); s.rect(8, 50, 72, 61, r[2])
    s.polygon(k((36, 14), (46, 14), (52, 22), (52, 30), (36, 30)), r[3]); s.polygon([(72, 44), (104, 44), (104, 61), (72, 61)], r[2], only=r[3])
    s.line(72, 28, 92, 28, r[5])
    for x in range(14, 68, 14):                                                                   # rear windows w/ passengers' glow
        s.rect(x, 24, x + 9, 36, "#2a1f2a"); s.line(x + 1, 25, x + 8, 25, "#4a3a4a"); s.px(x + 4, 32, "#ffb0a0")
    s.rect(80, 32, 94, 42, "#2a1f2a"); s.line(81, 33, 93, 33, "#5a4a6a")
    for ex in (84, 90):                                                                           # angry headlight eyes
        s.rect(ex, 34, ex + 2, 36, "#f2e25a"); s.px(ex, 34, "#ffffff")
    s.line(82, 32, 88, 34, r[0]); s.line(94, 32, 88, 34, r[0])
    for x in range(80, 104, 3):
        s.rect(x, 52, x + 1, 56, "#f6f0e1")                                                       # grill teeth
    s.rect(100, 46, 104, 50, "#fff1a8")
    s.rect(4, 40, 8, 60, r[1])
    for cx in (24, 88):
        s.circle(cx, 64, 10, "#2a2a34", fill=True); s.circle(cx, 64, 6, "#3a3a48", fill=True); s.circle(cx, 64, 3, "#9aa4b0", fill=True); s.px(cx - 1, 63, "#ffffff")
    return finish(s, INK, None)


def lantern():
    s = sp(40, 48)
    p = R("#f5c060", 7, 24)
    f = R("#ff8a3a", 6, 20)
    for x, y in ((6, 20), (72, 28), (10, 60), (70, 72), (4, 40), (76, 52)):
        s.px(x, y, "#fff1a8"); s.px(x, y + 1, p[3])
    s.polygon(k((10, 6), (30, 6), (33, 32), (7, 32)), p[3])
    s.polygon(k((10, 6), (17, 6), (14, 32), (7, 32)), p[5], only=p[3])
    s.polygon(k((26, 6), (30, 6), (33, 32), (29, 32)), p[2], only=p[3])
    s.ellipse(28, 24, 54, 50, p[4], only=p[3]); s.ellipse(34, 30, 48, 44, p[5], only=p[4])      # inner flame glow
    for y in (24, 38, 52):
        s.line(18, y, 62, y, p[1], only="opaque")                                                # ribs
    s.rect(18, 8, 62, 12, "#c8342a"); s.line(18, 8, 62, 8, "#e85a4a"); s.rect(16, 64, 64, 68, "#c8342a"); s.line(16, 64, 64, 64, "#e85a4a")
    s.polygon([(34, 72), (46, 72), (40, 88)], f[2]); s.polygon([(36, 72), (44, 72), (40, 82)], f[4]); s.polygon([(38, 72), (42, 72), (40, 78)], "#fff6c8")
    for ex in (26, 47):                                                                           # face: big glossy eyes
        s.ellipse(ex, 30, ex + 6, 38, INK); s.rect(ex + 1, 31, ex + 2, 33, "#ffffff"); s.px(ex + 4, 36, "#8a8aa8")
    for x in (22, 56):
        s.ellipse(x, 40, x + 4, 42, "#ff9a7a")                                                   # blush
    s.polygon([(34, 44), (46, 44), (40, 50)], "#8a3a2a"); s.line(36, 45, 44, 45, "#c8584a")
    return finish(s, "#6a3a10", p[5])


def bat():
    s = sp(44, 36)
    b = R("#5a3a8a", 7, 22)
    neon = "#3af2f0"
    for wing, col in (([(40, 28), (4, 8), (12, 24), (2, 36), (16, 40), (12, 52), (36, 44)], b[2]),
                      ([(48, 28), (84, 8), (76, 24), (86, 36), (72, 40), (76, 52), (52, 44)], b[1])):
        s.polygon(wing, col)
    for pts in (((4, 8), (12, 24), (2, 36), (16, 40), (12, 52)), ((84, 8), (76, 24), (86, 36), (72, 40), (76, 52))):
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            s.line(x0, y0, x1, y1, neon)
        for (x, y) in pts:
            s.line(x, y, 44, 30, b[3] if x < 44 else b[0], only="opaque")                          # wing bones
    body(s, 16, 10, 28, 26, b)
    s.polygon([(34, 22), (36, 8), (42, 20)], b[3]); s.polygon([(46, 20), (52, 8), (54, 22)], b[2])  # ears
    for ex in (38, 48):
        s.rect(ex, 30, ex + 3, 32, "#ff3aa8"); s.px(ex, 30, "#ffd0f0")
    s.px(40, 40, EYE_W); s.px(48, 40, EYE_W); s.px(40, 41, EYE_W); s.px(48, 41, EYE_W)              # fangs
    return finish(s, INK, None)


def python_():
    s = sp(48, 36)
    b = R("#b89a5a", 7, 16)
    dark = "#5a3f22"
    body(s, 4, 15, 36, 32, b)
    s.ellipse(20, 42, 60, 54, b[1]); s.ellipse(22, 43, 58, 52, b[2], only=b[1])                  # inner coil
    s.ellipse(24, 42, 56, 50, b[0], only=b[1])
    for x, y in ((16, 36), (28, 32), (44, 32), (60, 38), (64, 52), (48, 60), (28, 60), (14, 52)):   # pattern
        s.ellipse(x, y, x + 6, y + 3, dark); s.px(x + 2, y + 1, "#8a6a42")
    s.polygon(k((28, 16), (34, 8), (40, 6), (45, 9), (44, 13), (36, 14), (32, 18)), b[3])
    s.polygon([(60, 18), (68, 12), (80, 12), (86, 18), (72, 24)], b[4], only=b[3])
    eye(s, 41, 7.5, iris="#f2d23a", size=2)
    s.line(90, 22, 94, 20, "#e53935"); s.line(90, 22, 94, 24, "#e53935")                         # tongue
    return finish(s, "#3a2a14", b[4])


def lizard():
    s = sp(48, 32)
    r = R("#c8502a", 7, 20)
    ember = R("#ffb347", 6, 22)
    for i in range(22):
        y = 34 + i // 3
        s.rect(20 - i, y, 21 - i, y + 2, r[2] if i % 3 else r[3])
    body(s, 10, 11, 34, 24, r)
    disc(s, 37.5, 14, 6, r)
    for x in (26, 38, 50):                                                                         # ember spines
        s.polygon([(x, 23), (x + 4, 11), (x + 8, 23)], ember[2]); s.polygon([(x + 2, 21), (x + 4, 15), (x + 6, 21)], ember[4]); s.px(x + 4, 13, "#fff6c8")
    eye(s, 39, 11.5, iris="#f2e25a", size=3)
    s.line(82, 32, 88, 32, r[0])
    for x in (28, 56):
        s.line(x, 44, x - 4, 54, r[1]); s.line(x - 7, 54, x, 54, r[0])
    for x, y in ((92, 28), (94, 24), (90, 20)):
        s.px(x, y, ember[3]); s.px(x, y - 1, "#fff1a8")
    return finish(s, "#4a1a0a", r[4], rim_color="#ffb080")


def krasue():
    s = sp(40, 48)
    hair = R("#2a2438", 7, 12)
    skin = R("#f0d0b0", 7, 12)
    glow = R("#7affb0", 6, 20)
    for i in range(14):                                                                            # ghost light trail
        s.circle(40 + (i % 3) - 1, 54 + i * 3, max(1, 7 - i // 2), glow[max(0, 4 - i // 3)], fill=True)
    s.circle(40, 56, 4, "#ffffff", fill=True)
    s.ellipse(*k(8, 3, 32, 28), hair[2]); s.ellipse(18, 6, 50, 30, hair[3], only=hair[2])
    s.rect(16, 12, 24, 68, hair[2]); s.rect(56, 16, 64, 60, hair[1]); s.line(18, 14, 18, 64, hair[4]); s.line(58, 20, 58, 56, hair[2])
    disc(s, 20.5, 14, 8, skin, soft=True)
    for ex in (30, 46):                                                                            # glowing red eyes
        s.rect(ex, 24, ex + 4, 27, INK); s.rect(ex + 1, 25, ex + 3, 26, "#ff4a4a"); s.px(ex + 1, 25, "#ffd0d0")
    s.line(36, 36, 44, 36, "#b8404a"); s.px(37, 37, "#e87080")
    s.rect(24, 8, 56, 10, hair[4])
    return finish(s, "#0e0c16", hair[4])


def sapling():
    s = sp(40, 48)
    bark = R("#7a5a36", 7, 14)
    leaf = R("#4a9a3a", 7, 22)
    s.rect(28, 40, 51, 80, bark[3]); s.rect(28, 40, 34, 80, bark[4]); s.rect(46, 44, 51, 80, bark[1])
    for x in (36, 42):
        s.line(x, 44, x - 1, 78, bark[2])
    for x0, dx in ((28, -1), (51, 1)):                                                            # roots
        for i in range(10):
            s.px(x0 + dx * i, 80 + i // 3, bark[1]); s.px(x0 + dx * i, 81 + i // 3, bark[2])
    s.line(28, 52, 12, 40, bark[3]); s.line(28, 53, 12, 41, bark[2]); s.line(51, 52, 66, 36, bark[3]); s.line(51, 53, 66, 37, bark[1])
    disc(s, 20, 12, 10.5, leaf)
    disc(s, 6, 18, 3.5, leaf); disc(s, 33, 16, 3.5, leaf)
    for x, y in ((26, 14), (44, 10), (34, 30), (50, 26)):
        s.px(x, y, leaf[6]); s.px(x + 1, y, leaf[5])
    for ex in (32, 44):                                                                           # face in the bark
        s.rect(ex, 54, ex + 3, 57, "#f2d23a"); s.px(ex, 54, "#fff6c8")
    s.line(34, 66, 44, 66, bark[0]); s.px(33, 65, bark[0]); s.px(45, 65, bark[0])
    return finish(s, "#2a1a0a", leaf[4])


def wraith():
    s = sp(40, 48)
    m = R("#c8d0e0", 7, 16)
    s.polygon(k((20, 3), (31, 10), (33, 30), (37, 44), (28, 40), (22, 46), (16, 40), (7, 44), (9, 30), (9, 10)), m[2])
    s.polygon(k((20, 3), (30, 10), (31, 30), (22, 40), (12, 38), (11, 10)), m[3], only=m[2])
    s.polygon(k((20, 3), (24, 8), (15, 30), (12, 30), (11, 10)), m[5], only=m[3])
    for x in range(24, 60, 8):                                                                     # robe folds
        s.line(x, 60, x + 2, 84, m[1], only="opaque"); s.line(x + 1, 60, x + 3, 84, m[4], only="opaque")
    s.ellipse(*k(13, 10, 27, 24), "#1c2038"); s.ellipse(30, 24, 50, 44, "#2a3048", only="opaque")   # hood darkness
    for ex in (33, 44):
        s.rect(ex, 30, ex + 3, 32, "#7ad8ff"); s.px(ex, 30, "#e0f8ff"); s.px(ex + 1, 33, "#3a6a98")
    for x, y in ((8, 60), (72, 40), (4, 80), (76, 72)):
        s.px(x, y, m[5]); s.px(x + 1, y, m[3]); s.px(x, y + 1, m[3])
    return finish(s, "#3a4058", m[5])


def elephant():
    s = sp(56, 48)
    st = R("#8a8e96", 7, 12)
    moss = R("#6aa84a", 5, 20)
    for x in (16, 32, 52, 68):                                                                      # legs
        s.rect(x, 68, x + 11, 88, st[2]); s.rect(x, 68, x + 3, 88, st[3]); s.rect(x, 86, x + 11, 88, st[0])
        s.line(x + 2, 84, x + 9, 84, st[4])                                                          # toenails
    body(s, 4, 11, 40, 38, st)
    disc(s, 42, 18, 11, st)
    s.ellipse(*k(30, 10, 40, 30), st[1]); s.ellipse(62, 22, 78, 56, st[2], only=st[1]); s.ellipse(64, 24, 72, 40, st[3], only=st[2])   # ear
    s.polygon(k((48, 22), (53, 30), (54, 42), (50, 44), (49, 32), (45, 26)), st[3])              # trunk
    for y in range(58, 86, 5):
        s.line(98, y, 106, y, st[1], only=st[3])
    s.polygon([(92, 50), (84, 64), (86, 66), (94, 54)], "#f2ecd8"); s.line(93, 52, 86, 64, "#d8d0b8")   # tusk
    eye(s, 44, 15, glow="#f2c230", size=3)
    for x0, y0, x1, y1 in ((24, 32, 32, 44), (32, 44, 30, 50), (44, 52, 40, 62), (72, 60, 76, 68)):
        s.line(x0, y0, x1, y1, st[0]); s.line(x0 + 1, y0, x1 + 1, y1, st[4])                      # cracks
    for x, y, w in ((18, 24, 8), (40, 22, 10), (86, 16, 6)):                                       # moss
        s.ellipse(x, y, x + w, y + 4, moss[2]); s.line(x + 1, y, x + w - 2, y, moss[4])
    s.polygon(k((1, 22), (4, 20), (4, 24)), st[2])
    return finish(s, "#2a2c34", st[5], rim_color="#b8c8e0")


def mannequin():
    s = sp(32, 48)
    body_r = R("#f0e8dc", 7, 8)
    dress = R("#d23a5a", 7, 20)
    s.rect(20, 88, 44, 92, "#6a6470"); s.line(20, 88, 44, 88, "#9a94a0"); s.rect(31, 76, 33, 88, "#6a6470")   # stand
    s.polygon(k((10, 15), (22, 15), (25, 38), (7, 38)), dress[3])
    s.polygon(k((10, 15), (14, 15), (11, 38), (7, 38)), dress[5], only=dress[3])
    s.polygon(k((19, 15), (22, 15), (25, 38), (20, 38)), dress[1], only=dress[3])
    for y in (52, 62, 72):
        s.line(16, y, 48, y, dress[2], only=dress[3]); s.line(16, y - 1, 48, y - 1, dress[4], only=dress[3])   # ruffles
    s.rect(30, 26, 34, 30, body_r[2])
    disc(s, 16, 8, 5.5, body_r, soft=True)
    for dx in (0, 1):                                                                             # stiff arms (2 px)
        s.line(20 + dx, 32, 10 + dx, 56, body_r[3 + dx]); s.line(44 + dx, 32, 54 + dx, 52, body_r[2 - dx])
    s.rect(48, 44, 56, 54, "#f2c230"); s.line(48, 44, 56, 44, "#fff1a8"); s.px(52, 48, INK); s.line(50, 51, 54, 51, "#c8342a")   # price tag
    s.line(28, 16, 30, 16, body_r[1]); s.line(34, 16, 36, 16, body_r[1])                         # blank closed eyes
    return finish(s, "#3a2a34", body_r[5])


def dummy(armored=False):
    s = sp(32, 44)
    w = R("#a8743e", 7, 14)
    m = R("#9aa4b0", 7, 10)
    straw = R("#e8d8b0", 7, 14)
    s.rect(28, 32, 35, 84, w[3]); s.line(28, 32, 28, 84, w[5]); s.line(35, 32, 35, 84, w[1])
    s.rect(12, 36, 51, 41, w[3]); s.line(12, 36, 51, 36, w[5]); s.line(12, 41, 51, 41, w[1])
    torso = m if armored else w
    body(s, 8, 18, 23, 34, torso)
    for y in range(40, 66, 6):
        s.line(20, y, 44, y, torso[1], only=torso[2])                                              # rope / plate lines
    disc(s, 16, 10, 6.5, m if armored else straw, soft=not armored)
    s.circle(32, 52, 8, "#e53935", fill=True); s.circle(32, 52, 5, "#f6f0e1", fill=True); s.circle(32, 52, 2, "#e53935", fill=True)   # target
    if armored:
        for x in (20, 42):
            s.circle(x, 44, 1, m[5], fill=True); s.circle(x, 60, 1, m[5], fill=True)                 # rivets
        s.rect(24, 18, 40, 20, INK); s.line(24, 18, 40, 18, m[0])                                    # visor slit
    s.rect(20, 84, 43, 87, w[1]); s.line(20, 84, 43, 84, w[3])
    return finish(s, INK, None)


SPRITES = {
    "mob_scarecrow": scarecrow, "mob_leaf": leaf_sprite, "mob_tuktuk": tuktuk, "mob_songthaew": songthaew,
    "mob_lantern": lantern, "mob_bat": bat, "mob_python": python_, "mob_lizard": lizard, "mob_krasue": krasue,
    "mob_sapling": sapling, "mob_wraith": wraith, "mob_elephant": elephant, "mob_mannequin": mannequin,
    "mob_dummy": lambda: dummy(False), "mob_dummy_armored": lambda: dummy(True),
}
