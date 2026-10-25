/**
 * Synthetic MICRO map + configs for resolve() edge-case tests.
 *
 * NOT game content — a minimal graph engineered so every §9 ruling is
 * reachable in a few days. validateCityMap applies only its generic checks
 * here (the map_alpha structure contract keys off map_id === 'map_alpha').
 *
 * Layout (all nodes district D1):
 *
 *   S=D1-01 (safehouse) — A=D1-02 (drop 1) — B=D1-03
 *        |                   |                  |
 *        T                   F                  M
 *        |                   |                  |
 *   (S–B) ——————  C=D1-04 (drop 2) ——— X=D1-06 — G=D1-05 (gate)
 *
 *   Edges: S–A F · S–B T · A–B F · A–C F · B–X M · C–X T · C–G F · X–G M
 *   (connected, degrees 2–3, pools disjoint, no parallel pairs)
 *
 * Key reachability facts used by the tests:
 *   - Escape S→A→C→G: 3 days, 3 SP, drops collected in order on arrival.
 *   - X's neighbors are B(T2), C(T2), G(M3): at 1 SP the only legal action is
 *     Hold; at 0 SP the day is stranded (§9.13) — the micro analogue of the
 *     map_alpha "min edge cost is 1 everywhere" invariant being VIOLATED,
 *     which is exactly the general condition §9.13 must handle.
 *   - G's neighbors are C(F1), X(M3): a 0-SP fugitive at G is also stranded.
 */
import type { CaseConfig } from '../src/types.js';
import { RULESET_VERSION } from '../src/types.js';
import { validateCityMap, type ValidatedMap } from '../src/map.js';

export const S = 'D1-01';
export const A = 'D1-02'; // drop 1
export const B = 'D1-03';
export const C = 'D1-04'; // drop 2
export const G = 'D1-05'; // gate
export const X = 'D1-06';

let cached: ValidatedMap | null = null;

export function loadMicroMap(): ValidatedMap {
  if (cached) return cached;
  const raw = {
    map_id: 'test_micro',
    version: '0.1.0',
    districts: { D1: 'Micro Test District', D2: 'unused-2', D3: 'unused-3', D4: 'unused-4' },
    nodes: [S, A, B, C, G, X].map((id) => ({ id, district: 'D1' })),
    edges: [
      { a: S, b: A, type: 'F' },
      { a: S, b: B, type: 'T' },
      { a: A, b: B, type: 'F' },
      { a: A, b: C, type: 'F' },
      { a: B, b: X, type: 'M' },
      { a: C, b: X, type: 'T' },
      { a: C, b: G, type: 'F' },
      { a: X, b: G, type: 'M' },
    ],
    drop_candidates: [A, C],
    gates: [G],
    safehouses: [S],
    notes: 'SYNTHETIC TEST FIXTURE — not game content; never ship or print this map.',
  };
  cached = validateCityMap(raw);
  return cached;
}

/** Default micro config; tests override fields via the patch argument. */
export function microConfig(patch: Partial<CaseConfig> = {}): CaseConfig {
  return {
    map_id: 'test_micro',
    ruleset_version: RULESET_VERSION,
    safehouse: S,
    drops: [A, C],
    gate: G,
    stamina_budget: 12,
    intel_budget: 10,
    reveal_schedule: { district_days: [], transit_days: [] },
    seed: 0,
    ...patch,
  };
}
