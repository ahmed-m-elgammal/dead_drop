/**
 * City-map loading & structural validation (03-rules §1.1; T8 generator
 * obligations live in generator.ts — this file owns only DATA validity).
 *
 * Divergence note (provenance banner in types.ts, T11): the JSON asset
 * declares pools as separate arrays (`drop_candidates` / `gates` /
 * `safehouses`); CityMapNode's is_* flags are DERIVED here at load time.
 *
 * All map checks fail LOUDLY (throw MapValidationError) — the engine never
 * proceeds past invalid data (same hard-gate discipline as the Python
 * oracles in tools/verification/).
 */
import type { CityMap, CityMapEdge, CityMapNode, DistrictId, EdgeClass } from './types.js';
import { PARAMETERS_V1_0_0_ALPHA_1 } from './types.js';

/** Minimal-SP edge cost per class, from the parameter table (never hard-coded). */
export function edgeCost(cls: EdgeClass): number {
  return PARAMETERS_V1_0_0_ALPHA_1.P5_transit_costs[cls];
}

const DISTRICTS: readonly DistrictId[] = ['D1', 'D2', 'D3', 'D4'];
const EDGE_CLASSES: readonly EdgeClass[] = ['F', 'T', 'M'];

export class MapValidationError extends Error {
  constructor(message: string) {
    super(`[MAP VALIDATION FAILURE] ${message}`);
    this.name = 'MapValidationError';
  }
}

