/**
 * L3 GOLDEN — resolve() against the rules' own worked examples (03-rules §10)
 * and the four M1 regression constants (L1 fixture, Python oracle source).
 *
 * These tests are the engine-side half of the freeze contract: the worked
 * examples are the only rules-text data complete enough to pin day-by-day
 * resolution behavior BEFORE human transcripts exist. When S1–S3 transcripts
 * land (freeze-checklist §1), real-log golden fixtures join them here.
 *
 * Deviations from the example prose (documented, none mechanical):
 *   - W3's "spent 4 IP early" is left unspecified in the text; this script
 *     spends nothing early (the mechanics under test — day-8 expiry, a
 *     day-7 stakeout resolving day 8, §9.4 probes — are unaffected).
 *   - W2's days 7–8 are not specified in the text; assertions stop at the
 *     day-7 boundary the text implies.
 */
import { describe, expect, it } from 'vitest';
import {
  CaseSession,
  EngineError,
  runScriptedCase,
  type DayScript,
} from '../src/engine.js';
import { RULESET_VERSION, PARAMETERS_V1_0_0_ALPHA_1 as P, VERDICT_WINNER, type CaseConfig, type PublicEvent } from '../src/types.js';
import { edgeCost } from '../src/map.js';
import { generateCase } from '../src/generator.js';
import { loadAlphaMap } from './helpers.js';
import { loadFixture } from './helpers.js';

const vm = loadAlphaMap();

function canonicalConfig(): CaseConfig {
  return {
    map_id: 'map_alpha',
    ruleset_version: RULESET_VERSION,
    safehouse: 'D2-07',
    drops: ['D2-09', 'D1-10'],
    gate: 'D1-08',
    stamina_budget: 12,
    intel_budget: 10,
    reveal_schedule: { district_days: [3, 6], transit_days: [4] },
    seed: 0,
  };
}

const wait: DayScript = { investigator: [] };

function publicKinds(log: readonly PublicEvent[]): string[] {
  return log.map((e) => e.kind);
}

/* ============ W2 EXIT — seed → generated case → verdict (headless) ======== */

describe('W2 exit criterion — the engine runs a full case from a seed to a verdict', () => {
  it('generated cases (C1–C6 gate) escape on their min-days routes', () => {
    for (const seed of [7, 42, 1234, 99999, 20260101]) {
      const gen = generateCase(vm, seed);
      const c: RegressionCase = {
        case: `seed-${seed}`,
        safehouse: gen.config.safehouse,
        drops: [...gen.config.drops],
        gate: gen.config.gate,
        min_days: gen.evaluation.minDays,
        cheapest_drop2_sp: gen.evaluation.cheapestDrop2Sp,
      };
      const moves = findMinDaysRoute(c);
      expect(moves).toHaveLength(gen.evaluation.minDays); // generator ≡ finder ≡ oracle semantics
      const r = runScriptedCase(vm, gen.config, moves.map((to) => ({ fugitive: { kind: 'MOVE', to } })));
      expect(r.verdict).toBe('ESCAPE');
      expect(r.state.day).toBe(gen.evaluation.minDays);
      expect(r.state.fugitive.drops_collected).toBe(2);
    }
  });
});

/* ============================ W1 — textbook capture (§10) ================ */

describe('W1 — textbook capture, day 2 (rules §10)', () => {
  it('probe HIT converts to a next-day stakeout CAPTURE at step 2', () => {
    const r = runScriptedCase(vm, canonicalConfig(), [
      { fugitive: { kind: 'MOVE', to: 'D2-08' }, investigator: [
        { kind: 'PROBE', target: 'D2-08' },   // HIT (IP 10→9)
        { kind: 'STAKEOUT', target: 'D1-07' } // armed (IP 9→6)
      ] },
      { fugitive: { kind: 'MOVE', to: 'D1-07' } }, // step 2: D1-07 == armed → CAPTURE
    ]);

    expect(r.verdict).toBe('CAPTURE');
    expect(r.winner).toBe('INVESTIGATOR');
    expect(r.state.day).toBe(2);
    expect(r.state.phase).toBe('CASE_OVER');

    // IP ledger from the text: 10 → 9 → 6.
    expect(r.state.investigator.intel).toBe(6);

    // Route: D2-07→D2-08 (F, 1 SP) → D1-07 (T, 2 SP); stamina 12→11→9.
    expect(r.disclosure.fugitive_route).toEqual([
      { day: 1, action: { kind: 'MOVE', to: 'D2-08' }, from: 'D2-07', to: 'D2-08', edge_class: 'F', sp_cost: 1 },
      { day: 2, action: { kind: 'MOVE', to: 'D1-07' }, from: 'D2-08', to: 'D1-07', edge_class: 'T', sp_cost: 2 },
    ]);
    expect(r.state.fugitive.stamina).toBe(9);

    // Private log: 1 probe (hit), 1 stakeout placement — the hit itself is
    // the public VERDICT, so no private miss/strike event exists (§5.2).
    expect(r.state.private_log_investigator).toEqual([
      { day: 1, kind: 'PROBE_RESULT', target: 'D2-08', result: 'HIT' },
      { day: 1, kind: 'STAKEOUT_PLACED', target: 'D1-07' },
    ]);

    // Public log: markers + verdict only — no reveals due days 1–2; the
    // armed stakeout was consumed (§2 step 2, T9).
    expect(r.state.log.map((e) => e.day)).toEqual([1, 2, 2]);
    expect(publicKinds(r.state.log)).toEqual(['DAY_MARKER', 'DAY_MARKER', 'VERDICT']);
    expect(r.state.investigator.stakeout_armed).toBeNull();
  });
});

