"""32-bit bosses (batch 3): old 64-72 px grid x2 -> 128-144 px. See kit32.py for the style rules."""
from kit32 import EYE_W, INK, R, body, cut, disc, eye, finish, k, mix, sp


def goblin_king():
    s = sp(64, 64)
    g = R("#58b040", 7, 26)
    cape = R("#7a2aa0", 7, 22)
    gold = R("#f2c230", 7, 26)
    club = R("#e8a078", 7, 16)
    leather = R("#8a5a34", 6, 14)
    s.polygon(k((14, 24), (40, 22), (50, 60), (6, 60)), cape[2])                                    # cape
    s.polygon(k((14, 24), (26, 23), (18, 60), (6, 60)), cape[4], only=cape[2])
    s.polygon(k((34, 23), (40, 22), (50, 60), (38, 60)), cape[1], only=cape[2])
    for x in range(16, 100, 9):
        s.line(x, 64, x + 3, 118, cape[0], only="opaque"); s.line(x + 1, 64, x + 4, 118, cape[3], only="opaque")
    s.rect(12, 116, 100, 120, gold[3], only="opaque"); s.line(12, 116, 100, 116, gold[5], only="opaque")
    for x in (40, 64):                                                                               # legs + boots
        s.rect(x, 104, x + 13, 118, g[2]); s.rect(x, 104, x + 4, 118, g[3])
        s.ellipse(x - 4, 114, x + 17, 124, leather[1]); s.ellipse(x - 2, 114, x + 11, 121, leather[3])
    body(s, 16, 27, 42, 56, g)                                                                       # belly
    s.rect(44, 88, 84, 94, leather[2], only="opaque"); s.line(44, 88, 84, 88, leather[4], only="opaque")
    s.rect(56, 85, 70, 97, gold[3]); s.rect(59, 88, 67, 94, leather[1]); s.line(56, 85, 70, 85, gold[5])   # buckle
    body(s, 10, 30, 18, 46, g)                                                                        # left arm
    s.ellipse(20, 88, 38, 104, g[3]); s.ellipse(22, 90, 32, 98, g[4], only=g[3])                     # fist
    for pts, inner in ((((46, 36), (22, 18), (34, 46), (48, 50)), ((42, 38), (28, 24), (36, 44))),
                       (((86, 34), (110, 16), (100, 44), (84, 48)), ((88, 36), (104, 22), (98, 40)))):     # ears
        s.polygon(pts, g[3] if pts[0][0] < 60 else g[2]); s.polygon(inner, "#e89a9a" if pts[0][0] < 60 else "#b86a78")
    disc(s, 33, 20, 12.5, g)                                                                          # head
    s.polygon([(46, 30), (62, 34), (62, 37), (46, 34)], g[0]); s.polygon([(70, 34), (86, 30), (86, 34), (70, 37)], g[0])   # brows
    for ex in (52, 76):                                                                               # glowing eyes
        s.ellipse(ex - 4, 36, ex + 5, 43, INK); s.ellipse(ex - 3, 37, ex + 4, 42, "#ffe45a"); s.rect(ex - 1, 38, ex, 39, "#ffffff")
    s.ellipse(60, 40, 72, 50, g[1]); s.ellipse(61, 41, 69, 47, g[3], only=g[1]); s.px(63, 43, g[5])  # nose
    s.polygon([(46, 50), (86, 50), (80, 60), (52, 60)], "#3a1a1a")                                   # grin + gold tooth
    s.rect(50, 50, 82, 52, "#f4ecd8"); s.rect(72, 50, 75, 55, gold[4]); s.px(72, 50, gold[6])
    s.rect(40, 14, 92, 22, gold[3])                                                                   # crown
    for x, h in ((40, 10), (53, 16), (66, 20), (79, 16), (92, 10)):
        s.polygon([(x - 4, 16), (x, 16 - h), (x + 4, 16)], gold[4]); s.px(x, 16 - h, gold[6])
    s.line(40, 14, 92, 14, gold[5]); s.line(40, 22, 92, 22, gold[1])
    for x, c in ((50, "#e0303a"), (66, "#4f7fe0"), (82, "#38b764")):
        s.rect(x - 2, 16, x + 2, 20, c); s.px(x - 2, 16, "#ffffff")
    s.polygon([(90, 80), (104, 82), (124, 12), (110, 6)], club[3])                                    # frozen sausage club
    s.polygon([(90, 80), (96, 81), (116, 9), (110, 6)], club[5], only=club[3])
    for y in range(16, 76, 9):
        x = 94 + int((76 - y) * 0.27)
        s.line(x, y, x + 11, y + 3, club[1], only="opaque")
    for x, y in ((112, 16), (106, 40), (100, 60)):
        s.px(x, y, "#ffffff"); s.px(x + 1, y, "#d8f0ff"); s.px(x, y + 1, "#d8f0ff")
    s.ellipse(86, 74, 104, 90, g[3]); s.ellipse(88, 76, 98, 84, g[5], only=g[3])                     # fist on the club
    return finish(s, "#1c1428", g[4], rim_color="#9ae8c8")


