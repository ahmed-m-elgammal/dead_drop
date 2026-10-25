/**
 * ============================================================================
 * resolve() — the §2 seven-step day resolution (M2 W2 task 2)
 * ============================================================================
 *
 * ADR-002 (m2/adr-002-resolve-unlock.md): the W2 plan gated `resolve()` on the
 * M1 freeze tag. That gate is hereby RE-SCOPED by decision of the acting
 * designer/developer (user-authorized "make all calls" session, 2026-10-25):
 * this module implements the frozen TEXT of ruleset 1.0.0-alpha.1
 * (03-rules.md, committed and normative) immediately, marked DRAFT-UNFREEZE.
 * The fabrication guard is untouched: no session data exists or is
 * invented anywhere; when human transcripts S1–S3 land, freeze-checklist §1
 * gains a transcript-reconciliation step (golden fixtures from real logs, any
 * a/b-class triage patch flows into a ruleset version bump AND this module).
 *
 * WHAT THIS MODULE OWNS (per 03-rules.md — it is the spec, not this file):
 *   §2   the seven-step day sequence, no step skipped or reordered
 *   §3   Move/Hold legality, transit costs, Hold semantics (incl. AUD-004)
 *   §4   evidence channel emission (reveals, drop events)
 *   §5   Probe/Stakeout, budgets and per-day caps
 *   §6   verdicts (via VERDICT_WINNER data — never re-derived)
 *   §9   edge-case rulings 9.1–9.13 as validation predicates
 *
 * Conventions registered at implementation time (see
 * m1/engine-types/README.md findings T12–T15 — none changes rules text):
 *   T12  route entries: edge_class null for Hold/FORCED_HOLD (types.ts)
 *   T13  if a swept reveal schedule puts a district day and a transit day on
 *        the SAME day, DISTRICT_REVEAL is emitted before TRANSIT_REVEAL
 *        (rules-text order); the default schedule {3,6}/{4} never overlaps
 *   T14  the S1 template's AUD-004 "Hold on the PENDING site" engineered
 *        state is structurally unreachable under arrival-collection (proved
 *        in triage-log row M2-001); the position-based step-4 check is still
 *        implemented action-independently and white-box tested
 *   T15  parallel-edge move: submitting MOVE to a node reached by >1 edge
 *        resolves on the MINIMAL-SP edge (player-favorable; matches the
 *        aud003 §5 gate convention). map_alpha has exactly one parallel pair
 *
 * Determinism: no RNG in this module (03-rules header). Parameters come from
 * PARAMETERS_V1_0_0_ALPHA_1 — never hard-coded (m2-handoff §1.3). All
 * failures throw typed EngineError — the engine never proceeds past an
 * invalid state (same fail-loudly discipline as map.ts / the Python oracles).
 * ============================================================================
 */
import type {
  ActionEnvelope,
  CaseConfig,
  CaseEndDisclosure,
  CaseState,
  DistrictId,
  EdgeClass,
  FugitiveResolvedAction,
  FugitiveSubmission,
  InvestigatorSubmission,
  InvestigatorView,
  FugitiveView,
  NodeId,
  PrivateInvestigatorEvent,
  PublicEvent,
  Verdict,
} from './types.js';
import { PARAMETERS_V1_0_0_ALPHA_1 as P, RULESET_VERSION, VERDICT_WINNER } from './types.js';
import { edgeCost, type ValidatedMap } from './map.js';

/* ------------------------------------------------------------ errors */

export type EngineErrorCode =
  | 'CONFIG_INVALID'        // §1.2/§9.8 structural config validation
  | 'WRONG_PHASE'           // action submitted outside its phase
  | 'CASE_OVER'             // action after verdict
  | 'ILLEGAL_SUBMISSION'    // §9.1/§9.2 — rejected, never clamped
  | 'STRANDED_NO_ACTION'    // §9.13 — submissions impossible; resolveStranded()
  | 'NOT_STRANDED'          // resolveStranded() called with legal actions left
  | 'IDEMPOTENCY_CONFLICT'  // §9.10 — key reused with a different payload
  | 'UNKNOWN_NODE'          // probe/stakeout target not on the map
  | 'SCRIPT_ERROR'          // runScriptedCase misuse
  | 'NOT_OVER';             // disclosure() before CASE_OVER