/* ========= W2 — Hold parity-break, silent miss, drop on day 6 (§10) ======= */

describe('W2 — Hold semantics + silent stakeout miss (rules §10)', () => {
  it('plays the example line day-by-day to the day-7 boundary', () => {
    const r = runScriptedCase(vm, canonicalConfig(), [
      { fugitive: { kind: 'MOVE', to: 'D2-06' }, investigator: [{ kind: 'PROBE', target: 'D2-08' }] }, // MISS
      { fugitive: { kind: 'MOVE', to: 'D2-05' }, investigator: [{ kind: 'PROBE', target: 'D2-04' }] }, // MISS
      { fugitive: { kind: 'MOVE', to: 'D2-04' }, investigator: [
        { kind: 'PROBE', target: 'D2-06' },   // MISS (IP 7)
        { kind: 'STAKEOUT', target: 'D2-09' } // predicting the beeline (IP 7→4)
      ] },
      { fugitive: { kind: 'HOLD' }, investigator: [] }, // SP 8, holds 1; transit reveal "no movement"
      { fugitive: { kind: 'MOVE', to: 'D2-10' }, investigator: [] }, // SP 7
      { fugitive: { kind: 'MOVE', to: 'D2-09' }, investigator: [] }, // SP 6; DROP 1 completes day 6
      // Days 7–8 are a TEST CONTINUATION (the example stops at day 6); any
      // legal line reaches EXPIRY — here: one more Hold, then a move.
      { fugitive: { kind: 'HOLD' }, investigator: [] },              // SP 5, holds 2
      { fugitive: { kind: 'MOVE', to: 'D2-10' }, investigator: [] }, // SP 4; day-8 step 7 → EXPIRY
    ]);

    expect(r.verdict).toBe('EXPIRY');
    expect(r.state.day).toBe(8);
    expect(r.state.log).toContainEqual({ day: 7, kind: 'DAY_MARKER' });

    // SP ledger from the text through day 6: 12→11→10→9→8(Hold)→7→6;
    // the continuation spends 1 (Hold) + 1 (move) more.
    expect(r.state.fugitive.stamina).toBe(4);
    expect(r.state.fugitive.holds_used).toBe(2);

    // Day 3 + day 6 district reveals: Old Town (D2) both times.
    const districts = r.state.log.filter((e) => e.kind === 'DISTRICT_REVEAL');
    expect(districts).toEqual([
      { day: 3, kind: 'DISTRICT_REVEAL', district: 'D2' },
      { day: 6, kind: 'DISTRICT_REVEAL', district: 'D2' },
    ]);

    // Day 4: transit reveal "no movement" (§9.7 — Hold on a transit day).
    // (Day 4's DAY_MARKER — emitted by day 3's clock advance — precedes it.)
    const day4 = r.state.log.filter((e) => e.day === 4);
    expect(publicKinds(day4)).toEqual(['DAY_MARKER', 'TRANSIT_REVEAL']);
    expect(day4[1]).toEqual({ day: 4, kind: 'TRANSIT_REVEAL', move_class: 'NO_MOVEMENT' });

    // Day 6 log ORDER: district reveal (step 3) BEFORE the drop event (step 4).
    const day6 = r.state.log.filter((e) => e.day === 6);
    expect(publicKinds(day6)).toEqual(['DAY_MARKER', 'DISTRICT_REVEAL', 'DROP_COMPLETED']);
    expect(day6[2]).toEqual({ day: 6, kind: 'DROP_COMPLETED', slot: 1, site: 'D2-09' });

    // The stakeout placed day 3 MISSED silently on day 4 (§5.2): the
    // Investigator's private log records it; the public log never does.
    expect(r.state.private_log_investigator).toEqual([
      { day: 1, kind: 'PROBE_RESULT', target: 'D2-08', result: 'MISS' },
      { day: 2, kind: 'PROBE_RESULT', target: 'D2-04', result: 'MISS' },
      { day: 3, kind: 'PROBE_RESULT', target: 'D2-06', result: 'MISS' },
      { day: 3, kind: 'STAKEOUT_PLACED', target: 'D2-09' },
      { day: 4, kind: 'STAKEOUT_MISS', target: 'D2-09' },
    ]);
    expect(publicKinds(r.state.log)).not.toContain('STAKEOUT_MISS');

    // IP ledger: 10 → 9 → 8 → 7 → 4.
    expect(r.state.investigator.intel).toBe(4);
  });
});

