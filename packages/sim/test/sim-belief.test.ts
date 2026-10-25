/**
 * Sim-layer tests — BeliefTracker exactness on the synthetic micro map.
 * Hand-computed posteriors pin the filter against engine-driven views and
 * against synthetic views carrying specific evidence.
 */
import { describe, expect, it } from 'vitest';
import { CaseSession, resolveParams, type InvestigatorView } from '@dead-drop/engine';
import { loadMicroMap, microConfig } from '../../engine/test/micro-map.js';
import { BeliefTracker } from '../src/belief.js';

const params = resolveParams();

describe('BeliefTracker · day-1 unobserved transition (hand-computed)', () => {
  const vm = loadMicroMap();
  // From S: moves A (F1), B (T2); Hold at S — uniform over 3 legal actions.
  it('spreads uniformly over {A, B, S}', () => {
    const t = new BeliefTracker(vm, 'D1-01', 12, 'D1-02', 'D1-04', params);
    const session = new CaseSession(vm, microConfig());
    void session;
    t.markDay(1);
    const m = t.nodeMarginal();
    expect(m.get('D1-02')).toBeCloseTo(1 / 3, 10);
    expect(m.get('D1-03')).toBeCloseTo(1 / 3, 10);
    expect(m.get('D1-01')).toBeCloseTo(1 / 3, 10);
    expect(m.size).toBe(3);
  });

  it('predictive mass at A after one more unobserved day = 5/18', () => {
    const t = new BeliefTracker(vm, 'D1-01', 12, 'D1-02', 'D1-04', params);
    t.markDay(1);
    // From A (sp11,drops1): 4 options {S,B,C,hold@A} · From B (sp10): 4 options
    // {S,X,A,hold@B} · From S (holds1): 3 options {A,B,hold@S}. Uniform-over-
    // legal-actions prior ⇒ P(A') = 1/3·1/4 + 1/3·1/4 + 1/3·1/3 = 5/18.
    expect(t.predictiveMassAt('D1-02')).toBeCloseTo(5 / 18, 10);
    // Non-mutating: the current marginal is unchanged.
    expect(t.massAt('D1-02')).toBeCloseTo(1 / 3, 10);
  });
});

describe('BeliefTracker · evidence conditioning (engine-driven views)', () => {
  const vm = loadMicroMap();

  it('probe HIT collapses the posterior to the target', () => {
    const session = new CaseSession(vm, microConfig());
    session.submitFugitive({ idempotency_key: 'f1', action: { kind: 'MOVE', to: 'D1-02' } });
    session.submitInvestigator({ idempotency_key: 'i1', action: { kind: 'PROBE', target: 'D1-02' } });
    const t = new BeliefTracker(vm, 'D1-01', 12, 'D1-02', 'D1-04', params);
    t.sync(session.investigatorView());
    expect(t.massAt('D1-02')).toBe(1);
  });

  it('probe MISS eliminates the target (no drop event on a non-drop move)', () => {
    const session = new CaseSession(vm, microConfig());
    session.submitFugitive({ idempotency_key: 'f1', action: { kind: 'MOVE', to: 'D1-03' } }); // B — not a drop site
    session.submitInvestigator({ idempotency_key: 'i1', action: { kind: 'PROBE', target: 'D1-02' } }); // probe A → MISS
    const t = new BeliefTracker(vm, 'D1-01', 12, 'D1-02', 'D1-04', params);
    t.sync(session.investigatorView());
    const m = t.nodeMarginal();
    expect(m.has('D1-02')).toBe(false); // probed node eliminated
    expect(m.get('D1-03')).toBeCloseTo(0.5, 10); // B and S survive
    expect(m.get('D1-01')).toBeCloseTo(0.5, 10);
  });

  it('TRANSIT NO_MOVEMENT on a Hold day → only the voluntary-hold state survives (sp −1, holds +1)', () => {
    const session = new CaseSession(vm, microConfig({ reveal_schedule: { district_days: [], transit_days: [1] } }));
    session.submitFugitive({ idempotency_key: 'f1', action: { kind: 'HOLD' } });
    const t = new BeliefTracker(vm, 'D1-01', 12, 'D1-02', 'D1-04', params);
    t.sync(session.investigatorView());
    expect(t.massAt('D1-01')).toBe(1);
    // Full-state check: exactly one state (S, sp11, drops0, holds1).
    const states = (t as unknown as { states: Map<string, { node: string; sp: number; drops: number; holds: number }> }).states;
    expect(states.size).toBe(1);
    const only = [...states.values()][0]!;
    expect([only.node, only.sp, only.drops, only.holds]).toEqual(['D1-01', 11, 0, 1]);
  });

  it('DROP_COMPLETED collapses position and progress (AUD-004 arrival collect)', () => {
    const session = new CaseSession(vm, microConfig());
    session.submitFugitive({ idempotency_key: 'f1', action: { kind: 'MOVE', to: 'D1-02' } }); // drop 1
    const t = new BeliefTracker(vm, 'D1-01', 12, 'D1-02', 'D1-04', params);
    t.sync(session.investigatorView());
    expect(t.massAt('D1-02')).toBe(1);
    const states = (t as unknown as { states: Map<string, { node: string; drops: number }> }).states;
    const all = [...states.values()];
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((s) => s.node === 'D1-02' && s.drops === 1)).toBe(true);
  });
});