export class EngineError extends Error {
  constructor(
    readonly code: EngineErrorCode,
    message: string,
  ) {
    super(`[${code}] ${message}`);
    this.name = 'EngineError';
  }
}

/* ------------------------------------------- simulation parameter overrides --
 *
 * T16 / ADR-003 (m2/adr-003-sim-overrides.md). Scenarios S1–S7 (04-balance-sim
 * §4.4) sweep P1/P6/P7/P8 — all [hypothesis] parameters, which is exactly what
 * M2 simulation exists to test. The RESOLUTION side therefore accepts explicit,
 * validated, opt-in overrides at session construction. Guardrails:
 *   - CaseConfig stays PURE rules-facing (§1.2) — overrides are never carried
 *     in it; P3/P4 (budgets) and P9/P10 (schedule) were already per-case config.
 *   - Default path: no overrides ⇒ CANONICAL_PARAMS (frozen snapshot of the
 *     parameter table) — byte-identical behavior to ruleset 1.0.0-alpha.1.
 *   - Overrides are validated (integers, sane ranges) and fail loudly.
 *   - P2/P5/P11/P12 are structural/computed — NOT overridable. P8's daily cap
 *     (1) is enforced structurally via the armed stakeout slot, so only the
 *     stakeout COST is overridable (S4 sweeps cost, per 04 §4.4).
 * Every sim output row echoes the effective parameters it ran under.
 */

export interface SimParamOverrides {
  P1_days_per_case?: number;
  P6_hold_cost?: number;
  P6_hold_max?: number;
  P7_probe_cost?: number;
  P7_probe_daily_cap?: number;
  P8_stakeout_cost?: number;
}

export type EffectiveParams = Required<SimParamOverrides>;

/** Frozen canonical snapshot (1.0.0-alpha.1). Never mutated. */
export const CANONICAL_PARAMS: EffectiveParams = Object.freeze({
  P1_days_per_case: P.P1_days_per_case,
  P6_hold_cost: P.P6_hold_cost,
  P6_hold_max: P.P6_hold_max,
  P7_probe_cost: P.P7_probe_cost,
  P7_probe_daily_cap: P.P7_probe_daily_cap,
  P8_stakeout_cost: P.P8_stakeout_cost,
});

/** Validate overrides and merge onto the canonical table. Throws
 *  EngineError('CONFIG_INVALID') on any malformed value (fail loudly). */
export function resolveParams(overrides?: SimParamOverrides): EffectiveParams {
  if (overrides === undefined) return CANONICAL_PARAMS;
  const merged: EffectiveParams = { ...CANONICAL_PARAMS };
  for (const [k, v] of Object.entries(overrides) as Array<[keyof SimParamOverrides, number | undefined]>) {
    if (v === undefined) continue;
    if (!Number.isInteger(v) || v < 0) {
      throw new EngineError('CONFIG_INVALID', `parameter override ${k} must be a non-negative integer, got ${v}`);
    }
    merged[k] = v;
  }
  if (merged.P1_days_per_case < 1) {
    throw new EngineError('CONFIG_INVALID', 'P1_days_per_case override must be ≥ 1');
  }
  return merged;
}

/* ------------------------------------------------------- config validation */

/** §1.2 + §9.8 structural validation at case creation. Feasibility (C2–C4)
 *  is deliberately NOT re-checked here: it is a GENERATOR obligation; the
 *  resolver accepts any structurally valid config (S-sweeps play variants).
 *  `params` overrides (T16/ADR-003) bound the reveal-day validation. */