/* ================== W3 — EXPIRY and the last-day rules (§10) ============== */

describe('W3 — 8-day exhaustion, EXPIRY verdict (rules §10)', () => {
  const script: DayScript[] = [
    { fugitive: { kind: 'MOVE', to: 'D2-06' }, investigator: [] }, // F,  1 SP
    { fugitive: { kind: 'MOVE', to: 'D2-12' }, investigator: [] }, // M,  3 SP
    { fugitive: { kind: 'MOVE', to: 'D2-06' }, investigator: [] }, // M,  3 SP (district reveal D2)
    { fugitive: { kind: 'MOVE', to: 'D2-07' }, investigator: [] }, // F,  1 SP (transit reveal F)
    { fugitive: { kind: 'MOVE', to: 'D2-08' }, investigator: [] }, // F,  1 SP
    { fugitive: { kind: 'MOVE', to: 'D2-09' }, investigator: [] }, // F,  1 SP — DROP 1 completes
    { fugitive: { kind: 'MOVE', to: 'D2-10' }, investigator: [{ kind: 'STAKEOUT', target: 'D1-08' }] }, // F, 1 SP; armed for day 8
    { fugitive: { kind: 'MOVE', to: 'D2-11' }, investigator: [{ kind: 'PROBE', target: 'D1-08' }] }, // F, 1 SP; miss; §9.4 probe
  ];

  it('burns exactly 12/12 SP, completes drop 1 only, and expires', () => {
    const r = runScriptedCase(vm, canonicalConfig(), script);

    expect(r.verdict).toBe('EXPIRY');
    expect(r.winner).toBe('INVESTIGATOR');
    expect(r.state.day).toBe(8);
    expect(r.state.fugitive.stamina).toBe(0); // 1+3+3+1+1+1+1+1 = 12 of 12
    expect(r.state.fugitive.drops_collected).toBe(1); // second drop never reached

    // Route: 8 moves, exactly the example's shape.
    expect(r.disclosure.fugitive_route).toHaveLength(8);
    expect(r.disclosure.fugitive_route.map((e) => e.to)).toEqual(
      ['D2-06', 'D2-12', 'D2-06', 'D2-07', 'D2-08', 'D2-09', 'D2-10', 'D2-11'],
    );
    expect(r.disclosure.fugitive_route.map((e) => e.sp_cost)).toEqual([1, 3, 3, 1, 1, 1, 1, 1]);

    // Drop 1 completed day 6 at D2-09 (public).
    expect(r.state.log).toContainEqual({ day: 6, kind: 'DROP_COMPLETED', slot: 1, site: 'D2-09' });

    // Day-7 stakeout resolves day 8: D2-11 ≠ D1-08 → silent miss (§9.6-adjacent:
    // arming on day 7 for day 8 is legal; the gate stakeout fails).
    expect(r.state.private_log_investigator).toContainEqual({ day: 8, kind: 'STAKEOUT_MISS', target: 'D1-08' });

    // §9.4: the day-8 probe is legal and logged, and cannot affect the verdict.
    expect(r.state.private_log_investigator).toContainEqual({ day: 8, kind: 'PROBE_RESULT', target: 'D1-08', result: 'MISS' });

    // Verdict event closes the public log.
    expect(r.state.log[r.state.log.length - 1]).toEqual({ day: 8, kind: 'VERDICT', verdict: 'EXPIRY' });
  });

  it('rejects a stakeout placed ON day 8 (§9.3) while probes stay legal', () => {
    const s = new CaseSession(vm, canonicalConfig());
    const route = ['D2-06', 'D2-12', 'D2-06', 'D2-07', 'D2-08', 'D2-09', 'D2-10', 'D2-11'];
    for (let d = 1; d <= 7; d++) {
      s.submitFugitive({ idempotency_key: `f${d}`, action: { kind: 'MOVE', to: route[d - 1]! } });
      s.endInvestigatorPhase();
    }
    // Day 8, step 1 first.
    s.submitFugitive({ idempotency_key: 'f8', action: { kind: 'MOVE', to: 'D2-11' } });
    expect(() => s.submitInvestigator({ idempotency_key: 's8', action: { kind: 'STAKEOUT', target: 'D1-08' } }))
      .toThrowError(/§5\.2\/§9\.3/);
    // Probes remain legal on day 8 (§9.4)…
    s.submitInvestigator({ idempotency_key: 'p8', action: { kind: 'PROBE', target: 'D1-08' } });
    // …and the phase must still be ended explicitly for step 7 to fire.
    s.endInvestigatorPhase();
    expect(s.state.verdict).toBe('EXPIRY');
  });
});

