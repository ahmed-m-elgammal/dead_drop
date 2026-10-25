/**
 * Case-config feasibility gate — 1:1 port of the PINNED semantics from
 * `tools/verification/dd_m2_aud003_constraints.py` (M2 W1 oracle), which is
 * normative per `m2/aud003-constraint-analysis.md` §1/§6:
 *
 *   C2  min completion days (BFS over (node, SP, drop-progress), moves only)
 *       within the P12 band [5,7] at SP = P3 (12).
 *   C3  ≥3 distinct day-1..3 end-position prefixes among GLOBALLY
 *       minimal-SP-cost completing routes (≤ P1 days, ≤ P3 SP), hold-free
 *       openings only, minimal-SP realization per position triple (the map's
 *       single parallel-edge pair — aud003 §5 convention).
 *   C4  the CASE gate (§3.1 erratum: never "either gate") reachable from the
 *       drop-2 site within 3 days at the SP remaining after the cheapest
 *       drop-2 route (W1 any-day convention, budget-capped Dijkstra).
 *
 * Every function is a deterministic pure computation; internal cross-checks
 * (BFS min-days vs forward-DP first completion) throw on disagreement — the
 * same fail-loudly discipline as the Python oracle.
 *
 * Parameters are imported from PARAMETERS_V1_0_0_ALPHA_1 — never hard-coded
 * (m1/m2-handoff.md §1.3). NOTE: the Python oracle fixes SP_BUDGET=12 and
 * CASE_DAYS=8 as module constants; this port reads them from the parameter
 * table, which currently holds the same values — the L1 fixtures assert
 * equality of RESULTS, so any future parameter drift fails tests loudly.
 */
import type { NodeId } from './types.js';
import { PARAMETERS_V1_0_0_ALPHA_1 as P } from './types.js';
import { edgeCost, type ValidatedMap } from './map.js';

const SP_BUDGET: number = P.P3_stamina_budget;
const CASE_DAYS: number = P.P1_days_per_case;
const C2_BAND: readonly [number, number] = P.P12_feasibility_band;
const INF = Number.POSITIVE_INFINITY;

export class FeasibilityInternalError extends Error {
  constructor(message: string) {
    super(`[FEASIBILITY INTERNAL CHECK FAILED] ${message}`);
    this.name = 'FeasibilityInternalError';
  }
}

type ProgressState = { node: NodeId; sp: number; drops: 0 | 1 | 2 };
const key = (n: string, d: number): string => `${n}|${d}`;

function collect(d: 0 | 1 | 2, at: NodeId, d1: NodeId, d2: NodeId): 0 | 1 | 2 {
  // Position-based collection at each day end (rules §2 step 4 / §3.3; AUD-004):
  // arriving at the CURRENT pending drop site collects it, in order.
  if (d < 2 && at === (d === 0 ? d1 : d2)) return (d + 1) as 1 | 2;
  return d;
}

/** C2 machinery — BFS by day-layers over (node, sp, drops). Moves only (a Hold
 *  is dominated for completion). Returns the earliest completion day, or null. */
export function minDays(
  vm: ValidatedMap, sh: NodeId, d1: NodeId, d2: NodeId, gate: NodeId,
  cap: number = CASE_DAYS,
): number | null {
  const start: ProgressState = { node: sh, sp: SP_BUDGET, drops: 0 };
  const seen = new Set<string>([key(start.node, start.sp) + `|${start.drops}`]);
  let frontier: ProgressState[] = [start];
  for (let day = 1; day <= cap; day++) {
    const next: ProgressState[] = [];
    for (const st of frontier) {
      for (const { node: m, cls } of vm.adjacency.get(st.node)!) {
        const c = edgeCost(cls);
        if (st.sp < c) continue;
        const nd = collect(st.drops, m, d1, d2);
        if (nd === 2 && m === gate) return day;
        const k = `${m}|${st.sp - c}|${nd}`;
        if (!seen.has(k)) {
          seen.add(k);
          next.push({ node: m, sp: st.sp - c, drops: nd });
        }
      }
    }
    frontier = next;
    if (frontier.length === 0) return null;
  }
  return null;
}

/** Cheapest SP to arrive at the drop-2 site with drop-1 collected (W1
 *  convention: any day count, budget-capped). Dijkstra over (node, drops). */