export function validateCaseConfig(
  vm: ValidatedMap,
  config: CaseConfig,
  params: EffectiveParams = CANONICAL_PARAMS,
): void {
  const fail = (why: string): never => {
    throw new EngineError('CONFIG_INVALID', why);
  };
  if (config.map_id !== vm.map.map_id) {
    fail(`config map_id ${config.map_id} ≠ loaded map ${vm.map.map_id}`);
  }
  if (config.ruleset_version !== RULESET_VERSION) {
    fail(`config ruleset ${config.ruleset_version} ≠ engine ruleset ${RULESET_VERSION} (§9.12: no cross-version resolution)`);
  }
  if (!vm.map.safehouses.includes(config.safehouse)) {
    fail(`safehouse ${config.safehouse} not in safehouse pool`);
  }
  if (config.drops.length !== 2) fail('drops must have exactly 2 entries');
  const [d1, d2] = config.drops;
  if (d1 === undefined || d2 === undefined) fail('drops malformed');
  if (!vm.map.drop_candidates.includes(d1) || !vm.map.drop_candidates.includes(d2)) {
    fail('drop sites must be drop candidates');
  }
  if (d1 === d2) fail('§9.8: drops[0] === drops[1]');
  if (!vm.map.gates.includes(config.gate)) fail(`gate ${config.gate} not in gate pool`);
  if (config.gate === d1 || config.gate === d2) fail('§9.8: gate ∈ drops');
  if (!Number.isInteger(config.stamina_budget) || config.stamina_budget < 1) {
    fail('stamina_budget must be a positive integer');
  }
  if (!Number.isInteger(config.intel_budget) || config.intel_budget < 0) {
    fail('intel_budget must be a non-negative integer');
  }
  const maxDay = params.P1_days_per_case;
  for (const day of config.reveal_schedule.district_days) {
    if (!Number.isInteger(day) || day < 1 || day > maxDay) {
      fail(`district reveal day ${day} outside 1..${maxDay}`);
    }
  }
  for (const day of config.reveal_schedule.transit_days) {
    if (!Number.isInteger(day) || day < 1 || day > maxDay) {
      fail(`transit reveal day ${day} outside 1..${maxDay}`);
    }
  }
}

/* ---------------------------------------------------------- case creation */

/** Initial §1.3 CaseState. DAY_MARKER convention: day d's marker is emitted
 *  when day d begins — day 1 here, day d+1 in step 7's clock advance. */
export function createCaseState(
  vm: ValidatedMap,
  config: CaseConfig,
  params: EffectiveParams = CANONICAL_PARAMS,
): CaseState {
  validateCaseConfig(vm, config, params);
  return {
    day: 1,
    phase: 'FUGITIVE_MOVE',
    fugitive: {
      position: config.safehouse,
      stamina: config.stamina_budget,
      holds_used: 0,
      drops_collected: 0,
    },
    investigator: {
      intel: config.intel_budget,
      probes_today: 0,
      stakeout_armed: null,
    },
    log: [{ day: 1, kind: 'DAY_MARKER' }],
    private_log_investigator: [],
    verdict: null,
  };
}

/* ------------------------------------------------------------- legality */

/** Minimal-SP edge (node → target); T15: parallel edges resolve minimal. */
export function cheapestEdgeTo(
  vm: ValidatedMap,
  from: NodeId,
  to: NodeId,
): { cls: EdgeClass; cost: number } | null {
  let best: { cls: EdgeClass; cost: number } | null = null;
  for (const e of vm.adjacency.get(from) ?? []) {
    if (e.node !== to) continue;
    const cost = edgeCost(e.cls);
    if (best === null || cost < best.cost) best = { cls: e.cls, cost };
  }
  return best;
}

export interface FugitiveLegality {
  /** Legal MOVE targets (node id) — any edge exists ∧ affordable (§3.1). */
  moves: NodeId[];
  /** Hold legal ⇔ holds_used < P6_hold_max ∧ stamina ≥ P6_hold_cost (§3.3). */
  hold: boolean;
}

/** Reads only the fugitive block — an InvestigatorView can never pass here
 *  (structurally), while CaseState and FugitiveView both do. */