/* ============ §9.6 — capture-by-Hold (W4 mechanics, canonical case) ======= */

describe('§9.6 — stakeout on the occupied node; Holding walks into it', () => {
  it('captures a Fugitive who Holds twice on the armed node', () => {
    const r = runScriptedCase(vm, canonicalConfig(), [
      { fugitive: { kind: 'HOLD' }, investigator: [
        { kind: 'PROBE', target: 'D2-07' },   // HIT — exact pin (IP 10→9)
        { kind: 'STAKEOUT', target: 'D2-07' } // armed on the occupied node (§9.6, IP 9→6)
      ] },
      { fugitive: { kind: 'HOLD' } }, // step 2: D2-07 == armed → CAPTURE
    ]);
    expect(r.verdict).toBe('CAPTURE');
    expect(r.state.day).toBe(2);
    expect(r.state.fugitive.holds_used).toBe(2);
    expect(r.state.fugitive.stamina).toBe(10); // 12 − 1 − 1
    expect(r.state.private_log_investigator).toEqual([
      { day: 1, kind: 'PROBE_RESULT', target: 'D2-07', result: 'HIT' },
      { day: 1, kind: 'STAKEOUT_PLACED', target: 'D2-07' },
    ]);
  });

  it('does NOT capture a Fugitive who moves away — silent miss instead', () => {
    // Session-driven (not the full-case driver): the example's point is the
    // day-1→2 stakeout interaction, and the case is still live afterwards.
    const s = new CaseSession(vm, canonicalConfig());
    s.submitFugitive({ idempotency_key: 'f1', action: { kind: 'HOLD' } });
    s.submitInvestigator({ idempotency_key: 's1', action: { kind: 'STAKEOUT', target: 'D2-07' } });
    s.endInvestigatorPhase(); // → day 2
    s.submitFugitive({ idempotency_key: 'f2', action: { kind: 'MOVE', to: 'D2-08' } }); // step 2: miss
    expect(s.state.verdict).toBeNull();
    expect(s.state.private_log_investigator).toEqual([
      { day: 1, kind: 'STAKEOUT_PLACED', target: 'D2-07' },
      { day: 2, kind: 'STAKEOUT_MISS', target: 'D2-07' },
    ]);
    s.endInvestigatorPhase(); // → day 3
    s.submitFugitive({ idempotency_key: 'f3', action: { kind: 'MOVE', to: 'D2-09' } });
    expect(s.state.log).toContainEqual({ day: 3, kind: 'DROP_COMPLETED', slot: 1, site: 'D2-09' });
  });
});

/* ======= M1 regression constants — min-days scripted ESCAPE end-to-end ==== */

interface RegressionCase {
  case: string;
  safehouse: string;
  drops: [string, string];
  gate: string;
  min_days: number;
  cheapest_drop2_sp: number;
}

/** Test-local min-days route finder (BFS over (node, SP, drops) day-layers,
 *  parent-tracked). Mirrors src/feasibility.ts minDays() but returns the
 *  PATH; used only to script the driver. Its day-count is cross-asserted
 *  against the Python-emitted fixture below. */
