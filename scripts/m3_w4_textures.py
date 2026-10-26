#!/usr/bin/env python3
"""
M3 W4 — procedural seamless textures for the noir UI (cork + paper).
Noise-per-pixel => seamless by construction. Palette-locked to the art pass.
"""
import random
from PIL import Image

OUT = "/home/z/my-project/public/art"
SIZE = 256

def make_cork():
    rng = random.Random(20261026)
    img = Image.new("RGB", (SIZE, SIZE))
    px = img.load()
    base = (122, 90, 62)  # warm cork brown (reads against dark navy UI)
    for y in range(SIZE):
        for x in range(SIZE):
            n = rng.random()
            if n < 0.05:
                c = (92, 66, 44)      # dark fleck
            elif n < 0.10:
                c = (150, 116, 82)    # light fleck
            elif n < 0.13:
                c = (74, 52, 36)      # deep grain
            else:
                jitter = rng.randint(-7, 7)
                c = tuple(max(0, min(255, v + jitter)) for v in base)
            px[x, y] = c
    img.save(f"{OUT}/cork.png", optimize=True)
    print("cork.png done")

def make_paper():
    rng = random.Random(20261027)
    base = (232, 221, 199)  # cream manila
    # Image.new defaults to black — the cream base MUST be painted explicitly.
    img = Image.new("RGB", (SIZE, SIZE), base)
    px = img.load()
    # faint fiber strokes drawn on a copy first
    for _ in range(340):
        x0, y0 = rng.randrange(SIZE), rng.randrange(SIZE)
        dx = rng.choice([-3, -2, -1, 1, 2, 3])
        dy = rng.choice([-1, 0, 1])
        shade = rng.choice([(214, 200, 176), (240, 231, 212), (222, 208, 184)])
        for i in range(rng.randint(4, 14)):
            x, y = (x0 + dx * i) % SIZE, (y0 + dy * i) % SIZE  # wrap => seamless
            px[x, y] = shade
    # sparse speckles
    for _ in range(160):
        x, y = rng.randrange(SIZE), rng.randrange(SIZE)
        px[x, y] = rng.choice([(198, 182, 156), (244, 236, 220)])
    # soften base jitter
    for y in range(SIZE):
        for x in range(SIZE):
            r, g, b = px[x, y]
            j = rng.randint(-2, 2)
            px[x, y] = (max(0, min(255, r + j)), max(0, min(255, g + j)), max(0, min(255, b + j)))
    img.save(f"{OUT}/paper.png", optimize=True)
    print("paper.png done")

make_cork()
make_paper()