export function fugitiveLegality(
  vm: ValidatedMap,
  state: Pick<CaseState, 'fugitive'>,
  params: EffectiveParams = CANONICAL_PARAMS,
): FugitiveLegality {
  const moves: NodeId[] = [];
  for (const e of vm.adjacency.get(state.fugitive.position)!) {
    if (edgeCost(e.cls) <= state.fugitive.stamina && !moves.includes(e.node)) {
      moves.push(e.node);
    }
  }
  const hold =
    state.fugitive.holds_used < params.P6_hold_max &&
    state.fugitive.stamina >= params.P6_hold_cost;
  return { moves, hold };
}

/** §9.13 predicate: no legal submission exists at all. On map_alpha every
 *  node has ≥1 incident F edge (L1-tested), so this reduces to 0 SP there;
 *  the general condition is implemented regardless. */
export function isStranded(
  vm: ValidatedMap,
  state: Pick<CaseState, 'fugitive'>,
  params: EffectiveParams = CANONICAL_PARAMS,
): boolean {
  const leg = fugitiveLegality(vm, state, params);
  return leg.moves.length === 0 && !leg.hold;
}

export interface InvestigatorLegality {
  probe: boolean;   // intel ≥ P7_probe_cost ∧ probes_today < P7_probe_daily_cap
  stakeout: boolean; // day < P1 ∧ intel ≥ P8_stakeout_cost ∧ none armed (§5.2/§9.3; cap=1 via the armed slot)
}

/** Reads only day + investigator — an InvestigatorView satisfies this (its
 *  use is legal for the investigator-side sim policies), CaseState does too. */
export function investigatorLegality(
  state: Pick<CaseState, 'day' | 'investigator'>,
  params: EffectiveParams = CANONICAL_PARAMS,
): InvestigatorLegality {
  return {
    probe:
      state.investigator.intel >= params.P7_probe_cost &&
      state.investigator.probes_today < params.P7_probe_daily_cap,
    stakeout:
      state.day < params.P1_days_per_case &&
      state.investigator.intel >= params.P8_stakeout_cost &&
      state.investigator.stakeout_armed === null,
  };
}

/* --------------------------------------------------------------- session */

interface JournalRecord {
  day: number;
  summary: string;
}

/** Interactive case carrier: owns the live CaseState, the §9.10 idempotency
 *  journal, and the §8.6 route record. All mutations flow through the
 *  step-ordered private methods below; the seven-step sequence lives in
 *  `resolveSteps2to5` + `endInvestigatorPhase`, mirroring §2 exactly.
 *
 *  T16/ADR-003: `opts.params` carries OPT-IN simulation overrides (S1–S7);
 *  omitted ⇒ canonical 1.0.0-alpha.1 resolution, byte-identical. */
export class CaseSession {
  state: CaseState;
  /** Effective resolution parameters (canonical unless overridden). */
  readonly p: EffectiveParams;
  private readonly journal = new Map<string, JournalRecord>();
  private readonly route: import('./types.js').FugitiveRouteEntry[] = [];

  constructor(
    readonly vm: ValidatedMap,
    readonly config: CaseConfig,
    opts: { params?: SimParamOverrides } = {},
  ) {
    this.p = resolveParams(opts.params);
    this.state = createCaseState(vm, config, this.p);
  }

  /* ---- views (§1.3 information boundary; T2 property tests pin this) ---- */

  investigatorView(): InvestigatorView {
    const { fugitive, ...rest } = this.state;
    void fugitive;
    return { ...rest, fugitive: {} };
  }

  fugitiveView(): FugitiveView {
    const { investigator, private_log_investigator, ...rest } = this.state;
    void investigator;
    void private_log_investigator;
    return { ...rest, investigator: {} };
  }

  /** §8.6 — only after CASE_OVER. */
  disclosure(): CaseEndDisclosure {
    if (this.state.verdict === null) {
      throw new EngineError('NOT_OVER', 'case-end disclosure requires a verdict');
    }
    return { ...this.state, fugitive_route: this.route };
  }