function findMinDaysRoute(c: RegressionCase): string[] {
  const key = (n: string, sp: number, d: number) => `${n}|${sp}|${d}`;
  const collect = (d: 0 | 1 | 2, at: string): 0 | 1 | 2 => {
    if (d < 2 && at === (d === 0 ? c.drops[0] : c.drops[1])) return (d + 1) as 1 | 2;
    return d;
  };
  const start: { node: string; sp: number; drops: 0 | 1 | 2 } = {
    node: c.safehouse,
    sp: P.P3_stamina_budget,
    drops: 0,
  };
  const parents = new Map<string, { prev: string | null; to: string }>();
  const seen = new Set([key(start.node, start.sp, start.drops)]);
  parents.set(key(start.node, start.sp, start.drops), { prev: null, to: start.node });
  let frontier = [start];
  for (let day = 1; day <= 8; day++) {
    const next: typeof frontier = [];
    for (const st of frontier) {
      for (const e of vm.adjacency.get(st.node)!) {
        const cost = edgeCost(e.cls);
        if (st.sp < cost) continue;
        const nd = collect(st.drops, e.node);
        const k = key(e.node, st.sp - cost, nd);
        if (!seen.has(k)) {
          seen.add(k);
          parents.set(k, { prev: key(st.node, st.sp, st.drops), to: e.node });
          next.push({ node: e.node, sp: st.sp - cost, drops: nd });
        }
        if (nd === 2 && e.node === c.gate) {
          // Reconstruct the move list.
          const moves: string[] = [];
          let cur: string | null = k;
          while (cur !== null) {
            const rec: { prev: string | null; to: string } = parents.get(cur)!;
            if (rec.prev !== null) moves.unshift(rec.to);
            cur = rec.prev;
          }
          return moves;
        }
      }
    }
    frontier = next;
  }
  throw new Error(`no completing route found for ${c.case} — fixture or finder broken`);
}

describe('M1 regression constants — scripted min-days escape (L1 fixture × resolve)', () => {
  const cases = loadFixture<{ cases: RegressionCase[] }>('regression-cases.json').cases;

  for (const c of cases) {
    it(`${c.case}: escapes on day ${c.min_days} with drops collected in order`, () => {
      const moves = findMinDaysRoute(c);
      expect(moves).toHaveLength(c.min_days); // finder ≡ oracle day-count

      const config: CaseConfig = {
        map_id: 'map_alpha',
        ruleset_version: RULESET_VERSION,
        safehouse: c.safehouse,
        drops: c.drops,
        gate: c.gate,
        stamina_budget: P.P3_stamina_budget,
        intel_budget: P.P4_intel_budget,
        reveal_schedule: { district_days: [3, 6], transit_days: [4] },
        seed: 0,
      };
      const script: DayScript[] = moves.map((to) => ({ fugitive: { kind: 'MOVE', to } }));
      const r = runScriptedCase(vm, config, script);

      expect(r.verdict).toBe('ESCAPE');
      expect(r.winner).toBe('FUGITIVE');
      expect(r.state.day).toBe(c.min_days); // escape fires the day the route ends
      expect(r.state.fugitive.drops_collected).toBe(2);
      expect(r.state.fugitive.stamina).toBeGreaterThanOrEqual(0);

      // Drops completed in ORDER (§2 step 4 / §9.8), one event each.
      const drops = r.state.log.filter((e) => e.kind === 'DROP_COMPLETED');
      expect(drops.map((e) => (e as { slot: number }).slot)).toEqual([1, 2]);
      expect(drops.map((e) => (e as { site: string }).site)).toEqual([...c.drops]);

      // Escape check is step 5: the VERDICT event must follow the last drop.
      expect(publicKinds(r.state.log).lastIndexOf('VERDICT'))
        .toBeGreaterThan(publicKinds(r.state.log).lastIndexOf('DROP_COMPLETED'));

      // Scheduled reveals still fired on their days (§2 step 3).
      expect(r.state.log.some((e) => e.kind === 'DISTRICT_REVEAL' && e.day === 3)).toBe(true);
      expect(r.state.log.some((e) => e.kind === 'DISTRICT_REVEAL' && e.day === 6)).toBe(true);
      expect(r.state.log.some((e) => e.kind === 'TRANSIT_REVEAL' && e.day === 4)).toBe(true);
    });
  }

  it('exposes VERDICT_WINNER consistently with §6', () => {
    expect(VERDICT_WINNER.ESCAPE).toBe('FUGITIVE');
    expect(VERDICT_WINNER.CAPTURE).toBe('INVESTIGATOR');
    expect(VERDICT_WINNER.EXPIRY).toBe('INVESTIGATOR');
    expect(VERDICT_WINNER.VOID).toBe('NOBODY');
  });

  it('guards EngineError export shape (typed codes, not string matches)', () => {
    const err = new EngineError('CONFIG_INVALID', 'x');
    expect(err.code).toBe('CONFIG_INVALID');
    expect(err.name).toBe('EngineError');
  });
});
