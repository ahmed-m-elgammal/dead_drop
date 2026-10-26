/**
 * Dead Drop — web map geometry (M3 W1).
 *
 * Ports the paper-prototype layout math (`dead_drop/tools/verification/
 * dd_m1_kit_map.py`, commit 5958018) to a portrait web viewBox:
 *   - 4 districts as 2x2 quadrants (D1 Harbor NW · D2 Old Town NE ·
 *     D3 Market SW · D4 Rail Yard SE — same compass as the printed map)
 *   - 12 nodes per district on a ring, rotated so each district's metro
 *     hub (node 06) faces the canvas center — the same "read the Metro
 *     spine at a glance" property the paper map was designed around
 *   - glyphs: drop candidates = squares, gates = diamonds, safehouses =
 *     triangles, everything else = circles (06-uiux §2: never color-only)
 */
import type { CityMapEdge, DistrictId, EdgeClass, NodeId } from '@dead-drop/engine';

export const VIEW_W = 760;
export const VIEW_H = 1000;
/** Canvas center — district hubs face this point. */
const CC = { x: VIEW_W / 2, y: VIEW_H / 2 };

const CENTERS: Record<DistrictId, { x: number; y: number }> = {
  D1: { x: 215, y: 255 },
  D2: { x: 545, y: 255 },
  D3: { x: 215, y: 745 },
  D4: { x: 545, y: 745 },
};

/** Screen-space angle (deg, y down) the hub (node 06) should face. */
const HUB_TARGET_ANGLE: Record<DistrictId, number> = {
  D1: 45,   // toward canvas center from NW quadrant
  D2: 135,  // from NE
  D3: -45,  // from SW
  D4: -135, // from SE
};

const R = 165;
const PLATE_R = R + 30;

export type Glyph = 'circle' | 'square' | 'diamond' | 'triangle';

export interface NodeLayout {
  id: NodeId;
  district: DistrictId;
  x: number;
  y: number;
  /** Radial unit vector from the district center (for label anchoring). */
  ux: number;
  uy: number;
  glyph: Glyph;
  /** Resolved label placement — the default radial anchor nudged apart so
   *  no two labels' boxes intersect and no label sits on a foreign glyph
   *  (the district-seam problem: adjacent rings nearly touch at the four
   *  quadrant joins). Computed once per map in buildLayout. */
  lx: number;
  ly: number;
  anchor: 'start' | 'end' | 'middle';
  /** Invisible hit-target radius. Clamped to half the nearest-neighbor
   *  distance so seam nodes' hit areas never overlap (the later-rendered
   *  node used to swallow clicks aimed at its twin). */
  hitR: number;
}

