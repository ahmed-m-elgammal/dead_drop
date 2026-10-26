#!/usr/bin/env python3
"""
M3 polish sprint — pixelate post-processor for the 8 new assets.

Same pipeline as scripts/m3_w4_pixelate.py (quantize → chunkify → mood →
display resize) so the new set matches the locked W4 look exactly.
"""
from PIL import Image, ImageEnhance
import os

RAW = "/home/z/my-project/assets-raw"
OUT = "/home/z/my-project/public/art"
os.makedirs(OUT, exist_ok=True)

# name -> (chunkify factor, palette colors, saturation, max output width)
SPEC = {
    "mugshot-baseline":  (6, 48, 1.05, 256),
    "mugshot-random":    (6, 48, 1.05, 256),
    "mugshot-cautious":  (6, 48, 1.05, 256),
    "mugshot-deceptive": (6, 48, 1.05, 256),
    "district-D1":       (5, 48, 1.08, 320),
    "district-D2":       (5, 48, 1.08, 320),
    "district-D3":       (5, 48, 1.08, 320),
    "district-D4":       (5, 48, 1.08, 320),
}

def pixelate(name, factor, colors, saturation, max_w):
    src = os.path.join(RAW, f"{name}.png")
    img = Image.open(src).convert("RGB")

    # 1) palette unify
    img = img.quantize(colors=colors, method=Image.MEDIANCUT).convert("RGB")

    # 2) chunkify — nearest downscale (blocky grid)
    w, h = img.size
    small = img.resize((max(1, w // factor), max(1, h // factor)), Image.NEAREST)

    # 3) mood
    img = ImageEnhance.Color(small).enhance(saturation)

    # 4) downscale to display width (still NEAREST — grid preserved)
    if img.width > max_w:
        nh = round(img.height * max_w / img.width)
        img = img.resize((max_w, nh), Image.NEAREST)

    out = os.path.join(OUT, f"{name}.png")
    img.save(out, optimize=True)
    kb = os.path.getsize(out) // 1024
    print(f"{name}: {img.width}x{img.height} {kb}KB")

for name, (factor, colors, sat, max_w) in SPEC.items():
    if not os.path.exists(os.path.join(RAW, f"{name}.png")):
        print(f"MISSING raw render: {name} — run m3_polish_gen_assets.mjs first")
        continue
    pixelate(name, factor, colors, sat, max_w)
print("done ->", OUT)
