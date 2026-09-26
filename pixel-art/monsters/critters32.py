"""32-bit critters (batch 1): 64 px class (old 32-40 px grid x2). See kit32.py for the style rules."""
from kit32 import EYE_W, INK, R, body, cut, disc, eye, finish, k, mix, outline, sp


def slime():
    s = sp(32, 32)
    b = R("#3fb6e8", 7, 24)
    s.ellipse(6, 20, 57, 60, b[2]); s.rect(8, 46, 55, 59, b[2], only="opaque"); s.ellipse(4, 44, 59, 61, b[2])
    s.ellipse(30, 38, 62, 64, b[1], only=b[2]); s.ellipse(8, 54, 56, 64, b[1], only=b[2])
    s.ellipse(40, 48, 64, 66, b[0], only=b[1])
    s.ellipse(8, 20, 47, 50, b[3], only=b[2]); s.ellipse(11, 22, 38, 42, b[4], only=b[3]); s.ellipse(14, 23, 30, 34, b[5], only=b[4])
    s.ellipse(22, 48, 42, 58, b[3], only="opaque"); s.ellipse(26, 50, 38, 56, b[4], only="opaque")   # glow from inside
    for cx, cy, r in ((44, 40, 3), (18, 50, 2), (36, 29, 2), (50, 51, 2)):
        s.circle(cx, cy, r, b[5], fill=True, only="opaque"); s.px(cx - 1, cy - 1, b[6], only="opaque")
    s.ellipse(15, 25, 21, 29, b[6], only="opaque"); s.rect(25, 23, 28, 24, b[6], only="opaque")
    for ex in (27, 41):
        s.ellipse(ex - 4, 33, ex + 3, 43, EYE_W); s.ellipse(ex - 3, 35, ex + 3, 43, "#1c2f6a")
        s.ellipse(ex - 2, 36, ex + 2, 42, "#2a4ab0"); s.rect(ex - 2, 36, ex - 1, 37, "#ffffff"); s.px(ex + 1, 40, "#c8e8ff")
    s.line(32, 46, 36, 46, "#1c2f6a"); s.px(31, 45, "#1c2f6a"); s.px(37, 45, "#1c2f6a")
    for x in (21, 22, 45, 46):
        s.px(x, 45, "#ff9ac8")
    return finish(s, b[0], b[3], rim_color="#8ae8ff")


def pigeon():
    s = sp(32, 32)
    g = R("#9aa0b4", 7, 16)
    neck = R("#5fb0a0", 5, 30)
    s.polygon(k((2, 16), (7, 13), (7, 20)), g[1])                               # tail
    for y in (28, 32, 36):
        s.line(6, y, 13, y + 2, g[0])
    body(s, 5, 12, 23, 25, g)
    s.ellipse(*k(6, 16, 16, 23), g[2], only="opaque")                              # wing
    s.ellipse(*k(6, 18, 16, 24), g[1], only=g[2])
    for i, y in enumerate((38, 42, 46)):
        s.line(14 + i * 2, y, 32 - i, y, g[0], only="opaque")                      # feather rows
        s.line(15 + i * 2, y - 1, 30 - i, y - 1, g[3], only="opaque")
    disc(s, 22, 11, 4.5, g)
    s.rect(*k(19, 14, 23, 16), neck[2]); s.rect(38, 28, 44, 29, neck[3]); s.px(41, 31, "#b07ad0"); s.px(43, 30, "#b07ad0")
    s.polygon([(52, 20), (59, 22), (52, 25)], "#e8b870"); s.line(52, 22, 58, 22, "#b88a50")   # beak
    eye(s, 23, 10, iris="#d8402a", size=3)
    for x in (24, 32):
        s.line(x, 50, x, 56, "#e0785a"); s.line(x - 2, 57, x + 3, 57, "#e0785a")   # feet
    return finish(s, g[0], g[3], rim_color="#c8d8ff")