describe('BeliefTracker · §9.13 stranding evidence (synthetic views)', () => {
  const vm = loadMicroMap();

  function syntheticView(log: InvestigatorView['log'], privateLog: InvestigatorView['private_log_investigator'], day = 1): InvestigatorView {
    return {
      day,
      phase: 'INVESTIGATOR_ACTIONS',
      fugitive: {},
      investigator: { intel: 10, probes_today: 0, stakeout_armed: null },
      log,
      private_log_investigator: privateLog,
      verdict: null,
    };
  }

  it('STRANDED ⇒ sp=0 forced-hold states only (zero-SP tracker start)', () => {
    const t = new BeliefTracker(vm, 'D1-01', 0, 'D1-02', 'D1-04', params);
    t.sync(syntheticView([{ day: 1, kind: 'DAY_MARKER' }, { day: 1, kind: 'STRANDED' }], []));
    expect(t.massAt('D1-01')).toBe(1);
    const states = (t as unknown as { states: Map<string, { forced: boolean; sp: number }> }).states;
    const only = [...states.values()][0]!;
    expect(only.forced).toBe(true);
    expect(only.sp).toBe(0);
  });

  it('STAKEOUT_MISS eliminates the staked node', () => {
    const t = new BeliefTracker(vm, 'D1-01', 12, 'D1-02', 'D1-04', params);
    t.sync(syntheticView([{ day: 1, kind: 'DAY_MARKER' }], [{ day: 1, kind: 'STAKEOUT_MISS', target: 'D1-03' }]));
    const m = t.nodeMarginal();
    expect(m.has('D1-03')).toBe(false);
    expect(m.get('D1-02')).toBeCloseTo(0.5, 10);
  });

  it('inconsistent evidence (impossible district) throws — fail loudly', () => {
    const t = new BeliefTracker(vm, 'D1-01', 12, 'D1-02', 'D1-04', params);
    // Micro map is all-D1; a D2 reveal can never be true → posterior collapse must throw.
    expect(() =>
      t.sync(syntheticView([{ day: 1, kind: 'DAY_MARKER' }, { day: 1, kind: 'DISTRICT_REVEAL', district: 'D2' }], [])),
    ).toThrow(/collapsed to zero/);
  });

  it('mass is conserved (≈1) through transitions and conditioning', () => {
    const t = new BeliefTracker(vm, 'D1-01', 12, 'D1-02', 'D1-04', params);
    t.markDay(1);
    expect(t.totalMass).toBeCloseTo(1, 10);
    t.sync(syntheticView([{ day: 1, kind: 'DAY_MARKER' }], [{ day: 1, kind: 'STAKEOUT_MISS', target: 'D1-03' }]));
    expect(t.totalMass).toBeCloseTo(1, 10);
  });
});
