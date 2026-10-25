/**
 * L3 PROPERTIES — resolve() edge rulings (§9) + the resolve()-dependent L2
 * properties from the M2 plan (info wall T2, stakeout consumption T9,
 * determinism, idempotency §9.10), exercised on the synthetic MICRO map
 * (test/micro-map.ts) so every ruling is reachable in a few days.
 *
 * The AUD-004 white-box test is the one place a test mutates engine state
 * directly: the "fugitive already ON the pending site at day start" state is
 * structurally unreachable through legal play (T14, triage-log M2-001) —
 * the white-box harness is how the position-based check is still pinned.
 */
import { describe, expect, it } from 'vitest';
import {
  CaseSession,
  EngineError,
  investigatorLegality,
  isStranded,
  runScriptedCase,
  fugitiveLegality,
  validateCaseConfig,
  type DayScript,
} from '../src/engine.js';
import { RULESET_VERSION, PARAMETERS_V1_0_0_ALPHA_1 as P, type CaseConfig } from '../src/types.js';
import { loadMicroMap, microConfig, S, A, B, C, G, X } from './micro-map.js';

const vm = loadMicroMap();
const noReveals = { district_days: [], transit_days: [] };

function micro(over: Partial<CaseConfig> = {}): CaseConfig {
  return microConfig({ reveal_schedule: noReveals, ...over });
}

const M = (to: string) => ({ kind: 'MOVE', to }) as const;

/* ============================ §2 step 4 / AUD-004 ======================== */

describe('AUD-004 — the step-4 drop check is purely position-based', () => {
  it('arrival by Move collects (session-level; W2 golden pins this too)', () => {
    const r = runScriptedCase(vm, micro(), [
      { fugitive: M(A), investigator: [] }, // drop 1 completes on ARRIVAL, day 1
      { fugitive: M(C), investigator: [] }, // drop 2 on arrival, day 2
      { fugitive: M(G), investigator: [] }, // ESCAPE, day 3
    ]);
    expect(r.state.log).toContainEqual({ day: 1, kind: 'DROP_COMPLETED', slot: 1, site: A });
    expect(r.state.log).toContainEqual({ day: 2, kind: 'DROP_COMPLETED', slot: 2, site: C });
    expect(r.verdict).toBe('ESCAPE');
    expect(r.state.day).toBe(3);
  });

  it('WHITE-BOX (T14): a Hold on the pending site collects, charges 1 SP', () => {
    // Reachable only by direct state construction — see T14 / triage M2-001.
    const s = new CaseSession(vm, micro());
    s.state.fugitive.position = A; // standing on pending drop 1 at day start
    s.submitFugitive({ idempotency_key: 'wb1', action: { kind: 'HOLD' } });
    expect(s.state.log).toContainEqual({ day: 1, kind: 'DROP_COMPLETED', slot: 1, site: A });
    expect(s.state.fugitive.stamina).toBe(P.P3_stamina_budget - P.P6_hold_cost); // charged exactly the Hold cost
    expect(s.state.fugitive.drops_collected).toBe(1);
  });

  it('WHITE-BOX (T14): a FORCED_HOLD on the pending site also collects', () => {
    const s = new CaseSession(vm, micro({ stamina_budget: 1 }));
    s.state.fugitive.position = A;
    s.state.fugitive.stamina = 0; // stranded on the site (micro: A has F neighbors but 0 SP blocks all)
    s.resolveStranded();
    expect(s.state.log).toContainEqual({ day: 1, kind: 'STRANDED' });
    expect(s.state.log).toContainEqual({ day: 1, kind: 'DROP_COMPLETED', slot: 1, site: A });
    expect(s.state.fugitive.stamina).toBe(0); // no cost
    expect(s.state.fugitive.holds_used).toBe(0); // unchanged (§9.13)
  });
});

/* ============================== §9.13 — stranding ======================== */