def rat():
    s = sp(32, 32)
    b = R("#8a6a52", 7, 16)
    pink = R("#e8a0b0", 5, 12)
    for i in range(18):                                                             # curly tail
        x = 12 - i // 2
        y = 44 - i + (i * i) // 22
        s.rect(x, y, x + 1, y + 1, pink[2] if i % 4 else pink[3])
    body(s, 6, 13, 24, 26, b)
    s.polygon(k((20, 14), (29, 20), (20, 25)), b[3])                               # snout
    s.polygon([(46, 38), (58, 40), (46, 48)], b[1], only=b[3])
    s.circle(58, 40, 2, pink[2], fill=True); s.px(58, 39, pink[4])
    disc(s, 19, 12, 3.2, pink)                                                     # ear
    s.circle(38, 25, 3, pink[1], fill=True)
    eye(s, 23, 16, iris="#c8202a", size=3)
    for x0 in (52, 52):
        s.line(x0, 44, 62, 42, b[0]); s.line(x0, 46, 62, 48, b[0])                 # whiskers
    for x in (20, 36):
        s.rect(x, 50, x + 5, 55, b[1]); s.rect(x, 54, x + 6, 55, pink[1])          # paws
    return finish(s, b[0], b[3], rim_color="#c8b0a0")


def cat():
    s = sp(32, 32)
    c = R("#3a3050", 7, 22)
    tail = [(14, 54), (10, 52), (8, 48), (6, 44), (6, 40), (8, 36), (10, 32), (10, 28), (8, 24)]
    for i, (x, y) in enumerate(tail):                                               # S-curve tail
        s.rect(x, y, x + 3, y + 3, c[2] if i % 3 else c[3])
    body(s, 6, 13, 22, 28, c)
    disc(s, 21, 11, 6.5, c)
    for pts, inner in ((((31, 14), (34, 2), (40, 10)), ((33, 12), (34, 6), (37, 10))), (((44, 10), (50, 2), (52, 14)), ((46, 10), (49, 6), (50, 12)))):
        s.polygon(pts, c[3]); s.polygon(inner, "#e89aa8")
    for ex in (36, 46):                                                             # gold cat eyes with slit pupils
        s.ellipse(ex, 19, ex + 4, 24, "#f2d23a"); s.line(ex + 2, 19, ex + 2, 24, INK); s.px(ex + 1, 20, "#fff6c8")
    s.px(42, 26, "#e89aa8"); s.px(41, 27, c[0]); s.px(43, 27, c[0])
    for x in (24, 34):
        s.rect(x, 52, x + 5, 57, c[1]); s.rect(x + 1, 56, x + 4, 57, c[3])
    return finish(s, "#0e0a18", c[3], rim_color="#8a7ac8")


def ant():
    s = sp(32, 32)
    r = R("#c8342a", 7, 18)
    helm = R("#6a7a3a", 5, 14)
    for x in (22, 28, 34):                                                          # legs
        s.line(x, 42, x - 6, 54, INK); s.line(x, 40, x + 4, 54, INK); s.line(x - 6, 54, x - 8, 54, INK)
    body(s, 2, 13, 11, 23, r)                                                       # abdomen
    for y in (32, 38):
        s.line(8, y, 20, y + 1, r[1], only="opaque")
    body(s, 11, 15, 18, 21, r)                                                      # thorax
    disc(s, 22, 16, 4.5, r)                                                         # head
    s.line(50, 36, 57, 40, INK); s.line(50, 38, 57, 44, INK); s.px(57, 40, "#f6e0c0"); s.px(57, 44, "#f6e0c0")   # mandibles
    s.line(44, 24, 50, 12, r[0]); s.line(46, 24, 56, 16, r[0]); s.px(50, 11, r[4]); s.px(56, 15, r[4])           # antennae
    eye(s, 23, 15, iris="#1c1a28", size=3)
    s.rect(36, 21, 50, 25, helm[2]); s.rect(38, 19, 48, 21, helm[3]); s.line(36, 25, 50, 25, helm[0])             # tiny army helmet
    s.px(43, 22, "#f2c230")
    return finish(s, "#2a0a0a", r[3])