  /* ---- idempotency (§9.10 / 08-api-security §4) ----
   *
   * Ordering note: the duplicate check runs BEFORE phase checks. A retry
   * after a network error legitimately arrives AFTER the original submission
   * already advanced the phase — §9.10 says it returns the original result,
   * not a WRONG_PHASE error. Only first-sighting keys go through phase and
   * legality validation; rejected first submissions are never journaled, so
   * a corrected retry just works. */

  /** True when this key was already applied. A payload mismatch under the
   *  same key is a bug or an attack — fail loudly instead of double-applying
   *  or silently ignoring either way. */
  private isDuplicate<A>(env: ActionEnvelope<A>, summary: string): boolean {
    const seen = this.journal.get(env.idempotency_key);
    if (seen === undefined) return false;
    if (seen.summary !== summary) {
      throw new EngineError(
        'IDEMPOTENCY_CONFLICT',
        `key ${env.idempotency_key} was used on day ${seen.day} for "${seen.summary}", now "${summary}"`,
      );
    }
    return true; // exact retry — no state change
  }

  private journalRecord<A>(env: ActionEnvelope<A>, summary: string): void {
    this.journal.set(env.idempotency_key, { day: this.state.day, summary });
  }

  private requireLive(phase: CaseState['phase']): void {
    if (this.state.verdict !== null) {
      throw new EngineError('CASE_OVER', `verdict ${this.state.verdict} is final`);
    }
    if (this.state.phase !== phase) {
      throw new EngineError('WRONG_PHASE', `expected phase ${phase}, got ${this.state.phase}`);
    }
  }

  private pushPublic(event: PublicEvent): void {
    this.state.log.push(event);
  }

  private pushPrivate(event: PrivateInvestigatorEvent): void {
    this.state.private_log_investigator.push(event);
  }

  private finish(verdict: Verdict): void {
    this.state.verdict = verdict;
    this.state.phase = 'CASE_OVER';
    this.pushPublic({ day: this.state.day, kind: 'VERDICT', verdict });
  }

  /* ================================================== STEP 1 + 2–5 ====== */

  /** Fugitive's submitted action for today (§2 step 1), then steps 2–5. */
  submitFugitive(env: ActionEnvelope<FugitiveSubmission>): void {
    const desc = env.action.kind === 'MOVE' ? `MOVE→${env.action.to}` : 'HOLD';
    if (this.isDuplicate(env, desc)) return;
    this.requireLive('FUGITIVE_MOVE');

    if (isStranded(this.vm, this.state, this.p)) {
      // §9.13: nothing is affordable — the day is ENGINE-resolved (T4:
      // FORCED_HOLD is never a legal client submission). Reject without
      // journaling so the server layer can call resolveStranded().
      throw new EngineError(
        'STRANDED_NO_ACTION',
        `day ${this.state.day}: no affordable action (§9.13) — call resolveStranded()`,
      );
    }

    const from = this.state.fugitive.position;
    if (env.action.kind === 'MOVE') {
      const edge = cheapestEdgeTo(this.vm, from, env.action.to);
      if (edge === null) {
        throw new EngineError('ILLEGAL_SUBMISSION', `§3.1: no edge ${from}→${env.action.to}`);
      }
      if (edge.cost > this.state.fugitive.stamina) {
        throw new EngineError('ILLEGAL_SUBMISSION', `§3.1: edge ${from}→${env.action.to} costs ${edge.cost} SP > ${this.state.fugitive.stamina}`);
      }
      this.journalRecord(env, desc);
      this.state.fugitive.stamina -= edge.cost;
      this.state.fugitive.position = env.action.to;
      this.route.push({
        day: this.state.day,
        action: { kind: 'MOVE', to: env.action.to },
        from,
        to: env.action.to,
        edge_class: edge.cls,
        sp_cost: edge.cost,
      });
    } else {
      const leg = fugitiveLegality(this.vm, this.state, this.p);
      if (!leg.hold) {
        throw new EngineError(
          'ILLEGAL_SUBMISSION',
          `§3.3: Hold illegal (holds_used ${this.state.fugitive.holds_used}/${this.p.P6_hold_max}, stamina ${this.state.fugitive.stamina})`,
        );
      }
      this.journalRecord(env, desc);
      this.state.fugitive.stamina -= this.p.P6_hold_cost;
      this.state.fugitive.holds_used += 1;
      this.route.push({
        day: this.state.day,
        action: { kind: 'HOLD' },
        from,
        to: from,
        edge_class: null, // T12
        sp_cost: this.p.P6_hold_cost,
      });
    }
    this.resolveSteps2to5();
  }