describe('§9.13 — forced Hold when nothing is affordable', () => {
  const strandScript: DayScript[] = [
    { fugitive: M(B), investigator: [] }, // T, 2 SP → 10
    { fugitive: M(X), investigator: [] }, // M, 3 SP → 7
    { fugitive: M(B), investigator: [] }, // M, 3 SP → 4
    { fugitive: M(X), investigator: [] }, // M, 3 SP → 1
    { fugitive: { kind: 'HOLD' }, investigator: [] }, // 1 SP → 0, holds 1 (last affordable action)
    // days 6–8: 0 SP at X — neighbors cost 2/2/3, Hold unaffordable → stranded
    { investigator: [] },
    { investigator: [] },
    { investigator: [] },
  ];

  it('resolves stranded days at no SP cost, holds_used unchanged, STRANDED public', () => {
    const r = runScriptedCase(vm, micro({ reveal_schedule: { district_days: [], transit_days: [6] } }), strandScript);
    expect(r.verdict).toBe('EXPIRY');
    const strandedDays = r.state.log.filter((e) => e.kind === 'STRANDED').map((e) => e.day);
    expect(strandedDays).toEqual([6, 7, 8]);
    // §9.13: no SP charge, holds_used unchanged (1 from day 5's real Hold).
    expect(r.state.fugitive.stamina).toBe(0);
    expect(r.state.fugitive.holds_used).toBe(1);
    // The §9.13 clause: a transit reveal on a stranded day reports no movement.
    expect(r.state.log).toContainEqual({ day: 6, kind: 'TRANSIT_REVEAL', move_class: 'NO_MOVEMENT' });
    // Route records FORCED_HOLD entries with sp_cost 0 and no edge class (T12).
    const forced = r.disclosure.fugitive_route.filter((e) => e.action.kind === 'FORCED_HOLD');
    expect(forced.map((e) => e.day)).toEqual([6, 7, 8]);
    for (const e of forced) {
      expect(e.sp_cost).toBe(0);
      expect(e.edge_class).toBeNull();
      expect(e.from).toBe(X);
      expect(e.to).toBe(X);
    }
  });

  it('rejects submissions on a stranded day — FORCED_HOLD is engine-resolved (T4)', () => {
    const s = new CaseSession(vm, micro({ stamina_budget: 1 }));
    s.submitFugitive({ idempotency_key: 'f1', action: M(A) }); // 1 SP → 0, day 1 resolves
    s.endInvestigatorPhase(); // → day 2 at A with 0 SP
    // At 0 SP on A: neighbors (B, C, S) all cost 1 SP > 0; Hold needs 1 SP.
    expect(isStranded(vm, s.state)).toBe(true);
    expect(() => s.submitFugitive({ idempotency_key: 'f2', action: { kind: 'HOLD' } }))
      .toThrowError(/§9\.13/);
    expect(() => s.submitFugitive({ idempotency_key: 'f3', action: M(B) }))
      .toThrowError(/§9\.13/);
    // The engine resolves it instead:
    s.resolveStranded();
    expect(s.state.log).toContainEqual({ day: 2, kind: 'STRANDED' });
    expect(s.state.phase).toBe('INVESTIGATOR_ACTIONS');
  });

  it('refuses resolveStranded() while legal actions remain', () => {
    const s = new CaseSession(vm, micro());
    expect(() => s.resolveStranded()).toThrowError(/§9\.13-only/);
  });
});

/* ================== §9.5 — gate is ordinary ground pre-drops ============= */

describe('§9.5 — ending a day on the gate with drops incomplete', () => {
  it('does NOT escape; the case runs to EXPIRY (with a late stranding)', () => {
    const r = runScriptedCase(vm, micro(), [
      { fugitive: M(B), investigator: [] }, // T → 10
      { fugitive: M(X), investigator: [] }, // M → 7
      { fugitive: M(G), investigator: [] }, // M → 4: ON THE GATE, 0 drops — nothing happens
      { fugitive: M(C), investigator: [] }, // F → 3
      { fugitive: M(X), investigator: [] }, // T → 1
      { fugitive: { kind: 'HOLD' }, investigator: [] }, // 1 → 0, holds 1
      { investigator: [] }, // stranded at X (neighbors cost 2/2/3 > 0 SP)
      { investigator: [] },
    ]);
    expect(r.state.log.filter((e) => e.day === 3 && e.kind === 'VERDICT')).toHaveLength(0);
    expect(r.verdict).toBe('EXPIRY');
    expect(r.state.fugitive.drops_collected).toBe(0);
    const strandedDays = r.state.log.filter((e) => e.kind === 'STRANDED').map((e) => e.day);
    expect(strandedDays).toEqual([7, 8]);
  });
});

