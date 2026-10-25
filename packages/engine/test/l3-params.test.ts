/**
 * L-level: resolve-layer tests for the T16/ADR-003 simulation parameter
 * overrides + the feasibility `shape` option (S6). The default path is
 * already pinned byte-identical by the existing L1/L3 suites — these tests
 * pin the OVERRIDE paths.
 */
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_PARAMS,
  CaseSession,
  EngineError,
  RETUNED_CANDIDATE_P8_4,
  createCaseState,
  investigatorLegality,
  resolveParams,
} from '../src/engine.js';
import {
  PARAMETERS_V1_0_0_ALPHA_1,
  PARAMETERS_V1_1_ALPHA_CANDIDATE,
} from '../src/types.js';
import { evaluateConfig, minDays } from '../src/feasibility.js';
import { generateCase } from '../src/generator.js';
import { loadAlphaMap, loadFixture } from './helpers.js';
import { loadMicroMap, microConfig } from './micro-map.js';

describe('T16 · resolveParams validation', () => {
  it('no overrides → frozen canonical snapshot', () => {
    const p = resolveParams();
    expect(p).toEqual({
      P1_days_per_case: 8,
      P6_hold_cost: 1,
      P6_hold_max: 2,
      P7_probe_cost: 1,
      P7_probe_daily_cap: 2,
      P8_stakeout_cost: 3,
    });
    expect(Object.isFrozen(p)).toBe(true);
  });

  it('rejects malformed overrides (fail loudly)', () => {
    expect(() => resolveParams({ P1_days_per_case: 0 })).toThrow(EngineError);
    expect(() => resolveParams({ P6_hold_max: -1 })).toThrow(EngineError);
    expect(() => resolveParams({ P7_probe_cost: 1.5 })).toThrow(EngineError);
  });

  it('merges partial overrides onto canonical', () => {
    expect(resolveParams({ P8_stakeout_cost: 2 })).toMatchObject({ P8_stakeout_cost: 2, P7_probe_cost: 1 });
  });
});

describe('v1.1-alpha retuned preset (ADR-004, M2 W4)', () => {
  it('alpha.1 parameter table stays VERBATIM (historical record, P8=3)', () => {
    expect(PARAMETERS_V1_0_0_ALPHA_1.P8_stakeout_cost).toBe(3);
    expect(PARAMETERS_V1_0_0_ALPHA_1.P1_days_per_case).toBe(8);
    expect(PARAMETERS_V1_0_0_ALPHA_1.P3_stamina_budget).toBe(12);
    expect(PARAMETERS_V1_0_0_ALPHA_1.P4_intel_budget).toBe(10);
  });

  it('PARAMETERS_V1_1_ALPHA_CANDIDATE differs from alpha.1 in P8 alone (table-driven, not hard-coded)', () => {
    const keys = Object.keys(PARAMETERS_V1_0_0_ALPHA_1) as Array<keyof typeof PARAMETERS_V1_0_0_ALPHA_1>;
    for (const key of keys) {
      if (key === 'P8_stakeout_cost') continue;
      expect(PARAMETERS_V1_1_ALPHA_CANDIDATE[key]).toEqual(PARAMETERS_V1_0_0_ALPHA_1[key]);
    }
    expect(PARAMETERS_V1_1_ALPHA_CANDIDATE.P8_stakeout_cost).toBe(4);
  });

  it('RETUNED_CANDIDATE_P8_4 = frozen canonical + P8=4 ≡ resolveParams override', () => {
    expect(Object.isFrozen(RETUNED_CANDIDATE_P8_4)).toBe(true);
    expect(RETUNED_CANDIDATE_P8_4).toEqual(resolveParams({ P8_stakeout_cost: 4 }));
    expect(resolveParams()).toEqual(CANONICAL_PARAMS); // default path untouched
  });

  it('micro-map session under the preset deducts 4 IP per stakeout', () => {
    const vm = loadMicroMap();
    const session = new CaseSession(vm, microConfig(), { params: RETUNED_CANDIDATE_P8_4 });
    session.submitFugitive({ idempotency_key: 'f1', action: { kind: 'HOLD' } });
    session.submitInvestigator({ idempotency_key: 'i1', action: { kind: 'STAKEOUT', target: 'D1-02' } });
    expect(session.state.investigator.intel).toBe(6); // 10 − 4
    expect(session.state.investigator.stakeout_armed).toBe('D1-02');
  });

  it('canonical (no params) still deducts 3 IP — default path byte-identical', () => {
    const vm = loadMicroMap();
    const session = new CaseSession(vm, microConfig());
    session.submitFugitive({ idempotency_key: 'f1', action: { kind: 'HOLD' } });
    session.submitInvestigator({ idempotency_key: 'i1', action: { kind: 'STAKEOUT', target: 'D1-02' } });
    expect(session.state.investigator.intel).toBe(7); // 10 − 3
  });
});