function fail(msg: string): never {
  throw new MapValidationError(msg);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export interface ValidatedMap {
  map: CityMap;
  /** Adjacency: node id → neighbor ids with edge class (both directions). */
  adjacency: Map<string, Array<{ node: string; cls: EdgeClass }>>;
  districtOf: Map<string, DistrictId>;
  /** Node pairs served by more than one edge record (legal content; consumers
   *  keep the minimal-SP realization — aud003 §5 convention). */
  parallelEdgePairs: number;
}

/** Validate an already-parsed map JSON object. Shape-strict, then — for
 *  map_alpha — structure-strict (48/84 = 56F+16T+12M, connected, degree 2–7,
 *  disjoint pools ⊆ nodes). v1.2.0-specific facts (24-pool) are asserted by
 *  the L1 tests, not hard-coded here. */
export function validateCityMap(json: unknown): ValidatedMap {
  if (!isRecord(json)) fail('map JSON is not an object');
  const mapId = json['map_id'];
  const version = json['version'];
  if (typeof mapId !== 'string' || typeof version !== 'string') fail('map_id/version missing');

  const districtsRaw = json['districts'];
  if (!isRecord(districtsRaw)) fail('districts missing');
  const districts: Record<DistrictId, string> = {} as Record<DistrictId, string>;
  for (const d of DISTRICTS) {
    const v = districtsRaw[d];
    if (typeof v !== 'string') fail(`district ${d} missing`);
    districts[d] = v;
  }
  if (Object.keys(districtsRaw).length !== DISTRICTS.length) fail('unexpected district count');

  const nodesRaw = json['nodes'];
  if (!Array.isArray(nodesRaw) || nodesRaw.length === 0) fail('nodes missing');
  const districtOf = new Map<string, DistrictId>();
  const nodeIds = new Set<string>();
  for (const n of nodesRaw) {
    if (!isRecord(n)) fail('node is not an object');
    const id = n['id'];
    const dist = n['district'];
    if (typeof id !== 'string' || !/^D[1-4]-\d{2}$/.test(id)) fail(`bad node id ${JSON.stringify(id)}`);
    if (typeof dist !== 'string' || !(DISTRICTS as readonly string[]).includes(dist)) {
      fail(`node ${id}: bad district ${JSON.stringify(dist)}`);
    }
    if (nodeIds.has(id)) fail(`duplicate node ${id}`);
    nodeIds.add(id);
    districtOf.set(id, dist as DistrictId);
  }

  const edgesRaw = json['edges'];
  if (!Array.isArray(edgesRaw) || edgesRaw.length === 0) fail('edges missing');
  const adjacency = new Map<string, Array<{ node: string; cls: EdgeClass }>>();
  for (const id of nodeIds) adjacency.set(id, []);
  const pairCounts = new Map<string, number>();
  const edgeList: CityMapEdge[] = [];
  for (const e of edgesRaw) {
    if (!isRecord(e)) fail('edge is not an object');
    const a = e['a'];
    const b = e['b'];
    const t = e['type'];
    if (typeof a !== 'string' || !nodeIds.has(a)) fail(`edge endpoint ${JSON.stringify(a)} not a node`);
    if (typeof b !== 'string' || !nodeIds.has(b)) fail(`edge endpoint ${JSON.stringify(b)} not a node`);
    if (a === b) fail(`self-loop at ${a}`);
    if (typeof t !== 'string' || !(EDGE_CLASSES as readonly string[]).includes(t)) {
      fail(`edge ${a}-${b}: bad class ${JSON.stringify(t)}`);
    }
    edgeList.push({ a, b, type: t as EdgeClass });
    adjacency.get(a)!.push({ node: b, cls: t as EdgeClass });
    adjacency.get(b)!.push({ node: a, cls: t as EdgeClass });
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }
  const parallelEdgePairs = [...pairCounts.values()].filter((c) => c > 1).length;

  const poolRaw = (key: string): string[] => {
    const v = json[key];
    if (!Array.isArray(v) || v.length === 0) fail(`${key} pool missing`);
    for (const id of v) {
      if (typeof id !== 'string' || !nodeIds.has(id)) fail(`${key}: ${JSON.stringify(id)} not a node`);
    }
    if (new Set(v).size !== v.length) fail(`${key}: duplicate entries`);
    return v as string[];
  };
  const dropCandidates = poolRaw('drop_candidates');
  const gates = poolRaw('gates');
  const safehouses = poolRaw('safehouses');

  // Pools pairwise disjoint (aud003 §6 C1: disjoint "by data; assert regardless").
  const pools: Array<[string, string[]]> = [
    ['drop_candidates', dropCandidates],
    ['gates', gates],
    ['safehouses', safehouses],
  ];
  for (const [n1, p1] of pools) {
    for (const [n2, p2] of pools) {
      if (n1 < n2) {
        const overlap = p1.filter((x) => p2.includes(x));
        if (overlap.length > 0) fail(`pool overlap ${n1}∩${n2}: ${overlap.join(',')}`);
      }
    }
  }

  // Connectivity + degree bounds (any map).
  const start = nodeIds.values().next().value as string;
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const u = queue.pop() as string;
    for (const { node } of adjacency.get(u)!) {
      if (!seen.has(node)) {
        seen.add(node);
        queue.push(node);
      }
    }
  }
  if (seen.size !== nodeIds.size) fail(`map not connected (${seen.size}/${nodeIds.size})`);
  for (const id of nodeIds) {
    const deg = adjacency.get(id)!.length;
    if (deg < 2 || deg > 7) fail(`degree out of bounds at ${id}: ${deg}`);
  }

  // map_alpha structure contract (48/84, class mix) — the published numbers
  // every doc and fixture is tied to (W1 audit; aud003 sanity gates).
  if (mapId === 'map_alpha') {
    if (nodeIds.size !== 48 || edgeList.length !== 84) {
      fail(`map_alpha structure: expected 48 nodes / 84 edges, got ${nodeIds.size}/${edgeList.length}`);
    }
    const mix: Record<EdgeClass, number> = { F: 0, T: 0, M: 0 };
    for (const e of edgeList) mix[e.type] += 1;
    if (mix.F !== 56 || mix.T !== 16 || mix.M !== 12) {
      fail(`map_alpha edge mix: expected 56F/16T/12M, got ${mix.F}F/${mix.T}T/${mix.M}M`);
    }
  }

  const nodes: CityMapNode[] = edgeList.length >= 0
    ? [...nodeIds].map((id) => ({
        id,
        district: districtOf.get(id)!,
        is_gate: gates.includes(id),
        is_safehouse: safehouses.includes(id),
        is_drop_candidate: dropCandidates.includes(id),
      }))
    : [];

  const map: CityMap = {
    map_id: mapId,
    version,
    districts,
    nodes,
    edges: edgeList,
    drop_candidates: dropCandidates,
    gates,
    safehouses,
    notes: typeof json['notes'] === 'string' ? (json['notes'] as string) : '',
  };

  return { map, adjacency, districtOf, parallelEdgePairs };
}