/* ==================== §5 — budgets, caps, targets, §9.3 ================== */

describe('§5 — Investigator action legality', () => {
  it('rejects the 3rd probe of a day (§5.3 cap 2)', () => {
    const s = new CaseSession(vm, micro());
    s.submitFugitive({ idempotency_key: 'f', action: M(A) });
    s.submitInvestigator({ idempotency_key: 'p1', action: { kind: 'PROBE', target: S } });
    s.submitInvestigator({ idempotency_key: 'p2', action: { kind: 'PROBE', target: B } });
    expect(() => s.submitInvestigator({ idempotency_key: 'p3', action: { kind: 'PROBE', target: C } }))
      .toThrowError(/§5\.1\/§5\.3/);
  });

  it('rejects a probe with 0 IP (§9.2)', () => {
    const s = new CaseSession(vm, micro({ intel_budget: 0 }));
    s.submitFugitive({ idempotency_key: 'f', action: M(A) });
    expect(() => s.submitInvestigator({ idempotency_key: 'p1', action: { kind: 'PROBE', target: A } }))
      .toThrowError(/§5\.1\/§5\.3/);
  });

  it('rejects a stakeout with < 3 IP, a second armed stakeout, and unknown targets', () => {
    const s = new CaseSession(vm, micro({ intel_budget: 2 }));
    s.submitFugitive({ idempotency_key: 'f', action: M(A) });
    expect(() => s.submitInvestigator({ idempotency_key: 's0', action: { kind: 'STAKEOUT', target: X } }))
      .toThrowError(/§5\.2\/§5\.3/);

    const s2 = new CaseSession(vm, micro());
    s2.submitFugitive({ idempotency_key: 'f', action: M(A) });
    s2.submitInvestigator({ idempotency_key: 's1', action: { kind: 'STAKEOUT', target: X } }); // IP 10→7
    expect(() => s2.submitInvestigator({ idempotency_key: 's2', action: { kind: 'STAKEOUT', target: G } }))
      .toThrowError(/slot occupied/);
    expect(() => s2.submitInvestigator({ idempotency_key: 'u1', action: { kind: 'PROBE', target: 'D9-99' } }))
      .toThrowError(/\[UNKNOWN_NODE\]/);
  });

  it('probes resolve against the END-of-day position (§5.1)', () => {
    const s = new CaseSession(vm, micro());
    s.submitFugitive({ idempotency_key: 'f', action: M(A) }); // ends on A
    s.submitInvestigator({ idempotency_key: 'pA', action: { kind: 'PROBE', target: A } });
    expect(s.state.private_log_investigator[0]).toEqual({ day: 1, kind: 'PROBE_RESULT', target: A, result: 'HIT' });
    s.submitInvestigator({ idempotency_key: 'pB', action: { kind: 'PROBE', target: B } });
    expect(s.state.private_log_investigator[1]).toEqual({ day: 1, kind: 'PROBE_RESULT', target: B, result: 'MISS' });
  });

  it('a missed stakeout frees the slot — a new one may arm the same day (T9)', () => {
    const s = new CaseSession(vm, micro());
    s.submitFugitive({ idempotency_key: 'f1', action: M(A) }); // day 1: at A
    s.submitInvestigator({ idempotency_key: 's1', action: { kind: 'STAKEOUT', target: G } }); // will miss
    s.endInvestigatorPhase(); // → day 2
    s.submitFugitive({ idempotency_key: 'f2', action: M(B) }); // step 2: B ≠ G → silent miss, consumed
    expect(s.state.investigator.stakeout_armed).toBeNull();
    s.submitInvestigator({ idempotency_key: 's2', action: { kind: 'STAKEOUT', target: B } }); // re-arm same day
    expect(s.state.investigator.stakeout_armed).toBe(B);
  });
});