export function cheapestDrop2(
  vm: ValidatedMap, sh: NodeId, d1: NodeId, d2: NodeId,
  memo: Map<string, number | null> = new Map(),
): number | null {
  const memoKey = `${sh}|${d1}|${d2}`;
  const hit = memo.get(memoKey);
  if (hit !== undefined) return hit;
  const best = new Map<string, number>([[key(sh, 0), 0]]);
  // Tiny state space (≤ 48×3) — array-scan priority queue is sufficient.
  const pq: Array<{ c: number; n: NodeId; d: 0 | 1 | 2 }> = [{ c: 0, n: sh, d: 0 }];
  let out: number | null = null;
  while (pq.length > 0) {
    let mi = 0;
    for (let i = 1; i < pq.length; i++) if (pq[i]!.c < pq[mi]!.c) mi = i;
    const { c: s, n, d } = pq.splice(mi, 1)[0]!;
    if (s > (best.get(key(n, d)) ?? INF)) continue;
    if (d === 2) {
      out = s;
      break;
    }
    for (const { node: m, cls } of vm.adjacency.get(n)!) {
      const c = edgeCost(cls);
      const ns = s + c;
      if (ns > SP_BUDGET) continue;
      const nd = collect(d, m, d1, d2);
      const k = key(m, nd);
      if (ns < (best.get(k) ?? INF)) {
        best.set(k, ns);
        pq.push({ c: ns, n: m, d: nd });
      }
    }
  }
  memo.set(memoKey, out);
  return out;
}

/** layers[k][(n,d)] = min SP cost of a k-move sequence from (n,d) ending in a
 *  completion-arrival (arrive at the case gate with both drops). k = 0..kmax.
 *  layers[0] is empty (0 moves never complete from any state). */
export function backwardLayers(
  vm: ValidatedMap, d1: NodeId, d2: NodeId, gate: NodeId,
  kmax: number = CASE_DAYS - 3,
): Array<Map<string, number>> {
  const layers: Array<Map<string, number>> = [new Map()];
  for (let k = 1; k <= kmax; k++) {
    const prev = layers[k - 1]!;
    const next = new Map<string, number>();
    for (const n of vm.map.nodes.map((x) => x.id)) {
      for (const d of [0, 1, 2] as const) {
        let best = INF;
        for (const { node: m, cls } of vm.adjacency.get(n)!) {
          const c = edgeCost(cls);
          const nd = collect(d, m, d1, d2);
          if (nd === 2 && m === gate) {
            if (c < best) best = c;
          } else {
            const sub = prev.get(key(m, nd));
            if (sub !== undefined && sub + c < best) best = sub + c;
          }
        }
        if (best < INF) next.set(key(n, d), best);
      }
    }
    layers.push(next);
  }
  return layers;
}

/** mdays[d] = min SP cost of a completing route of exactly d moves
 *  (budget-capped), d = 1..dmax. Moves only. */
export function forwardCosts(
  vm: ValidatedMap, sh: NodeId, d1: NodeId, d2: NodeId, gate: NodeId,
  dmax: number = CASE_DAYS,
): number[] {
  const mdays: number[] = new Array<number>(dmax + 1).fill(INF);
  let cur = new Map<string, number>([[key(sh, 0), 0]]);
  for (let day = 1; day <= dmax; day++) {
    const next = new Map<string, number>();
    for (const [nk, s] of cur) {
      const [n, d] = nk.split('|') as [NodeId, string];
      const dd = Number(d) as 0 | 1 | 2;
      for (const { node: m, cls } of vm.adjacency.get(n)!) {
        const c = edgeCost(cls);
        const ns = s + c;
        if (ns > SP_BUDGET) continue;
        const nd = collect(dd, m, d1, d2);
        if (nd === 2 && m === gate) {
          if (ns < mdays[day]!) mdays[day] = ns;
          continue;
        }
        const k = key(m, nd);
        if (ns < (next.get(k) ?? INF)) next.set(k, ns);
      }
    }
    cur = next;
    if (cur.size === 0) break;
  }
  return mdays;
}

export interface Opening {
  /** Min SP spent by the hold-free realizations of this opening. */
  spent: number;
  /** Min SP spent by any realization (Holds allowed) of this opening. */
  spentH: number;
  holdFree: boolean;
}

