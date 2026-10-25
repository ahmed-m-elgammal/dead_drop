#!/usr/bin/env python3
"""
Dead Drop — M1 paper-prototype kit: print map generator.

Reads assets/sample_map_alpha.json (the declared source of truth for map data)
and emits a self-contained, print-ready HTML file with an inline SVG map:
  - 4 districts as 2x2 quadrants, each district's 12 nodes on a ring
  - ring rotated so each district's metro hub (node 06) faces the canvas center
  - edge styling by transit class: Foot thin solid, Tram dashed, Metro thick
  - glyphs: drop candidates = squares, gates = black diamonds, safehouses = triangles
  - radial node labels (outside the rings), legend, title block, A4-landscape print CSS

Output: download/dead-drop/m1/kit/map_print.html
"""
import json
import math

MAP_PATH = "/home/z/my-project/download/dead-drop/assets/sample_map_alpha.json"
OUT = "/home/z/my-project/download/dead-drop/m1/kit/map_print.html"

with open(MAP_PATH) as f:
    mp = json.load(f)

DISTRICTS = mp["districts"]  # {"D1": "Harbor", ...}
nodes = [n["id"] for n in mp["nodes"]]
district_of = {n["id"]: n["district"] for n in mp["nodes"]}
pool = set(mp["drop_candidates"])
gates = set(mp["gates"])
safehouses = set(mp["safehouses"])

# District quadrant centers (screen coords, y down) + rotation so hub (06) faces center
CENTERS = {"D1": (355, 300), "D2": (955, 300), "D3": (355, 700), "D4": (955, 700)}
HUB_TARGET_ANGLE = {"D1": 45, "D2": 135, "D3": -45, "D4": -135}  # degrees, screen space
R = 102


def pos(nid):
    d = district_of[nid]
    idx = int(nid.split("-")[1])  # 1..12
    offset = HUB_TARGET_ANGLE[d] - 150  # angle(6) = offset + 5*30 = target
    a = math.radians(offset + (idx - 1) * 30)
    cx, cy = CENTERS[d]
    return cx + R * math.cos(a), cy + R * math.sin(a)


P = {n: pos(n) for n in nodes}

STYLE = {
    "F": {"stroke": "#1a1a1a", "width": 1.3, "dash": ""},
    "T": {"stroke": "#b0722c", "width": 1.8, "dash": "7,5"},
    "M": {"stroke": "#274e8f", "width": 4.2, "dash": ""},
}


def edge_line(e):
    x1, y1 = P[e["a"]]
    x2, y2 = P[e["b"]]
    s = STYLE[e["type"]]
    dash = f' stroke-dasharray="{s["dash"]}"' if s["dash"] else ""
    return (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'stroke="{s["stroke"]}" stroke-width="{s["width"]}"{dash} '
            f'stroke-linecap="round" opacity="0.92"/>')


svg_edges = "\n".join(edge_line(e) for e in sorted(mp["edges"], key=lambda e: {"M": 0, "T": 1, "F": 2}[e["type"]]))


def node_svg(nid):
    x, y = P[nid]
    d = district_of[nid]
    cx, cy = CENTERS[d]
    dx, dy = x - cx, y - cy
    n = math.hypot(dx, dy) or 1.0
    lx, ly = x + dx / n * 26, y + dy / n * 26  # radial-outward label
    anchor = "middle"
    if abs(dx) > 30:
        anchor = "start" if dx > 0 else "end"
    glyph = ""
    if nid in gates:
        ds = 11.5
        glyph = (f'<polygon points="{x:.1f},{y - ds:.1f} {x + ds:.1f},{y:.1f} {x:.1f},{y + ds:.1f} '
                 f'{x - ds:.1f},{y:.1f}" fill="#111" stroke="#111" stroke-width="2.4" '
                 f'pointer-events="none"/>')
    elif nid in safehouses:
        ds = 12.5
        glyph = (f'<polygon points="{x:.1f},{y - ds:.1f} {x + ds:.1f},{y + ds * 0.85:.1f} '
                 f'{x - ds:.1f},{y + ds * 0.85:.1f}" fill="#111" stroke="#111" stroke-width="1.4" '
                 f'pointer-events="none"/>')
    elif nid in pool:
        ds = 9.5
        glyph = (f'<rect x="{x - ds:.1f}" y="{y - ds:.1f}" width="{2 * ds:.1f}" height="{2 * ds:.1f}" '
                 f'fill="#fff" stroke="#111" stroke-width="1.8" pointer-events="none"/>')
    else:
        glyph = f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" fill="#fff" stroke="#111" stroke-width="1.6" pointer-events="none"/>'
    label = (f'<text x="{lx:.1f}" y="{ly + 3.5:.1f}" font-size="10.5" font-family="Helvetica,Arial,sans-serif" '
             f'text-anchor="{anchor}" fill="#111">{nid}</text>')
    return glyph + label