/* ===================== §9.1 — fugitive legality ========================== */

describe('§9.1 — fugitive submissions are validated, never clamped', () => {
  it('rejects non-adjacent moves', () => {
    const s = new CaseSession(vm, micro());
    // S's neighbors: A(F), B(T) — C is not adjacent to S.
    expect(() => s.submitFugitive({ idempotency_key: 'f', action: M(C) })).toThrowError(/no edge/);
  });

  it('rejects unaffordable moves', () => {
    const s = new CaseSession(vm, micro({ stamina_budget: 1 }));
    expect(() => s.submitFugitive({ idempotency_key: 'f', action: M(B) })).toThrowError(/costs 2 SP/);
    // The F edge remains legal:
    s.submitFugitive({ idempotency_key: 'g', action: M(A) });
    expect(s.state.fugitive.stamina).toBe(0);
  });

  it('rejects the 3rd Hold (§3.3 cap 2)', () => {
    const s = new CaseSession(vm, micro());
    s.submitFugitive({ idempotency_key: 'h1', action: { kind: 'HOLD' } });
    s.endInvestigatorPhase();
    s.submitFugitive({ idempotency_key: 'h2', action: { kind: 'HOLD' } });
    s.endInvestigatorPhase();
    expect(() => s.submitFugitive({ idempotency_key: 'h3', action: { kind: 'HOLD' } })).toThrowError(/§3\.3/);
  });
});

/* ============ phase discipline, idempotency, views, determinism ========== */