  /** §9.13: the stranded day resolves as a forced Hold at no SP cost;
   *  holds_used unchanged; public STRANDED entry; reveals treat it as
   *  "no movement". Engine-produced — never a submission (T4). */
  resolveStranded(): void {
    this.requireLive('FUGITIVE_MOVE');
    if (!isStranded(this.vm, this.state, this.p)) {
      throw new EngineError('NOT_STRANDED', 'legal actions remain — resolveStranded() is §9.13-only');
    }
    const from = this.state.fugitive.position;
    this.route.push({
      day: this.state.day,
      action: { kind: 'FORCED_HOLD' },
      from,
      to: from,
      edge_class: null, // T12
      sp_cost: 0,
    });
    this.pushPublic({ day: this.state.day, kind: 'STRANDED' });
    this.resolveSteps2to5();
  }

  /** §2 steps 2–5, in order, no skips (capture/escape end the case early). */
  private resolveSteps2to5(): void {
    const day = this.state.day;

    // STEP 2 — STAKEOUT CHECK (§2, §5.2, §9.6). Armed during day-1's step 6;
    // consumed on hit or miss alike; a miss is silent to the Fugitive.
    const armed = this.state.investigator.stakeout_armed;
    if (armed !== null) {
      this.state.investigator.stakeout_armed = null; // consumed either way (T9)
      if (this.state.fugitive.position === armed) {
        this.finish('CAPTURE'); // steps 3–7 do not occur
        return;
      }
      this.pushPrivate({ day, kind: 'STAKEOUT_MISS', target: armed });
    }

    // STEP 3 — EVIDENCE TICK (§2 step 3, §4, §9.7, §9.13). Reveals describe
    // the just-resolved day. T13: district before transit if both scheduled.
    if (this.config.reveal_schedule.district_days.includes(day)) {
      this.pushPublic({
        day,
        kind: 'DISTRICT_REVEAL',
        district: this.vm.districtOf.get(this.state.fugitive.position)!,
      });
    }
    if (this.config.reveal_schedule.transit_days.includes(day)) {
      const today = this.route[this.route.length - 1];
      this.pushPublic({
        day,
        kind: 'TRANSIT_REVEAL',
        move_class:
          today !== undefined && today.day === day && today.edge_class !== null
            ? today.edge_class
            : 'NO_MOVEMENT',
      });
    }

    // STEP 4 — DROP CHECK (§2 step 4, §3.3, AUD-004). Purely position-based:
    // fires after a Move OR a Hold/FORCED_HOLD; in-order only (§9.8).
    if (this.state.fugitive.drops_collected < 2) {
      const pending =
        this.state.fugitive.drops_collected === 0 ? this.config.drops[0]! : this.config.drops[1]!;
      if (this.state.fugitive.position === pending) {
        this.state.fugitive.drops_collected =
          (this.state.fugitive.drops_collected + 1) as 0 | 1 | 2;
        this.pushPublic({
          day,
          kind: 'DROP_COMPLETED',
          slot: this.state.fugitive.drops_collected as 1 | 2,
          site: pending,
        });
      }
    }

    // STEP 5 — ESCAPE CHECK (§2 step 5, §6, §9.5). Gate is ordinary ground
    // until both drops are collected.
    if (
      this.state.fugitive.drops_collected === 2 &&
      this.state.fugitive.position === this.config.gate
    ) {
      this.finish('ESCAPE');
      return;
    }

    this.state.phase = 'INVESTIGATOR_ACTIONS';
  }

