/**
 * Case generator — seeded sampling per C1, pinned feasibility gate per
 * C2–C4 (src/feasibility.ts), C5 feasibility report per case, C6 batch
 * diversity. Normative spec: m2/aud003-constraint-analysis.md §6 and
 * 04-balance-sim §6.
 *
 * Determinism guarantee: no Math.random anywhere — every draw comes from the
 * seeded PRNG stream, so (seed → case) and (seed → ladder) are reproducible
 * (the engine's only randomness is the seeded generator, 10-roadmap M2).
 *
 * §9.8 invariants (T8 — unexpressible in types, asserted HERE):
 *   drops[0] ≠ drops[1], gate ∉ drops, pools pairwise disjoint.
 */
import type { CaseConfig, NodeId } from './types.js';
import { MAP_ID_ALPHA, PARAMETERS_V1_0_0_ALPHA_1 as P, RULESET_VERSION } from './types.js';
import type { ValidatedMap } from './map.js';
import { evaluateConfig, type ConfigShape, type EvaluatedConfig } from './feasibility.js';

export class GeneratorError extends Error {
  constructor(message: string) {
    super(`[GENERATOR FAILURE] ${message}`);
    this.name = 'GeneratorError';
  }
}

/* -------------------------------------------------------------- PRNG */
/** mulberry32 — small, fast, fully deterministic 32-bit PRNG. NOT
 *  cryptographic; quality bar here is "same seed ⇒ same stream". */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform int in [0, n). Deterministic given the stream. */
export function rngInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n);
}

/* -------------------------------------------------------------- C5 report */
/** Feasibility report per C5 (aud003 §6) — the audit trail that a published
 *  case was GENERATED, not hand-picked. Implements T8: the structural §9.8
 *  asserts are recorded explicitly. */
export interface FeasibilityReport {
  seed: number;
  map_id: string;
  map_version: string;
  ruleset_version: string;
  config: { safehouse: NodeId; drops: readonly [NodeId, NodeId]; gate: NodeId };
  measured: {
    min_days: number;
    min_cost_sp: number;
    n_prefixes: number;
    c4_margin_days: 1 | 2 | 3 | null;
  };
  structural_asserts: {
    drops_distinct: true;
    gate_not_in_drops: true;
    pools_disjoint: true;
  };
  /** Present ONLY when the case was generated under a non-canonical shape
   *  (T16/ADR-003 — scenario S6). Canonical cases omit it. */
  shape?: { days: number; band: [number, number] };
}

function assertSection98(vm: ValidatedMap, safehouse: NodeId, d1: NodeId, d2: NodeId, gate: NodeId): void {
  if (d1 === d2) throw new GeneratorError(`§9.8 violated: drops[0] === drops[1] (${d1})`);
  if (gate === d1 || gate === d2) throw new GeneratorError(`§9.8 violated: gate (${gate}) ∈ drops`);
  const pools = [vm.map.drop_candidates, vm.map.gates, vm.map.safehouses];
  for (let i = 0; i < pools.length; i++) {
    for (let j = i + 1; j < pools.length; j++) {
      if (pools[i]!.some((x) => pools[j]!.includes(x))) {
        throw new GeneratorError(`§9.8 violated: pools ${i}/${j} overlap`);
      }
    }
  }
  void safehouse;
}

/* -------------------------------------------------------------- C1 sampling */
/** The full ordered case space: safehouses × ordered distinct drops × gates. */
export function enumerateSpace(vm: ValidatedMap): Array<[NodeId, NodeId, NodeId, NodeId]> {
  const out: Array<[NodeId, NodeId, NodeId, NodeId]> = [];
  for (const sh of vm.map.safehouses) {
    for (const d1 of vm.map.drop_candidates) {
      for (const d2 of vm.map.drop_candidates) {
        if (d1 === d2) continue;
        for (const g of vm.map.gates) out.push([sh, d1, d2, g]);
      }
    }
  }
  return out;
}

export interface GeneratedCase {
  config: CaseConfig;
  report: FeasibilityReport;
  evaluation: EvaluatedConfig;
}

const memosCache = new WeakMap<ValidatedMap, {
  drop2: Map<string, number | null>;
  openings: Map<string, Map<string, import('./feasibility.js').Opening>>;
}>();

function memosFor(vm: ValidatedMap) {
  let m = memosCache.get(vm);
  if (!m) {
    m = { drop2: new Map(), openings: new Map() };
    memosCache.set(vm, m);
  }
  return m;
}