describe('session discipline (phases, §9.10 idempotency, T2 info wall)', () => {
  it('enforces phase ordering', () => {
    const s = new CaseSession(vm, micro());
    expect(() => s.submitInvestigator({ idempotency_key: 'x', action: { kind: 'WAIT' } }))
      .toThrowError(/\[WRONG_PHASE\]/);
    s.submitFugitive({ idempotency_key: 'f', action: M(A) });
    expect(() => s.submitFugitive({ idempotency_key: 'g', action: M(B) }))
      .toThrowError(/\[WRONG_PHASE\]/);
  });

  it('duplicate idempotency keys are silent no-ops — even after the phase moved on (§9.10)', () => {
    const s = new CaseSession(vm, micro());
    s.submitFugitive({ idempotency_key: 'k1', action: M(A) });
    const logLen = s.state.log.length;
    const stamina = s.state.fugitive.stamina;
    // The retry arrives while the case is already in INVESTIGATOR_ACTIONS —
    // §9.10 requires the ORIGINAL result, not a WRONG_PHASE error.
    s.submitFugitive({ idempotency_key: 'k1', action: M(A) });
    expect(s.state.log.length).toBe(logLen);
    expect(s.state.fugitive.stamina).toBe(stamina);
    expect(() => s.submitFugitive({ idempotency_key: 'k1', action: M(B) }))
      .toThrowError(/\[IDEMPOTENCY_CONFLICT\]/);
  });

  it('T2 info wall: each view exposes exactly its own slice of state', () => {
    const r = runScriptedCase(vm, micro({ reveal_schedule: { district_days: [1], transit_days: [1] } }), [
      { fugitive: M(A), investigator: [{ kind: 'PROBE', target: S }, { kind: 'STAKEOUT', target: X }] },
      { fugitive: M(C), investigator: [] },
      { fugitive: M(G), investigator: [{ kind: 'WAIT' }] }, // explicit WAIT ends the phase
    ]);
    expect(r.verdict).toBe('ESCAPE');

    const iv = r.session.investigatorView();
    expect(iv.fugitive).toEqual({}); // structurally empty (§1.3)
    expect(iv.day).toBe(r.state.day);
    expect(iv.phase).toBe('CASE_OVER');
    expect(iv.log).toEqual(r.state.log);
    expect(iv.private_log_investigator).toEqual(r.state.private_log_investigator);

    const fv = r.session.fugitiveView();
    expect(fv.investigator).toEqual({});
    expect(fv.log).toEqual(r.state.log);
    expect(Object.keys(fv)).not.toContain('private_log_investigator');
    // And the public log never carries the private events (runtime check
    // with a widened kind — the TYPE system already forbids this overlap):
    expect(r.state.log.some((e) => (e.kind as string) === 'PROBE_RESULT' || (e.kind as string) === 'STAKEOUT_PLACED')).toBe(false);
  });

  it('T13: if district and transit days coincide, district fires first', () => {
    const r = runScriptedCase(vm, micro({ reveal_schedule: { district_days: [1], transit_days: [1] } }), [
      { fugitive: M(A), investigator: [] },
      { fugitive: M(C), investigator: [] },
      { fugitive: M(G), investigator: [] },
    ]);
    // Day 1 order: marker → district (step 3a) → transit (step 3b) → drop (step 4,
    // arrival at A collects on top of the reveals).
    const day1 = r.state.log.filter((e) => e.day === 1).map((e) => e.kind);
    expect(day1).toEqual(['DAY_MARKER', 'DISTRICT_REVEAL', 'TRANSIT_REVEAL', 'DROP_COMPLETED']);
    expect(r.verdict).toBe('ESCAPE');
  });

  it('determinism: same config + script ⇒ byte-identical disclosure; session ≡ driver', () => {
    const script: DayScript[] = [
      { fugitive: M(A), investigator: [{ kind: 'PROBE', target: S }] },
      { fugitive: M(C), investigator: [{ kind: 'STAKEOUT', target: G }] },
      { fugitive: M(G), investigator: [] },
    ];
    const a = runScriptedCase(vm, micro(), script);
    const b = runScriptedCase(vm, micro(), script);
    expect(JSON.stringify(a.disclosure)).toBe(JSON.stringify(b.disclosure));
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));

    // Session replay with envelopes (idempotency layer active) must land on
    // the same final disclosure as the journal-free driver.
    const s = new CaseSession(vm, micro());
    s.submitFugitive({ idempotency_key: 'd1f', action: M(A) });
    s.submitInvestigator({ idempotency_key: 'd1i1', action: { kind: 'PROBE', target: S } });
    s.endInvestigatorPhase();
    s.submitFugitive({ idempotency_key: 'd2f', action: M(C) });
    s.submitInvestigator({ idempotency_key: 'd2i1', action: { kind: 'STAKEOUT', target: G } });
    s.endInvestigatorPhase();
    s.submitFugitive({ idempotency_key: 'd3f', action: M(G) }); // CAPTURE at step 2 (armed G)
    if (s.state.verdict === null) s.endInvestigatorPhase(); // step 7 only if step 2 didn't end it
    expect(JSON.stringify(s.disclosure())).toBe(JSON.stringify(a.disclosure));
  });

  it('§8.6: disclosure() is verdict-gated and carries the full route', () => {
    const s = new CaseSession(vm, micro());
    expect(() => s.disclosure()).toThrowError(/\[NOT_OVER\]/);
    s.submitFugitive({ idempotency_key: 'f1', action: M(A) });
    s.submitInvestigator({ idempotency_key: 'i1', action: { kind: 'WAIT' } });
    s.submitFugitive({ idempotency_key: 'f2', action: M(C) });
    s.submitInvestigator({ idempotency_key: 'i2', action: { kind: 'WAIT' } });
    s.submitFugitive({ idempotency_key: 'f3', action: M(G) });
    const d = s.disclosure();
    expect(d.verdict).toBe('ESCAPE');
    expect(d.fugitive_route).toEqual([
      { day: 1, action: { kind: 'MOVE', to: A }, from: S, to: A, edge_class: 'F', sp_cost: 1 },
      { day: 2, action: { kind: 'MOVE', to: C }, from: A, to: C, edge_class: 'F', sp_cost: 1 },
      { day: 3, action: { kind: 'MOVE', to: G }, from: C, to: G, edge_class: 'F', sp_cost: 1 },
    ]);
  });

  it('§6 totality: clock-layer forfeit/void verdicts resolve through VERDICT_WINNER', () => {
    const s = new CaseSession(vm, micro());
    s.forfeit('FUGITIVE');
    expect(s.state.verdict).toBe('FORFEIT_F');
    const s2 = new CaseSession(vm, micro());
    s2.voidCase();
    expect(s2.state.verdict).toBe('VOID');
    const s3 = new CaseSession(vm, micro());
    s3.forfeit('INVESTIGATOR');
    expect(s3.state.verdict).toBe('FORFEIT_I');
  });
});