  /* ====================================================== STEP 6 ========= */

  /** One Investigator action within the day's phase (§2 step 6, §5).
   *  {kind:'WAIT'} ends the phase (equivalent to endInvestigatorPhase). */
  submitInvestigator(env: ActionEnvelope<InvestigatorSubmission>): void {
    const desc =
      env.action.kind === 'PROBE' ? `PROBE@${env.action.target}`
      : env.action.kind === 'STAKEOUT' ? `STAKEOUT@${env.action.target}`
      : 'WAIT';
    if (this.isDuplicate(env, desc)) return;
    this.requireLive('INVESTIGATOR_ACTIONS');

    if (env.action.kind === 'PROBE') {
      if (!this.nodeExists(env.action.target)) {
        throw new EngineError('UNKNOWN_NODE', `probe target ${env.action.target} not on map`);
      }
      const leg = investigatorLegality(this.state, this.p);
      if (!leg.probe) {
        throw new EngineError(
          'ILLEGAL_SUBMISSION',
          `§5.1/§5.3: probe illegal (intel ${this.state.investigator.intel}, probes_today ${this.state.investigator.probes_today})`,
        );
      }
      this.state.investigator.intel -= this.p.P7_probe_cost;
      this.state.investigator.probes_today += 1;
      this.journalRecord(env, desc);
      this.pushPrivate({
        day: this.state.day,
        kind: 'PROBE_RESULT',
        target: env.action.target,
        result: this.state.fugitive.position === env.action.target ? 'HIT' : 'MISS',
      });
      return;
    }

    if (env.action.kind === 'STAKEOUT') {
      if (!this.nodeExists(env.action.target)) {
        throw new EngineError('UNKNOWN_NODE', `stakeout target ${env.action.target} not on map`);
      }
      const leg = investigatorLegality(this.state, this.p);
      if (!leg.stakeout) {
        throw new EngineError(
          'ILLEGAL_SUBMISSION',
          this.state.day >= this.p.P1_days_per_case
            ? '§5.2/§9.3: stakeout forbidden on the final day'
            : `§5.2/§5.3: stakeout illegal (intel ${this.state.investigator.intel}, slot ${this.state.investigator.stakeout_armed === null ? 'free' : 'occupied'})`,
        );
      }
      this.state.investigator.intel -= this.p.P8_stakeout_cost;
      this.state.investigator.stakeout_armed = env.action.target;
      this.journalRecord(env, desc);
      this.pushPrivate({ day: this.state.day, kind: 'STAKEOUT_PLACED', target: env.action.target });
      return;
    }

    // WAIT — doing nothing is legal and ENDS the phase (§2 step 6).
    this.endInvestigatorPhase();
  }

  /** §2 step 7 — CLOCK ADVANCE. On the final day: EXPIRY (Investigator wins,
   *  direction = hypothesis Q1). Otherwise advance the day, reset the daily
   *  probe cap, and emit the new day's DAY_MARKER. The armed stakeout (if
   *  any) persists — it resolves at tomorrow's step 2. */
  endInvestigatorPhase(): void {
    this.requireLive('INVESTIGATOR_ACTIONS');
    if (this.state.day >= this.p.P1_days_per_case) {
      this.finish('EXPIRY');
      return;
    }
    this.state.day += 1;
    this.state.investigator.probes_today = 0;
    this.state.phase = 'FUGITIVE_MOVE';
    this.pushPublic({ day: this.state.day, kind: 'DAY_MARKER' });
  }

  private nodeExists(n: NodeId): boolean {
    return this.vm.adjacency.has(n);
  }

  /* --------------------------------------------- clock-layer verdicts ---- */

