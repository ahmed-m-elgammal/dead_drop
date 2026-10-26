#!/usr/bin/env python3
"""
M3 W4 "NOIR PIXEL" — pixelate post-processor.

Takes the raw AI renders from assets-raw/ and forces them into a coherent
chunky-pixel game look:
  1. QUANTIZE   — median-cut palette reduction (unifies color language)
  2. CHUNKIFY   — nearest-neighbor downscale by `factor`, then upscale back
                  (locks every pixel to a visible grid — authentic pixel art)
  3. slight saturation lift for the hero/verdict art (noir pops on dark UI)

Outputs to public/art/ at display resolution (already chunky — the browser
renders them 1:1 or downscales; `image-rendering: pixelated` keeps edges).
"""
from PIL import Image, ImageEnhance
import os

RAW = "/home/z/my-project/assets-raw"
OUT = "/home/z/my-project/public/art"
os.makedirs(OUT, exist_ok=True)

# name -> (chunkify factor, palette colors, saturation, max output width)
SPEC = {
    "title-city":        (3, 64, 1.10, 960),
    "portrait-detective": (6, 48, 1.05, 384),
    "portrait-courier":   (6, 48, 1.05, 384),
    "lineup":            (5, 48, 1.05, 800),
    "verdict-capture":   (5, 48, 1.08, 480),
    "verdict-escape":    (5, 48, 1.08, 480),
    "verdict-expiry":    (5, 48, 1.08, 480),
    "cork":              (4, 32, 0.95, 512),   # tileable texture — keep quiet
    "paper":             (4, 32, 0.95, 512),   # tileable texture — keep quiet
}

def pixelate(name, factor, colors, saturation, max_w):
    src = os.path.join(RAW, f"{name}.png")
    img = Image.open(src).convert("RGB")

    # 1) palette unify
    img = img.quantize(colors=colors, method=Image.MEDIANCUT).convert("RGB")

    # 2) chunkify — nearest downscale then upscale (blocky grid)
    w, h = img.size
    small = img.resize((max(1, w // factor), max(1, h // factor)), Image.NEAREST)
    img = small.resize(small.size, Image.NEAREST)  # no-op keeps semantics clear
    img = img.resize((small.width, small.height), Image.NEAREST)

    # 3) mood
    img = ImageEnhance.Color(img).enhance(saturation)

    # 4) downscale to display width (still NEAREST — grid preserved)
    if img.width > max_w:
        nh = round(img.height * max_w / img.width)
        img = img.resize((max_w, nh), Image.NEAREST)

    out = os.path.join(OUT, f"{name}.png")
    img.save(out, optimize=True)
    kb = os.path.getsize(out) // 1024
    print(f"{name}: {img.width}x{img.height} {kb}KB")

for name, (factor, colors, sat, max_w) in SPEC.items():
    pixelate(name, factor, colors, sat, max_w)
print("done ->", OUT)