/** All 3-action openings from the safehouse, keyed by the action triple
 *  (moves recorded as node ids — parallel-edge realizations collapse to the
 *  same key with min spend; 'H' marks a Hold). Drop collection is
 *  position-based at each day end (rules §2 step 4 / §3.3). */
export function openings3(
  vm: ValidatedMap, d1: NodeId, d2: NodeId,
  memo: Map<string, Map<string, Opening>> = new Map(),
): (sh: NodeId) => Map<string, Opening> {
  return (sh: NodeId) => {
    const cached = memo.get(`${d1}|${d2}|${sh}`);
    if (cached) return cached;

    const holdCost = P.P6_hold_cost;
    const holdMax = P.P6_hold_max;
    const step = (
      pos: NodeId, d: 0 | 1 | 2, spent: number, holds: number,
      action: { kind: 'MOVE'; to: NodeId; cost: number } | { kind: 'HOLD' },
    ): ProgressState & { holds: number } | null => {
      if (action.kind === 'HOLD') {
        if (holds >= holdMax || spent + holdCost > SP_BUDGET) return null;
        const nd = collect(d, pos, d1, d2);
        return { node: pos, sp: spent + holdCost, drops: nd, holds: holds + 1 };
      }
      if (spent + action.cost > SP_BUDGET) return null;
      const nd = collect(d, action.to, d1, d2);
      return { node: action.to, sp: spent + action.cost, drops: nd, holds };
    };

    type Path = { st: ProgressState & { holds: number }; acts: string[]; hadHold: boolean };
    let level: Path[] = [];
    for (const { node: m, cls } of vm.adjacency.get(sh)!) {
      const r = step(sh, 0, 0, 0, { kind: 'MOVE', to: m, cost: edgeCost(cls) });
      if (r) level.push({ st: r, acts: [m], hadHold: false });
    }
    const r0 = step(sh, 0, 0, 0, { kind: 'HOLD' });
    if (r0) level.push({ st: r0, acts: ['H'], hadHold: true });
    for (let i = 0; i < 2; i++) {
      const next: Path[] = [];
      for (const p of level) {
        for (const { node: m, cls } of vm.adjacency.get(p.st.node)!) {
          const r = step(p.st.node, p.st.drops, p.st.sp, p.st.holds, { kind: 'MOVE', to: m, cost: edgeCost(cls) });
          if (r) next.push({ st: r, acts: [...p.acts, m], hadHold: p.hadHold });
        }
        const r = step(p.st.node, p.st.drops, p.st.sp, p.st.holds, { kind: 'HOLD' });
        if (r) next.push({ st: r, acts: [...p.acts, 'H'], hadHold: true });
      }
      level = next;
    }
    const out = new Map<string, Opening>();
    for (const p of level) {
      const tri = p.acts.join('>');
      const rec = out.get(tri) ?? { spent: INF, spentH: INF, holdFree: !p.hadHold };
      if (!p.hadHold) {
        rec.holdFree = true;
        rec.spent = Math.min(rec.spent, p.st.sp);
      }
      rec.spentH = Math.min(rec.spentH, p.st.sp);
      out.set(tri, rec);
    }
    memo.set(`${d1}|${d2}|${sh}`, out);
    return out;
  };
}

/** The full per-config evaluation under the pinned reading (C3-A + case-gate
 *  C4). Returns null when C2 fails; otherwise the C5-shaped measured record. */
export interface EvaluatedConfig {
  key: string;
  safehouse: NodeId;
  drop1: NodeId;
  drop2: NodeId;
  gate: NodeId;
  /** C2: BFS minimal completion days. */
  minDays: number;
  /** Globally minimal SP cost of any ≤8-day completing route (M*). */
  minCostSp: number;
  /** C3-A: distinct hold-free opening prefixes lying on a min-cost route. */
  nPrefixes: number;
  /** Cheapest drop-2-arrival-with-drop-1 cost (W1 convention). */
  cheapestDrop2Sp: number;
  /** C4 (case-gate semantics). */
  c4Case: boolean;
  /** Min k ∈ {1,2,3} reaching the gate affordably; null if never (C5 field). */
  c4MarginDays: 1 | 2 | 3 | null;
  /** Pinned conjunction C2 ∧ C3-A ∧ C4. */
  passes: boolean;
}