def sale_queen():
    s = sp(64, 64)
    skin = R("#f0e8dc", 7, 8)
    gown = R("#e0508a", 7, 22)
    gold = R("#f2c230", 7, 26)
    s.polygon(k((20, 26), (44, 26), (56, 61), (8, 61)), gown[2])                                     # gown
    s.polygon(k((20, 26), (28, 26), (20, 60), (10, 60)), gown[4], only=gown[2])
    s.polygon(k((38, 26), (44, 26), (54, 60), (42, 60)), gown[1], only=gown[2])
    for i, y in enumerate((74, 92, 110)):                                                            # ruffle tiers
        x0, x1 = 28 - i * 5, 100 + i * 5
        s.line(x0, y, x1, y, gown[0], only=gown[2]); s.line(x0, y - 1, x1, y - 1, gown[5], only=gown[2])
        for x in range(x0, x1, 6):
            s.px(x, y + 1, gown[5], only=gown[2])
    s.rect(48, 118, 80, 124, "#6a6470"); s.line(48, 118, 80, 118, "#9a94a0")                           # display stand
    s.rect(60, 46, 68, 54, skin[3])
    body(s, 23, 7, 41, 25, skin, soft=True)                                                          # porcelain face
    for ex in (56, 70):
        s.rect(ex, 30, ex + 4, 32, INK); s.line(ex - 1, 29, ex + 5, 28, INK)                          # closed, haughty eyes + lashes
    s.line(60, 40, 68, 40, "#c8305a"); s.px(60, 39, "#e85a8a"); s.px(67, 39, "#e85a8a")
    for x in (52, 76):
        s.ellipse(x - 2, 35, x + 2, 37, "#ffb0c8")
    s.polygon(k((24, 8), (26, 2), (30, 6), (32, 0), (34, 6), (38, 2), (40, 8)), gold[3])            # crown
    s.line(48, 16, 80, 16, gold[1]); s.line(52, 5, 60, 12, gold[5]); s.px(64, 1, gold[6])
    s.rect(76, 4, 94, 16, "#f6f0e1"); s.line(76, 4, 94, 4, "#ffffff")                                # SALE tag
    for x in (80, 84, 88):
        s.rect(x, 8, x + 2, 12, "#e53935")
    s.line(76, 4, 72, 8, INK)
    for dx in range(3):                                                                               # arms (3 px, lit on top)
        s.line(40 + dx, 56, 20 + dx, 80, skin[4 - dx]); s.line(88 + dx, 56, 108 + dx, 76, skin[3 - dx])
    for x, y in ((20, 80), (108, 76)):
        s.circle(x + 1, y, 2, skin[3], fill=True)                                                    # hands
    for bx, c in ((6, "#3f7ce0"), (104, "#f2c230")):                                                 # shopping bags
        cc = R(c, 5, 16)
        s.rect(bx, 80, bx + 18, 100, cc[2]); s.rect(bx, 80, bx + 5, 100, cc[3]); s.line(bx, 80, bx + 18, 80, cc[4])
        s.line(bx + 4, 72, bx + 4, 80, INK); s.line(bx + 14, 72, bx + 14, 80, INK); s.line(bx + 4, 72, bx + 14, 72, INK)
        s.rect(bx + 6, 86, bx + 12, 90, "#ffffff")
    return finish(s, "#3a1a2a", gown[5])