def firefly():
    s = sp(32, 32)
    glow = R("#f2e25a", 7, 26)
    disc(s, 15, 17, 7, glow, shadow=False)                                         # glowing abdomen (lit from within)
    s.ellipse(20, 30, 44, 50, glow[3], only="opaque")
    s.circle(28, 34, 7, glow[5], fill=True, only="opaque")
    s.circle(27, 33, 4, glow[6], fill=True, only="opaque")
    s.circle(28, 34, 2, "#ffffff", fill=True, only="opaque")
    for i, y in enumerate((38, 43)):
        s.line(20 + i * 2, y, 40 - i * 2, y, glow[2], only="opaque")
    s.ellipse(30, 14, 48, 26, "#3a3050"); s.ellipse(32, 15, 40, 20, "#5a4a78", only="opaque")   # head
    eye(s, 22, 9, iris="#1c1a28", size=3)
    for box in ((16, 4, 32, 18), (34, 2, 50, 14)):                                  # wings (glassy)
        s.ellipse(*box, "#cfe6ff"); s.ellipse(box[0] + 2, box[1] + 2, box[2] - 5, box[3] - 5, "#f0f8ff", only="opaque")
    s.line(44, 14, 50, 6, "#3a3050"); s.line(42, 14, 44, 5, "#3a3050"); s.px(50, 5, glow[5]); s.px(44, 4, glow[5])
    for x, y in ((8, 20), (54, 36), (12, 52), (50, 54), (58, 22)):
        s.px(x, y, glow[6]); s.px(x + 1, y, glow[4])
    return finish(s, "#2a3a1a", None)


def gecko():
    s = sp(40, 32)
    b = R("#6a8fb0", 7, 20)
    spot = R("#f08a3a", 5, 16)
    for i in range(22):                                                             # tail
        y = 34 + i // 3
        s.rect(16 - i, y, 17 - i, y + 2, b[2] if i % 4 else b[3])
    body(s, 8, 11, 30, 22, b)
    disc(s, 32, 14, 5.2, b)
    for x, y in ((24, 28), (34, 34), (44, 26), (50, 36), (58, 30)):
        s.circle(x, y, 2, spot[2], fill=True); s.px(x - 1, y - 1, spot[4])
    eye(s, 33, 11, iris="#f2d23a", size=3)
    s.px(68, 26, INK); s.line(58, 32, 76, 32, b[0])
    for x in (24, 50):                                                              # sticky toes
        s.line(x, 42, x - 4, 52, b[1]); s.line(x - 7, 52, x, 52, b[3]); s.px(x - 7, 53, b[4]); s.px(x, 53, b[4])
    return finish(s, b[0], b[3], rim_color="#b8e0ff")