/* ========================= config validation (§1.2/§9.8) ================= */

describe('createCase config validation', () => {
  const base = micro();

  it('accepts the well-formed micro config', () => {
    expect(() => validateCaseConfig(vm, base)).not.toThrow();
  });

  it('rejects §9.8 violations', () => {
    expect(() => validateCaseConfig(vm, micro({ drops: [A, A] }))).toThrowError(/§9\.8/);
    // gate ∈ drops is unreachable at the config level when pools are valid
    // (disjoint pools + pool-membership checks reject it first) — the §9.8
    // gate clause is defense in depth for hand-built CaseConfig objects and
    // is covered by the generator's assertSection98 on the construction path.
    expect(() => validateCaseConfig(vm, micro({ drops: [A, G] }))).toThrowError(/drop candidates/);
  });

  it('rejects pool violations and cross-version configs', () => {
    expect(() => validateCaseConfig(vm, micro({ safehouse: B }))).toThrowError(/safehouse pool/);
    expect(() => validateCaseConfig(vm, micro({ gate: X }))).toThrowError(/gate pool/);
    expect(() => validateCaseConfig(vm, micro({ drops: [B, C] }))).toThrowError(/drop candidates/);
    expect(() => validateCaseConfig(vm, micro({ ruleset_version: '1.0.0-alpha.0' }))).toThrowError(/§9\.12/);
    expect(() => validateCaseConfig(vm, micro({ map_id: 'map_alpha' }))).toThrowError(/map_id/);
  });

  it('rejects out-of-range reveal days and bad budgets', () => {
    expect(() => validateCaseConfig(vm, micro({ reveal_schedule: { district_days: [0], transit_days: [] } })))
      .toThrowError(/reveal day/);
    expect(() => validateCaseConfig(vm, micro({ reveal_schedule: { district_days: [9], transit_days: [] } })))
      .toThrowError(/reveal day/);
    expect(() => validateCaseConfig(vm, micro({ stamina_budget: 0 }))).toThrowError(/stamina_budget/);
    expect(() => validateCaseConfig(vm, micro({ intel_budget: -1 }))).toThrowError(/intel_budget/);
  });
});

/* ==================== legality helpers + script-driver guards ============ */

describe('legality helpers and driver guards', () => {
  it('fugitiveLegality reports the micro reachability facts', () => {
    const s = new CaseSession(vm, micro());
    const leg = fugitiveLegality(vm, s.state);
    expect(leg.moves.sort()).toEqual([A, B]);
    expect(leg.hold).toBe(true);

    s.state.fugitive.position = X;
    s.state.fugitive.stamina = 1;
    const leg1 = fugitiveLegality(vm, s.state);
    expect(leg1.moves).toEqual([]); // X's neighbors cost 2/2/3
    expect(leg1.hold).toBe(true); // 1 SP, holds left

    s.state.fugitive.stamina = 0;
    expect(isStranded(vm, s.state)).toBe(true);
  });

  it('investigatorLegality reflects caps and the day-8 stakeout ban', () => {
    const s = new CaseSession(vm, micro());
    expect(investigatorLegality(s.state)).toEqual({ probe: true, stakeout: true });
    s.state.day = P.P1_days_per_case;
    expect(investigatorLegality(s.state).stakeout).toBe(false);
    expect(investigatorLegality(s.state).probe).toBe(true);
  });

  it('driver rejects scripts with actions on stranded days and missing actions', () => {
    // Missing day-1 action:
    expect(() => runScriptedCase(vm, micro(), [])).toThrowError(/\[SCRIPT_ERROR\]/);
    // Action supplied on a stranded day (1 SP burns on day 1, day 2 is stranded):
    expect(() => runScriptedCase(vm, micro({ stamina_budget: 1 }), [
      { fugitive: M(A), investigator: [] },
      { fugitive: M(B), investigator: [] },
    ])).toThrowError(/stranded/);
  });
});