def octane():
    s = sp(64, 64)
    r = R("#d23a30", 7, 18)
    m = R("#9aa4b0", 7, 10)
    s.rect(*k(14, 10, 44, 58), r[3]); s.rect(28, 20, 40, 116, r[5], only=r[3]); s.rect(80, 20, 89, 116, r[1], only=r[3])
    s.rect(24, 12, 92, 20, r[2]); s.line(24, 12, 92, 12, r[5]); s.line(24, 20, 92, 20, r[0])           # cap
    s.rect(36, 28, 80, 52, "#1f2a3a"); s.rect(38, 30, 78, 50, "#141c2a"); s.line(36, 28, 80, 28, "#5a6a8a")   # display face
    for ex in (44, 66):                                                                                # angry LED eyes
        s.rect(ex, 36, ex + 8, 42, "#ff5a3a"); s.rect(ex + 1, 37, ex + 3, 38, "#ffc0a0")
    s.line(42, 34, 52, 37, "#ff5a3a"); s.line(76, 34, 66, 37, "#ff5a3a")
    s.line(48, 47, 68, 45, "#ff5a3a"); s.line(48, 48, 68, 46, "#c83a2a")
    for x in range(40, 78, 8):                                                                         # price digits
        s.rect(x, 60, x + 5, 66, "#141c2a"); s.rect(x + 1, 61, x + 4, 65, "#f2e25a")
    s.rect(36, 72, 80, 80, "#f2c230"); s.line(36, 72, 80, 72, "#fff1a8"); s.line(36, 80, 80, 80, "#a07a10")
    s.rect(24, 112, 92, 120, m[2]); s.line(24, 112, 92, 112, m[5])                                     # base
    pts = [(88, 40), (104, 40), (112, 60), (108, 88)]                                                 # hose: a thick rubber tube
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(n + 1):
            x, y = x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n
            s.circle(round(x), round(y), 3, "#2a2e40", fill=True)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        s.line(x0 - 1, y0 - 1, x1 - 1, y1 - 1, "#5a6078")                                            # highlight along the tube
    s.rect(100, 88, 116, 100, m[3]); s.rect(100, 88, 104, 100, m[5]); s.line(100, 100, 116, 100, m[1])   # nozzle
    for x, y in ((108, 104), (110, 108), (106, 110)):
        s.px(x, y, "#ffb347"); s.px(x + 1, y + 1, "#fff1a8")                                           # dripping fuel
    for x, y in ((12, 40), (16, 72), (120, 20)):
        s.circle(x, y, 1, "#ffb347"); s.px(x, y, "#fff1a8")
    return finish(s, INK, r[5])


def yaksha():
    s = sp(64, 72)
    skin = R("#3a9a6a", 7, 20)
    robe = R("#c8342a", 7, 18)
    gold = R("#f2c230", 7, 26)
    s.rect(104, 12, 115, 116, "#8a6a3a"); s.rect(104, 12, 107, 116, "#c8a060"); s.line(115, 12, 115, 116, "#5a3a1a")   # mace
    s.rect(98, 8, 120, 24, gold[3]); s.line(98, 8, 120, 8, gold[5]); s.line(98, 24, 120, 24, gold[1])
    for y in (12, 18):
        s.line(100, y, 118, y, gold[2])
    s.polygon(k((16, 30), (48, 30), (54, 69), (10, 69)), robe[2])                                     # robe
    s.polygon(k((16, 30), (26, 30), (20, 69), (12, 69)), robe[4], only=robe[2])
    s.polygon(k((40, 30), (48, 30), (54, 69), (44, 69)), robe[1], only=robe[2])
    for y in (80, 104):
        s.line(28, y, 100, y, gold[3], only=robe[2]); s.line(28, y + 1, 100, y + 1, gold[1], only=robe[2])
    for x in range(32, 96, 8):                                                                        # kranok pattern
        s.polygon([(x, 92), (x + 3, 88), (x + 6, 92), (x + 3, 94)], gold[4], only="opaque")
    s.rect(36, 56, 92, 64, gold[3]); s.line(36, 56, 92, 56, gold[5])                                   # collar
    for x in range(40, 90, 6):
        s.px(x, 60, "#e0303a")
    body(s, 12, 32, 17, 46, skin); body(s, 46, 32, 51, 46, skin)                                        # arms
    disc(s, 32, 20, 11, skin)                                                                          # face
    s.line(50, 30, 60, 32, skin[0]); s.line(78, 32, 68, 30, skin[0])                                   # fierce brows
    for ex in (54, 70):
        s.ellipse(ex - 2, 33, ex + 5, 39, "#f2e25a"); s.rect(ex + 1, 34, ex + 2, 38, INK); s.px(ex - 1, 34, "#ffffff")
    s.polygon([(54, 48), (74, 48), (70, 54), (58, 54)], "#5a1010"); s.line(54, 48, 74, 48, "#8a1a1a")  # mouth
    for x in (56, 70):
        s.polygon([(x, 48), (x + 3, 48), (x + 1, 55)], EYE_W)                                           # fangs
    s.polygon(k((23, 12), (41, 12), (38, 6), (35, 2), (32, 0), (29, 2), (26, 6)), gold[3])          # chada crown
    s.polygon([(46, 24), (64, 24), (64, 0), (58, 4)], gold[4], only=gold[3])
    s.line(64, 0, 64, 20, gold[6]); s.line(46, 24, 82, 24, gold[1]); s.circle(64, 16, 2, "#e0303a", fill=True); s.px(63, 15, "#ffb0b0")
    for x in (40, 72):
        s.rect(x, 132, x + 17, 140, skin[2]); s.line(x, 132, x + 17, 132, skin[4])
    return finish(s, "#10200a", gold[5], rim_color="#9ae8c8")