def carp():
    s = sp(40, 32)
    w = R("#f2ece0", 7, 10)
    o = R("#f07830", 7, 18)
    s.polygon(k((1, 9), (8, 15), (1, 22)), o[2]); s.polygon([(4, 20), (14, 30), (4, 34)], o[3], only=o[2])
    for y in (22, 28, 34):
        s.line(4, y, 12, 30, o[1])
    body(s, 6, 9, 33, 23, w)
    for box in ((20, 18, 40, 30), (44, 28, 60, 42), (48, 18, 58, 24)):              # koi patches
        s.ellipse(*box, o[3], only="opaque")
        s.ellipse(box[0] + 4, box[1] + 3, box[2], box[3], o[2], only=o[3])
    for x in range(20, 56, 5):                                                      # scales
        for y in range(24, 44, 5):
            s.px(x + (y // 5) % 2 * 2, y, w[2], only=w[3])
    s.polygon(k((17, 8), (23, 3), (25, 9)), o[2]); s.line(36, 16, 46, 8, o[4])     # dorsal fin
    s.polygon(k((18, 21), (22, 27), (24, 21)), w[2])
    eye(s, 29, 12, iris="#1c1a28", size=4)
    s.line(64, 34, 67, 34, o[0]); s.line(66, 36, 70, 38, "#c8a070")                 # mouth + whisker
    for x, y in ((70, 16), (74, 12), (72, 48)):
        s.circle(x, y, 1, "#8fc8ff"); s.px(x, y - 1, "#ffffff")
    return finish(s, "#6a3a1a", w[4])


def crab():
    s = sp(40, 32)
    c = R("#6a8a3a", 7, 18)
    claw = R("#b0602a", 7, 16)
    for x in (24, 34, 46, 56):                                                      # legs
        d = -1 if x < 40 else 1
        s.line(x, 48, x + d * 4, 58, c[0]); s.line(x + d * 4, 58, x + d * 6, 58, c[0])
    for cx in (10, 70):                                                             # claws
        disc(s, cx / 2, 12, 4.5, claw)
        cut(s, [(cx - 5, 14), (cx + 5, 14), (cx, 25)])                             # pincer gap
        s.px(cx - 3, 17, claw[5]); s.px(cx + 3, 17, claw[4])
    s.line(16, 32, 22, 38, c[2]); s.line(64, 32, 58, 38, c[2])
    body(s, 9, 12, 31, 26, c)
    for x in (24, 36, 48):                                                          # shell ridges
        s.line(x, 30, x + 6, 30, c[1], only="opaque"); s.line(x, 29, x + 6, 29, c[4], only="opaque")
    for ex in (32, 46):                                                             # eye stalks
        s.line(ex + 2, 24, ex + 1, 16, c[1]); s.ellipse(ex - 1, 10, ex + 5, 16, EYE_W); s.rect(ex + 1, 12, ex + 3, 15, INK); s.px(ex + 1, 12, "#ffffff")
    return finish(s, "#1a2a0a", c[3])


def dog_spirit():
    s = sp(44, 40)
    g = R("#8a92d8", 7, 24)
    wisp = R("#b8c0ff", 5, 18)
    for i in range(12):                                                             # wispy tail
        s.circle(14 - i, 36 - i, max(1, 4 - i // 4), [wisp[1], wisp[2], wisp[3]][i % 3], fill=True)
    for x in (22, 34, 46, 54):                                                      # legs fading into mist
        s.rect(x, 56, x + 5, 68, g[2]); s.rect(x, 56, x + 1, 68, g[3]); s.rect(x, 66, x + 5, 68, wisp[3])
    body(s, 8, 15, 30, 30, g)
    disc(s, 32.5, 15, 6.5, g)
    s.polygon([(54, 20), (56, 6), (64, 18)], g[2]); s.polygon([(57, 16), (57, 10), (61, 16)], g[4])                  # ears
    s.polygon([(68, 18), (74, 6), (76, 22)], g[1]); s.polygon([(70, 18), (73, 11), (74, 20)], g[3])
    s.polygon([(74, 30), (86, 32), (76, 38)], g[3]); s.circle(85, 32, 2, INK, fill=True)                            # muzzle + nose
    eye(s, 33, 12, glow="#7fffe0", size=3)
    s.line(76, 36, 80, 37, g[0])
    for x, y in ((6, 60), (80, 58), (4, 44), (84, 12)):                                                               # spirit motes
        s.px(x, y, wisp[4]); s.px(x + 1, y + 1, wisp[2])
    return finish(s, g[0], g[4], rim_color="#d8e0ff")


SPRITES = {
    "mob_slime": slime, "mob_pigeon": pigeon, "mob_rat": rat, "mob_cat": cat, "mob_ant": ant,
    "mob_firefly": firefly, "mob_gecko": gecko, "mob_carp": carp, "mob_crab": crab, "mob_dog": dog_spirit,
}