describe('T16 · overridden resolution (micro map)', () => {
  const vm = loadMicroMap();

  it('P1=7 → EXPIRY fires at day 7 (not day 8)', () => {
    const session = new CaseSession(vm, microConfig(), { params: { P1_days_per_case: 7, P6_hold_max: 99 } });
    for (let d = 1; d <= 6; d++) {
      session.submitFugitive({ idempotency_key: `f${d}`, action: { kind: 'HOLD' } });
      session.submitInvestigator({ idempotency_key: `i${d}`, action: { kind: 'WAIT' } });
      expect(session.state.day).toBe(d + 1);
    }
    session.submitFugitive({ idempotency_key: 'f7', action: { kind: 'HOLD' } });
    // Day 7: stakeout forbidden (final day under the override), then EXPIRY.
    expect(investigatorLegality(session.state, session.p).stakeout).toBe(false);
    session.endInvestigatorPhase();
    expect(session.state.verdict).toBe('EXPIRY');
    expect(session.state.day).toBe(7);
  });

  it('P6_hold_max=1 → second Hold rejected (§3.3 under override)', () => {
    const session = new CaseSession(vm, microConfig(), { params: { P6_hold_max: 1 } });
    session.submitFugitive({ idempotency_key: 'f1', action: { kind: 'HOLD' } });
    session.endInvestigatorPhase();
    expect(() =>
      session.submitFugitive({ idempotency_key: 'f2', action: { kind: 'HOLD' } }),
    ).toThrow(EngineError);
  });

  it('P7_probe_cost=2 → each probe deducts 2 IP', () => {
    const session = new CaseSession(vm, microConfig(), { params: { P7_probe_cost: 2 } });
    session.submitFugitive({ idempotency_key: 'f1', action: { kind: 'HOLD' } });
    session.submitInvestigator({ idempotency_key: 'i1a', action: { kind: 'PROBE', target: 'D1-02' } });
    expect(session.state.investigator.intel).toBe(8);
  });

  it('P8_stakeout_cost=2 → stakeout deducts 2 IP', () => {
    const session = new CaseSession(vm, microConfig(), { params: { P8_stakeout_cost: 2 } });
    session.submitFugitive({ idempotency_key: 'f1', action: { kind: 'HOLD' } });
    session.submitInvestigator({ idempotency_key: 'i1', action: { kind: 'STAKEOUT', target: 'D1-02' } });
    expect(session.state.investigator.intel).toBe(8);
    expect(session.state.investigator.stakeout_armed).toBe('D1-02');
  });

  it('reveal days validate against the OVERRIDDEN P1', () => {
    const params = resolveParams({ P1_days_per_case: 7 });
    expect(() =>
      createCaseState(vm, microConfig({ reveal_schedule: { district_days: [8], transit_days: [] } }), params),
    ).toThrow(EngineError);
    expect(() =>
      createCaseState(vm, microConfig({ reveal_schedule: { district_days: [7], transit_days: [] } }), params),
    ).not.toThrow();
  });
});

describe('T16 · feasibility shape option (S6 machinery)', () => {
  const vm = loadAlphaMap();
  // Use REAL passing records from the 115-config list (the paper constants
  // were verified for min_days/cheapest_drop2 only — never for C3∧C4).
  const valid = loadFixture<{ configs: Array<{ safehouse: string; drop1: string; drop2: string; gate: string; min_days: number }> }>('valid-configs.json');
  const passing = valid.configs[0]!;
  const sevenDay = valid.configs.find((c) => c.min_days === 7) ?? passing;
  const sixDay = valid.configs.find((c) => c.min_days === 6) ?? passing;

  it('canonical call (no shape) keeps a 115-list record passing', () => {
    const ev = evaluateConfig(vm, passing.safehouse, passing.drop1, passing.drop2, passing.gate);
    expect(ev?.passes).toBe(true);
    expect(ev?.minDays).toBe(passing.min_days);
  });

  it('shifted band [5,6] rejects 7-day cases, keeps 6-day ones (C2 gate only)', () => {
    const rejected = evaluateConfig(vm, sevenDay.safehouse, sevenDay.drop1, sevenDay.drop2, sevenDay.gate, {}, { days: 7, band: [5, 6] });
    expect(rejected).toBeNull();
    const kept = evaluateConfig(vm, sixDay.safehouse, sixDay.drop1, sixDay.drop2, sixDay.gate, {}, { days: 7, band: [5, 6] });
    expect(kept).not.toBeNull();
    expect(kept?.minDays).toBe(6);
  });

  it('widened shape {days:9, band:[5,8]} still admits the 7-day record', () => {
    const kept = evaluateConfig(vm, sevenDay.safehouse, sevenDay.drop1, sevenDay.drop2, sevenDay.gate, {}, { days: 9, band: [5, 8] });
    expect(kept).not.toBeNull();
    expect(kept?.minDays).toBe(7);
  });

  it('generateCase honors the shape and records it in the C5 report', () => {
    const gc = generateCase(vm, 1, { days: 7, band: [5, 6] });
    expect(gc.report.shape).toEqual({ days: 7, band: [5, 6] });
    expect(gc.report.measured.min_days).toBeLessThanOrEqual(6);
    expect(minDays(vm, gc.config.safehouse, gc.config.drops[0]!, gc.config.drops[1]!, gc.config.gate, 7)).toBeLessThanOrEqual(6);
  });

  it('canonical generateCase omits the shape field', () => {
    const gc = generateCase(vm, 1);
    expect(gc.report.shape).toBeUndefined();
  });
});