export interface ConfigShape {
  /** P1 sweep value (S6). Default: parameter table's P1_days_per_case. */
  days?: number;
  /** P12 band override, shifted with P1 per 04-balance-sim §4.4 S6.
   *  Default: parameter table's P12_feasibility_band. */
  band?: readonly [number, number];
}

/** The full per-config evaluation under the pinned reading (C3-A + case-gate
 *  C4). Returns null when C2 fails; otherwise the C5-shaped measured record.
 *  `shape` (T16/ADR-003) sweeps the P1/P12 pair for scenario S6; omitted ⇒
 *  canonical 8-day / [5,7] behavior, byte-identical to the M2-W1 oracle. */
export function evaluateConfig(
  vm: ValidatedMap, sh: NodeId, d1: NodeId, d2: NodeId, gate: NodeId,
  memos: { drop2?: Map<string, number | null>; openings?: Map<string, Map<string, Opening>> } = {},
  shape: ConfigShape = {},
): EvaluatedConfig | null {
  const days = shape.days ?? CASE_DAYS;
  const band = shape.band ?? C2_BAND;
  const md = minDays(vm, sh, d1, d2, gate, days);
  if (md === null || md < band[0] || md > band[1]) return null;

  const layers = backwardLayers(vm, d1, d2, gate, days - 3);
  const mdays = forwardCosts(vm, sh, d1, d2, gate, days);
  // Internal consistency: BFS min-days must equal the forward DP's first
  // completion day (Python oracle: fail() on disagreement).
  const firstFinite = mdays.findIndex((v, i) => i >= 1 && v < INF);
  if (firstFinite !== md) {
    throw new FeasibilityInternalError(
      `min_days(BFS)=${md} vs forward DP first completion day ${firstFinite} for ${sh}/${d1}/${d2}/${gate}`,
    );
  }
  const mStar = Math.min(...mdays.slice(1));

  const openFactory = openings3(vm, d1, d2, memos.openings ?? new Map());
  const c3a = countPrefixes(vm, layers, d1, d2, gate, sh, openFactory(sh), mStar, days);

  const c2cost = cheapestDrop2(vm, sh, d1, d2, memos.drop2);
  if (c2cost === null) {
    throw new FeasibilityInternalError(`in-band config with no affordable drop-2 route: ${sh}/${d1}/${d2}/${gate}`);
  }
  const remaining = SP_BUDGET - c2cost;
  let c4Case = false;
  let c4Margin: 1 | 2 | 3 | null = null;
  for (const k of [1, 2, 3] as const) {
    const b = layers[k]!.get(key(d2, 2));
    if (b !== undefined && b <= remaining) {
      c4Case = true;
      c4Margin = k;
      break;
    }
  }
  return {
    key: `${sh}|${d1}|${d2}|${gate}`,
    safehouse: sh, drop1: d1, drop2: d2, gate,
    minDays: md,
    minCostSp: mStar,
    nPrefixes: c3a,
    cheapestDrop2Sp: c2cost,
    c4Case,
    c4MarginDays: c4Margin,
    passes: c3a >= 3 && c4Case,
  };
}

/** C3-A count: distinct hold-free opening position-triples that sit on some
 *  globally min-cost completing route (opening spent + cheapest k-move
 *  completion == M*, k = 0..days-3, i.e. total ≤ days moves). */
function countPrefixes(
  vm: ValidatedMap,
  layers: Array<Map<string, number>>,
  d1: NodeId, d2: NodeId, gate: NodeId, sh: NodeId,
  open: Map<string, Opening>,
  mStar: number,
  days: number,
): number {
  let count = 0;
  for (const [tri, rec] of open) {
    if (!rec.holdFree) continue;
    // Replay the triple's moves (key format: 'node>node>node' — hold-free
    // triples contain no 'H').
    const moves = tri.split('>');
    let d: 0 | 1 | 2 = 0;
    let pos: NodeId = sh;
    for (const m of moves) {
      pos = m;
      if (d < 2 && pos === (d === 0 ? d1 : d2)) d = (d + 1) as 1 | 2;
    }
    const v3 = pos;
    const drops3 = d;
    for (let k = 0; k <= days - 3; k++) {
      const b = layers[k]!.get(key(v3, drops3));
      if (b !== undefined && rec.spent + b === mStar) {
        count += 1;
        break;
      }
    }
  }
  return count;
}