  /** §6/§7 — driven by the async-clock layer (missed deadlines), never by
   *  resolution. Solo mode (MVP) has no clocks; this exists for §6 totality. */
  forfeit(role: 'FUGITIVE' | 'INVESTIGATOR'): void {
    if (this.state.verdict !== null) {
      throw new EngineError('CASE_OVER', 'case already has a verdict');
    }
    this.finish(role === 'FUGITIVE' ? 'FORFEIT_F' : 'FORFEIT_I');
  }

  /** §9.11 — simultaneous mutual abandonment. */
  voidCase(): void {
    if (this.state.verdict !== null) {
      throw new EngineError('CASE_OVER', 'case already has a verdict');
    }
    this.finish('VOID');
  }
}

/* ------------------------------------------------------- scripted driver */

/** One day's script. `fugitive` is REQUIRED unless the day is stranded
 *  (the driver resolves §9.13 itself) or the case already ended. */
export interface DayScript {
  fugitive?: FugitiveSubmission;
  investigator?: InvestigatorSubmission[];
}

export interface ScriptedResult {
  session: CaseSession;
  state: CaseState;
  disclosure: CaseEndDisclosure;
  /** Convenience verdict/winner pair for harness aggregation. */
  verdict: Verdict;
  winner: (typeof VERDICT_WINNER)[Verdict];
}

/** Pure deterministic driver: config + script ⇒ outcome (03-rules header's
 *  determinism guarantee, executable). This is the W3 sim harness's entry
 *  point and the golden-test workhorse. No envelopes/journal overhead.
 *  T16/ADR-003: `opts.params` = opt-in simulation overrides. */
export function runScriptedCase(
  vm: ValidatedMap,
  config: CaseConfig,
  script: readonly DayScript[],
  opts: { params?: SimParamOverrides } = {},
): ScriptedResult {
  const session = new CaseSession(vm, config, opts);
  for (let day = 1; day <= session.p.P1_days_per_case; day++) {
    if (session.state.verdict !== null) break;
    if (session.state.phase !== 'FUGITIVE_MOVE') {
      throw new EngineError('SCRIPT_ERROR', `day ${day}: expected FUGITIVE_MOVE, got ${session.state.phase}`);
    }
    if (isStranded(vm, session.state, session.p)) {
      if (script[day - 1]?.fugitive !== undefined) {
        throw new EngineError('SCRIPT_ERROR', `day ${day}: fugitive action supplied but the day is stranded (§9.13)`);
      }
      session.resolveStranded();
    } else {
      const action = script[day - 1]?.fugitive;
      if (action === undefined) {
        throw new EngineError('SCRIPT_ERROR', `day ${day}: script has no fugitive action`);
      }
      session.submitFugitive({ idempotency_key: `script-f-${day}`, action });
    }
    if (session.state.verdict !== null) break; // capture/escape at steps 2/5
    const midPhase: string = session.state.phase; // fresh read — steps 2–5 mutated it
    if (midPhase !== 'INVESTIGATOR_ACTIONS') {
      throw new EngineError('SCRIPT_ERROR', `day ${day}: expected INVESTIGATOR_ACTIONS, got ${midPhase}`);
    }
    for (let i = 0; i < (script[day - 1]?.investigator ?? []).length; i++) {
      if (session.state.verdict !== null) break;
      const action = script[day - 1]!.investigator![i]!;
      session.submitInvestigator({ idempotency_key: `script-i-${day}-${i}`, action });
      if (action.kind === 'WAIT') break; // WAIT ended the phase
    }
    if (session.state.verdict !== null) break;
    const endPhase: string = session.state.phase; // fresh read — step 6 mutated it
    if (endPhase === 'INVESTIGATOR_ACTIONS') session.endInvestigatorPhase();
  }
  if (session.state.verdict === null) {
    throw new EngineError('SCRIPT_ERROR', 'script exhausted without a verdict — engine or script broken');
  }
  return {
    session,
    state: session.state,
    disclosure: session.disclosure(),
    verdict: session.state.verdict,
    winner: VERDICT_WINNER[session.state.verdict],
  };
}