/** Seed-rejected sampling per C1: draw (safehouse, ordered drops, gate) from
 *  the full space with the seeded PRNG, evaluate under the pinned gate, and
 *  return the first passing draw together with its C5 report. Deterministic:
 *  the same seed yields the same case. `shape` (T16/ADR-003) sweeps the
 *  P1/P12 pair for scenario S6; stamina stays P3 (S1 sweeps the PLAYED budget
 *  over a fixed case-shape pool — see m2/w3-simulation-report.md conventions). */
export function generateCase(vm: ValidatedMap, seed: number, shape: ConfigShape = {}): GeneratedCase {
  const space = enumerateSpace(vm);
  if (space.length === 0) throw new GeneratorError('empty case space');
  const rng = mulberry32(seed);
  const memos = memosFor(vm);
  const maxDraws = space.length * 100; // pass rate ≈ 5.2% — cap is a safety net only
  for (let draw = 0; draw < maxDraws; draw++) {
    const [sh, d1, d2, g] = space[rngInt(rng, space.length)]!;
    assertSection98(vm, sh, d1, d2, g);
    const ev = evaluateConfig(vm, sh, d1, d2, g, memos, shape);
    if (ev !== null && ev.passes) {
      const config: CaseConfig = {
        map_id: vm.map.map_id,
        ruleset_version: RULESET_VERSION,
        safehouse: sh,
        drops: [d1, d2],
        gate: g,
        stamina_budget: P.P3_stamina_budget,
        intel_budget: P.P4_intel_budget,
        reveal_schedule: {
          district_days: [...P.P9_district_reveal_days],
          transit_days: [...P.P10_transit_reveal_days],
        },
        seed,
      };
      const report: FeasibilityReport = {
        seed,
        map_id: vm.map.map_id,
        map_version: vm.map.version,
        ruleset_version: RULESET_VERSION,
        config: { safehouse: sh, drops: [d1, d2], gate: g },
        measured: {
          min_days: ev.minDays,
          min_cost_sp: ev.minCostSp,
          n_prefixes: ev.nPrefixes,
          c4_margin_days: ev.c4MarginDays,
        },
        structural_asserts: { drops_distinct: true, gate_not_in_drops: true, pools_disjoint: true },
        ...(shape.days !== undefined || shape.band !== undefined
          ? { shape: { days: shape.days ?? P.P1_days_per_case, band: [...(shape.band ?? P.P12_feasibility_band)] as [number, number] } }
          : {}),
      };
      return { config, report, evaluation: ev };
    }
  }
  throw new GeneratorError(`seed ${seed}: no passing config within ${maxDraws} draws — generator or map broken`);
}

/* -------------------------------------------------------------- C6 batching */
/** District-pair class of a config (C6 keying, matching the M2 W1 recount's
 *  district_distribution: sorted drop-district pair | gate district | sh district). */
export function districtClass(vm: ValidatedMap, ev: { drop1: NodeId; drop2: NodeId; gate: NodeId; safehouse: NodeId }): string {
  const d = (n: NodeId) => vm.districtOf.get(n)!;
  const pair = [d(ev.drop1), d(ev.drop2)].sort().join('-');
  return `drops=${pair}|gate=${d(ev.gate)}|sh=${d(ev.safehouse)}`;
}

/** Build one ladder batch (default 24 — the MVP solo ladder size) by seeded
 *  rejection sampling over generated cases. C6: no district-pair class may
 *  supply >50% of the batch; additionally no two consecutive cases share a
 *  class, and no config repeats within a batch. Deterministic per seed. */
export function buildLadder(vm: ValidatedMap, seed: number, size: number = 24): GeneratedCase[] {
  if (size < 1) throw new GeneratorError('ladder size must be ≥ 1');
  const rng = mulberry32(seed ^ 0x5eed1234);
  const classCap = Math.floor(size / 2); // C6: >50% is forbidden ⇒ cap at ⌊n/2⌋
  const out: GeneratedCase[] = [];
  const usedConfigs = new Set<string>();
  const classCounts = new Map<string, number>();
  const maxAttempts = 20000;
  let attempts = 0;
  while (out.length < size) {
    attempts += 1;
    if (attempts > maxAttempts) {
      throw new GeneratorError(`ladder unsatisfiable under C6 within ${maxAttempts} attempts`);
    }
    const candidate = generateCase(vm, rngInt(rng, 0x7fffffff));
    const ev = candidate.evaluation;
    if (usedConfigs.has(ev.key)) continue;
    const cls = districtClass(vm, ev);
    const cnt = classCounts.get(cls) ?? 0;
    if (cnt + 1 > classCap) continue;
    const prev = out[out.length - 1];
    if (prev !== undefined && districtClass(vm, prev.evaluation) === cls) continue;
    usedConfigs.add(ev.key);
    classCounts.set(cls, cnt + 1);
    out.push(candidate);
  }
  return out;
}