def treant():
    s = sp(72, 72)
    bark = R("#6a4a2a", 7, 16)
    leaf = R("#3a8a2a", 7, 22)
    for i in range(12):                                                                               # roots
        s.rect(44 - i * 6, 128 + i // 3, 49 - i * 6, 131 + i // 3, bark[2]); s.rect(96 + i * 6, 128 + i // 3, 101 + i * 6, 131 + i // 3, bark[1])
    s.rect(*k(24, 30, 48, 64), bark[3]); s.rect(48, 60, 60, 128, bark[5], only=bark[3]); s.rect(88, 64, 97, 128, bark[1], only=bark[3])
    for x in (54, 70, 82):
        s.line(x, 68, x - 2, 124, bark[1]); s.line(x + 1, 68, x - 1, 124, bark[4])
    s.polygon(k((24, 38), (6, 30), (4, 36), (22, 46)), bark[3]); s.polygon(k((48, 38), (66, 28), (68, 34), (50, 46)), bark[2])   # arms
    disc(s, 36, 20, 20.5, leaf)                                                                       # crown of leaves
    disc(s, 14, 26, 8.5, leaf); disc(s, 58, 26, 8.5, leaf)
    for x, y in ((40, 20), (80, 12), (100, 40), (54, 50), (24, 44), (116, 60)):
        s.ellipse(x, y, x + 6, y + 3, leaf[5]); s.px(x + 2, y, leaf[6])
    for ex in (58, 80):                                                                               # glowing eyes in the bark
        s.ellipse(ex, 78, ex + 8, 86, "#1a0e04"); s.rect(ex + 2, 80, ex + 6, 84, "#f2d23a"); s.px(ex + 2, 80, "#fff6c8")
    s.polygon(k((31, 50), (41, 50), (39, 56), (33, 56)), "#1a0e04")
    s.line(64, 100, 80, 100, "#3a2210")
    for x, y in ((16, 40), (124, 28), (80, 8), (10, 90)):
        s.px(x, y, "#b6f28c"); s.px(x + 1, y + 1, "#d8ffb0")
    return finish(s, "#1a0e04", leaf[4])


def stationmaster():
    s = sp(64, 64)
    coat = R("#2a3a68", 7, 20)
    mist = R("#8fa8c8", 7, 16)
    gold = R("#f2c230", 7, 26)
    s.polygon(k((20, 44), (44, 44), (40, 56), (46, 62), (34, 58), (30, 63), (26, 57), (16, 61), (22, 54)), mist[3])   # misty tail
    s.polygon(k((22, 46), (32, 46), (28, 56), (22, 54)), mist[5], only=mist[3])
    s.polygon(k((18, 22), (46, 22), (48, 48), (16, 48)), coat[3])                                      # coat
    s.polygon(k((18, 22), (28, 22), (22, 48), (16, 48)), coat[5], only=coat[3])
    s.polygon(k((38, 22), (46, 22), (48, 48), (42, 48)), coat[1], only=coat[3])
    s.line(64, 48, 64, 94, coat[0]); s.line(65, 48, 65, 94, coat[4])
    for y in (54, 66, 78, 90):
        s.circle(60, y, 1, gold[4], fill=True); s.circle(70, y, 1, gold[3], fill=True)                  # buttons
    s.line(68, 60, 84, 72, gold[3]); s.circle(84, 74, 3, gold[3], fill=True); s.px(83, 73, gold[6])  # watch chain
    disc(s, 32, 15, 8.5, R("#c8e0f0", 7, 14), soft=True)                                                # pale face
    for ex in (54, 70):
        s.rect(ex, 28, ex + 4, 32, "#1a2a48"); s.rect(ex + 1, 29, ex + 3, 31, "#7ff0ff"); s.px(ex + 1, 29, "#e0ffff")
    s.line(58, 40, 70, 40, "#6a88a8")
    s.rect(44, 8, 84, 18, coat[3]); s.line(44, 8, 84, 8, coat[5]); s.rect(44, 16, 84, 18, gold[3])      # cap
    s.rect(38, 18, 90, 20, "#10182a"); s.rect(60, 10, 68, 14, gold[4]); s.px(60, 10, gold[6])           # visor + badge
    body(s, 46, 26, 50, 38, coat); body(s, 12, 26, 17, 36, coat)                                        # arms
    s.line(98, 76, 98, 84, INK)                                                                          # lantern
    s.rect(92, 84, 106, 102, gold[2]); s.rect(94, 86, 104, 100, "#58d06a"); s.rect(96, 88, 102, 96, "#c8ffb0"); s.px(96, 88, "#ffffff")
    s.line(92, 84, 106, 84, gold[4])
    for x, y in ((16, 40), (112, 28), (12, 88), (116, 112)):
        s.px(x, y, "#7ff0ff"); s.px(x + 1, y + 1, "#3a8aa8")
    return finish(s, "#0a1020", coat[5], rim_color="#9ad8ff")


def relic_colossus():
    s = sp(72, 72)
    st = R("#b0a890", 7, 12)
    gold = R("#f2c230", 7, 26)
    for x, y, r in ((16, 36, 6), (128, 24, 4), (120, 80, 6), (12, 92, 4)):                           # floating shards
        s.polygon([(x - r, y), (x, y - r - 2), (x + r, y), (x, y + r)], st[3]); s.polygon([(x - r, y), (x, y - r - 2), (x, y)], st[5])
    s.rect(*k(22, 26, 50, 58), st[3]); s.rect(44, 52, 56, 116, st[5], only=st[3]); s.rect(88, 52, 101, 116, st[1], only=st[3])   # torso
    s.rect(*k(18, 24, 54, 30), st[3]); s.line(36, 48, 108, 48, st[5]); s.line(36, 61, 108, 61, st[1])                            # shoulders
    s.rect(*k(26, 6, 46, 24), st[3]); s.rect(52, 12, 62, 48, st[5], only=st[3]); s.rect(84, 12, 93, 48, st[1], only=st[3])       # head
    s.polygon(k((24, 6), (36, 0), (48, 6)), st[4])
    for ex in (58, 78):                                                                                  # glowing eyes
        s.rect(ex, 26, ex + 9, 30, gold[5]); s.rect(ex + 1, 27, ex + 3, 28, "#ffffff")
    s.line(62, 38, 82, 38, st[0]); s.line(72, 14, 72, 22, gold[3])
    for x0, y0, x1, y1 in ((50, 64, 66, 80), (94, 64, 78, 80), (72, 84, 72, 108), (56, 100, 88, 100)):
        s.line(x0, y0, x1, y1, gold[4]); s.line(x0, y0 + 1, x1, y1 + 1, gold[2])                     # rune lines
    s.circle(72, 76, 6, gold[3], fill=True); s.circle(72, 76, 3, gold[5], fill=True); s.px(71, 75, "#ffffff")   # core rune
    for (x0, y0, x1, y1), c in (((20, 56, 36, 100), st[3]), ((108, 56, 124, 100), st[2])):             # arms + fists
        s.rect(x0, y0, x1, y1, c); s.line(x0, y0, x0, y1, st[5] if x0 < 60 else st[3])
    s.rect(12, 100, 40, 112, st[3]); s.rect(104, 100, 132, 112, st[2]); s.line(12, 100, 40, 100, st[5])
    s.rect(48, 116, 64, 136, st[3]); s.rect(80, 116, 96, 136, st[2])                                  # legs
    s.rect(40, 136, 104, 140, st[0])
    for x0, y0, x1, y1 in ((92, 16, 88, 32), (104, 68, 100, 84), (30, 60, 34, 76)):
        s.line(x0, y0, x1, y1, st[0]); s.line(x0 + 1, y0, x1 + 1, y1, st[5])                          # cracks
    for x, y in ((36, 48), (98, 50), (52, 118)):
        s.ellipse(x, y, x + 6, y + 3, "#6a9a4a"); s.px(x + 2, y, "#9ad86a")                           # moss
    return finish(s, "#1a140a", st[5], rim_color="#e8d8a8")


SPRITES = {
    "boss_goblin_king": goblin_king, "boss_sale_queen": sale_queen, "boss_octane": octane,
    "boss_yaksha": yaksha, "boss_treant": treant, "boss_stationmaster": stationmaster, "boss_relic": relic_colossus,
}