export interface DistrictLayout {
  id: DistrictId;
  name: string;
  x: number;
  y: number;
  plateR: number;
  /** Label anchor at the district's outer corner, away from the canvas center. */
  labelX: number;
  labelY: number;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Paper-map rotation: angle(6) = offset + 5*30 must equal the hub target. */
function ringOffset(d: DistrictId): number {
  return HUB_TARGET_ANGLE[d] - 150;
}

/* --------------------------------------------------------------- *
 * Label placement resolution (readability pass, presentation-only)
 *
 * The ring layout puts adjacent districts' nodes within ~11px of each
 * other at the four quadrant seams, so radial labels collide into
 * unreadable blobs ("D1-05D2-06"). This pass keeps the radial anchor as
 * the first choice and falls back to compass offsets around the node,
 * picking deterministically the first candidate whose box hits neither
 * a placed label nor a foreign node glyph. Same layout data in, same
 * placements out — pure function of the map geometry.
 * --------------------------------------------------------------- */

const LABEL_W = 34;  // "D1-01" at 10.5px ≈ 30px + 4px padding
const LABEL_H = 12;
const PAD = 2;
const R_ADJUST = 24;  // default radial label distance (as shipped in W1)

type Box = { x0: number; y0: number; x1: number; y1: number };

function labelBox(x: number, y: number, anchor: 'start' | 'end' | 'middle'): Box {
  const x0 = anchor === 'start' ? x : anchor === 'end' ? x - LABEL_W : x - LABEL_W / 2;
  return { x0, y0: y - LABEL_H, x1: x0 + LABEL_W, y1: y + 2 };
}

const hits = (a: Box, b: Box) =>
  a.x0 < b.x1 + PAD && b.x0 < a.x1 + PAD && a.y0 < b.y1 + PAD && b.y0 < a.y1 + PAD;

/** Compass candidates tried after the radial default: [dx, dy, anchor].
 *  Above/below keep the node vertically clear; sides sit at glyph height. */
const CANDIDATES: Array<[number, number, 'start' | 'end' | 'middle']> = [
  [0, -18, 'middle'],   // above
  [0, 20, 'middle'],    // below
  [20, 3, 'start'],     // right
  [-20, 3, 'end'],      // left
  [16, -14, 'start'],   // upper-right
  [-16, -14, 'end'],    // upper-left
  [16, 16, 'start'],    // lower-right
  [-16, 16, 'end'],     // lower-left
];

function resolveLabels(nodes: Map<NodeId, NodeLayout>): void {
  const placed: Array<{ box: Box }> = [];
  const glyphBoxes: Array<{ box: Box; id: NodeId }> = [];
  for (const p of nodes.values()) {
    glyphBoxes.push({ id: p.id, box: { x0: p.x - 13, y0: p.y - 13, x1: p.x + 13, y1: p.y + 13 } });
  }
  // Stable order: by district then node index (id order is already stable).
  const ordered = [...nodes.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const p of ordered) {
    // Default: the W1 radial anchor.
    let lx = p.x + p.ux * R_ADJUST;
    let ly = p.y + p.uy * R_ADJUST + 3.5;
    let anchor: 'start' | 'end' | 'middle' =
      p.ux > 0.35 ? 'start' : p.ux < -0.35 ? 'end' : 'middle';
    let box = labelBox(lx, ly, anchor);
    const ownGlyph = glyphBoxes.find((g) => g.id === p.id)!.box;
    const clash = (b: Box) =>
      placed.some((q) => hits(b, q.box)) ||
      glyphBoxes.some((g) => g.id !== p.id && hits(b, g.box));
    if (clash(box)) {
      let solved = false;
      for (const [dx, dy, an] of CANDIDATES) {
        const cx = p.x + dx;
        const cy = p.y + dy;
        const cb = labelBox(cx, cy, an);
        if (!clash(cb) && !hits(cb, ownGlyph)) {
          lx = cx;
          ly = cy;
          anchor = an;
          box = cb;
          solved = true;
          break;
        }
      }
      if (!solved) {
        // Nowhere clean — at minimum separate vertically from everything
        // placed so far (deterministic downward stack).
        let ny = ly;
        while (placed.some((q) => hits(labelBox(lx, ny, anchor), q.box))) ny += LABEL_H + 2;
        ly = ny;
        box = labelBox(lx, ly, anchor);
      }
    }
    placed.push({ box });
    p.lx = lx;
    p.ly = ly;
    p.anchor = anchor;
  }
}

export function buildLayout(vm: import('@dead-drop/engine').ValidatedMap): {
  nodes: Map<NodeId, NodeLayout>;
  districts: DistrictLayout[];
} {
  const nodes = new Map<NodeId, NodeLayout>();
  const MAX_HIT = 16;
  for (const n of vm.map.nodes) {
    const d = n.district;
    const idx = Number(n.id.split('-')[1]); // 1..12
    const a = rad(ringOffset(d) + (idx - 1) * 30);
    const c = CENTERS[d];
    const x = c.x + R * Math.cos(a);
    const y = c.y + R * Math.sin(a);
    const glyph: Glyph = n.is_gate
      ? 'diamond'
      : n.is_safehouse
        ? 'triangle'
        : n.is_drop_candidate
          ? 'square'
          : 'circle';
    nodes.set(n.id, { id: n.id, district: d, x, y, ux: Math.cos(a), uy: Math.sin(a), glyph, lx: 0, ly: 0, anchor: 'middle', hitR: MAX_HIT });
  }

  // Readability pass: resolve label placements against each other and the
  // node glyphs (seam collisions). Deterministic; runs once per layout.
  resolveLabels(nodes);

  // Hit-target pass: clamp each node's invisible hit radius to half its
  // nearest-neighbor distance (seam nodes sit ~11px apart — full-size
  // r=16 hit circles overlapped and the later-rendered twin stole clicks).
  const pos = [...nodes.values()];
  for (const p of pos) {
    let nn = Infinity;
    for (const q of pos) {
      if (q.id === p.id) continue;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < nn) nn = d;
    }
    p.hitR = Math.max(6, Math.min(MAX_HIT, nn / 2 - 0.5));
  }

  const districts: DistrictLayout[] = (Object.keys(CENTERS) as DistrictId[]).map((d) => {
    const c = CENTERS[d];
    // Point away from the canvas center = the district's outer corner.
    const dx = c.x - CC.x;
    const dy = c.y - CC.y;
    const len = Math.hypot(dx, dy) || 1;
    return {
      id: d,
      name: vm.map.districts[d],
      x: c.x,
      y: c.y,
      plateR: PLATE_R,
      labelX: c.x + (dx / len) * (PLATE_R + 26),
      labelY: c.y + (dy / len) * (PLATE_R + 26),
    };
  });
  return { nodes, districts };
}

/** Night-map edge styling (M3 W4): F thin pale · T dashed amber · M thick teal. */
export const EDGE_STYLE: Record<EdgeClass, { stroke: string; width: number; dash: string }> = {
  // Night-city palette (M3 W4): pale fog footpaths, amber tram lines,
  // teal metro spine — all read on the ink-navy map plate.
  F: { stroke: '#c9d3e4', width: 1.5, dash: '' },
  T: { stroke: '#e8a33d', width: 2.1, dash: '7,5' },
  M: { stroke: '#4f8f85', width: 4.6, dash: '' },
};

/** Render order: Metro spine first (bottom), then Trams, then Foot on top. */
export function sortedEdges(edges: CityMapEdge[]): CityMapEdge[] {
  const rank = { M: 0, T: 1, F: 2 } as const;
  return [...edges].sort((a, b) => rank[a.type] - rank[b.type]);
}