# district backplates + names (name placed at the outer corner, away from center)
BACKPLATES, DNAMES = [], []
for d, (cx, cy) in CENTERS.items():
    BACKPLATES.append(f'<circle cx="{cx}" cy="{cy}" r="{R + 34}" fill="#f4f4f2" stroke="#c9c9c4" stroke-width="1.2"/>')
    nx, ny = HUB_TARGET_ANGLE[d] + 180, 0  # outward direction (opposite the hub)
    a = math.radians(nx)
    tx, ty = cx + (R + 62) * math.cos(a), cy + (R + 62) * math.sin(a)
    DNAMES.append(f'<text x="{tx:.1f}" y="{ty:.1f}" font-size="19" font-weight="bold" '
                  f'font-family="Helvetica,Arial,sans-serif" text-anchor="middle" fill="#333">'
                  f'{d} · {DISTRICTS[d]}</text>')

svg_nodes = "\n".join(node_svg(n) for n in nodes)

LEGEND = """
<g font-family="Helvetica,Arial,sans-serif" font-size="12" fill="#111">
  <text x="60" y="52" font-size="22" font-weight="bold">DEAD DROP — Paper Prototype Map</text>
  <text x="60" y="74" font-size="12.5">map_alpha v1.0.0 · ruleset 1.0.0-alpha.1 · 48 nodes / 84 edges · Print: A4 landscape, one copy per table + one hidden Fugitive route sheet</text>

  <line x1="60" y1="100" x2="120" y2="100" stroke="#1a1a1a" stroke-width="1.3"/>
  <text x="128" y="104">Foot (1 SP)</text>
  <line x1="215" y1="100" x2="275" y2="100" stroke="#b0722c" stroke-width="1.8" stroke-dasharray="7,5"/>
  <text x="283" y="104">Tram (2 SP)</text>
  <line x1="375" y1="100" x2="435" y2="100" stroke="#274e8f" stroke-width="4.2"/>
  <text x="443" y="104">Metro (3 SP)</text>

  <circle cx="72" cy="132" r="9" fill="#fff" stroke="#111" stroke-width="1.6"/>
  <text x="128" y="136">district node</text>
  <rect x="63" y="123" width="18" height="18" fill="#fff" stroke="#111" stroke-width="1.8"/>
  <text x="128" y="163">drop candidate (16)</text>
  <polygon points="72,148 84,170 60,170" fill="#111"/>
  <text x="215" y="163">safehouse (2) — Fugitive start, public</text>
  <polygon points="72,178 83,189 72,200 61,189" fill="#111" stroke="#111" stroke-width="2"/>
  <text x="215" y="190">exit gate (2) — escape with both drops collected</text>
</g>
"""

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Dead Drop — map_alpha paper prototype (print A4 landscape)</title>
<style>
  @page {{ size: A4 landscape; margin: 8mm; }}
  body {{ margin: 0; background: #fff; }}
  svg {{ width: 100%; height: auto; display: block; }}
  .hint {{ font: 12px Helvetica, Arial, sans-serif; color: #555; padding: 6px 12px; }}
  @media print {{ .hint {{ display: none; }} }}
</style>
</head>
<body>
<div class="hint">Screen preview — print with Ctrl/Cmd+P (A4 landscape, background graphics ON, scale 100%).</div>
<svg viewBox="0 0 1270 960" xmlns="http://www.w3.org/2000/svg">
{chr(10).join(BACKPLATES)}
{LEGEND}
{svg_edges}
{chr(10).join(DNAMES)}
{svg_nodes}
</svg>
</body>
</html>
"""

with open(OUT, "w") as f:
    f.write(html)

print(f"wrote {OUT} ({len(html)} bytes)")
