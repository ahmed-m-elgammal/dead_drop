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

export function buildLayout(vm: import('@dead-drop/engine').ValidatedMap): {
  nodes: Map<NodeId, NodeLayout>;
  districts: DistrictLayout[];
} {
  const nodes = new Map<NodeId, NodeLayout>();
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
    nodes.set(n.id, { id: n.id, district: d, x, y, ux: Math.cos(a), uy: Math.sin(a), glyph });
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

/** Paper-map edge styling, ported 1:1 (F thin solid · T dashed amber · M thick blue). */
export const EDGE_STYLE: Record<EdgeClass, { stroke: string; width: number; dash: string }> = {
  F: { stroke: '#1a1a1a', width: 1.4, dash: '' },
  T: { stroke: '#b0722c', width: 2.0, dash: '7,5' },
  M: { stroke: '#274e8f', width: 4.4, dash: '' },
};

/** Render order: Metro spine first (bottom), then Trams, then Foot on top. */
export function sortedEdges(edges: CityMapEdge[]): CityMapEdge[] {
  const rank = { M: 0, T: 1, F: 2 } as const;
  return [...edges].sort((a, b) => rank[a.type] - rank[b.type]);
}
