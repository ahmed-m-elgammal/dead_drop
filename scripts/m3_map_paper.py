#!/usr/bin/env python3
"""
M3 map plate — procedural seamless "printed city map" paper tile.

The W4.5 brief's reference (detective cork board) shows the city drawn on a
PAPER street map pinned to cork. This tile = cream paper base + faint printed
street grid (wrap-aware drawing => seamless by construction, same recipe as
m3_w4_textures.py). Contrast is kept very low so the interactive SVG layers
(nodes, edges, labels) always dominate — readability first.

Output: public/art/map-paper.png (256px, tiles under the SVG paper plate).
If the file is missing at runtime the plate falls back to flat cream.
"""
import random
from PIL import Image

OUT = "/home/z/my-project/public/art"
SIZE = 256


def make_map_paper():
    rng = random.Random(20261028)
    base = (233, 222, 200)  # cream, ~--nk-paper
    img = Image.new("RGB", (SIZE, SIZE), base)  # base MUST be painted (W4 bug)
    px = img.load()

    def put(x, y, c):
        px[x % SIZE, y % SIZE] = c

    # faint paper fibers (W4 paper recipe, sparser)
    for _ in range(220):
        x0, y0 = rng.randrange(SIZE), rng.randrange(SIZE)
        dx = rng.choice([-3, -2, -1, 1, 2, 3])
        dy = rng.choice([-1, 0, 1])
        shade = rng.choice([(216, 203, 179), (241, 232, 214), (224, 210, 186)])
        for i in range(rng.randint(4, 12)):
            put(x0 + dx * i, y0 + dy * i, shade)

    street = (203, 188, 160)   # printed street ink (subtle)
    avenue = (188, 171, 141)   # slightly darker major road
    block = (226, 215, 193)    # building-block wash

    # city blocks: light wash rects between grid lines (wrap-aware put)
    for gy in range(4):
        for gx in range(4):
            if rng.random() < 0.6:
                bx0, by0 = gx * 64 + 5, gy * 64 + 5
                w, h = rng.randint(30, 48), rng.randint(30, 48)
                for yy in range(h):
                    for xx in range(w):
                        put(bx0 + xx, by0 + yy, block)

    # street grid every 64px, hand-jittered, wrap-aware
    for gx in range(4):
        x = gx * 64 + rng.randint(-2, 2)
        w = 2 if rng.random() < 0.3 else 1
        col = avenue if w == 2 else street
        for y in range(-4, SIZE + 4):
            jx = x + (rng.choice([0, 0, 0, 1, -1]) if rng.random() < 0.25 else 0)
            for k in range(w):
                put(jx + k, y, col)
    for gy in range(4):
        y = gy * 64 + rng.randint(-2, 2)
        w = 2 if rng.random() < 0.3 else 1
        col = avenue if w == 2 else street
        for x in range(-4, SIZE + 4):
            jy = y + (rng.choice([0, 0, 0, 1, -1]) if rng.random() < 0.25 else 0)
            for k in range(w):
                put(x, jy + k, col)

    # two shallow diagonal avenues (wrap-aware)
    for y0, slope in [(97, 0.35), (201, -0.28)]:
        for x in range(-8, SIZE + 8):
            for t in range(2):
                put(x, int(y0 + slope * x) + t, avenue)

    # intersection dots
    for gy in range(4):
        for gx in range(4):
            put(gx * 64, gy * 64, (172, 154, 124))
            put(gx * 64 + 1, gy * 64, (172, 154, 124))

    # soften with base jitter
    for y in range(SIZE):
        for x in range(SIZE):
            r, g, b = px[x, y]
            j = rng.randint(-2, 2)
            px[x, y] = (max(0, min(255, r + j)), max(0, min(255, g + j)), max(0, min(255, b + j)))

    img.save(f"{OUT}/map-paper.png", optimize=True)
    print("map-paper.png done")


make_map_paper()
