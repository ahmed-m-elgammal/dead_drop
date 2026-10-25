/* ============================================================================
 * ENGINE COPY — PROVENANCE BANNER (added by the M2 W2 pre-flight scaffold)
 * ============================================================================
 * This file is lifted VERBATIM from `m1/engine-types/dead-drop.types.ts`
 * (M1 W2 artifact, repo commit 22b6320) per the frozen-inputs contract in
 * `m1/m2-handoff.md` §1.2. The M1 file remains untouched as the design
 * artifact; THIS copy is the engine's working type layer.
 *
 * Standing rules (unchanged from the M1 scope guard):
 *   - If this file and 03-rules.md disagree, 03-rules.md WINS, and the
 *     discrepancy is a finding for m1/engine-types/README.md.
 *   - Parameter values are imported from PARAMETERS_V1_0_0_ALPHA_1 — engine
 *     code never hard-codes them (m1/m2-handoff.md §1.3).
 *
 * Known divergences, documented rather than silently patched (see
 * m1/engine-types/README.md T11 and packages/engine/README.md §4):
 *   1. MAP_VERSION_ALPHA below is the draft-time snapshot value ('1.0.0').
 *      The canonical asset is v1.2.0 (pool 16→24, adopted M2 W1 lever).
 *      Runtime code must read `map.version` from the loaded asset — never
 *      trust this constant (see src/map.ts).
 *   2. CityMapNode's is_gate/is_safehouse/is_drop_candidate flags do not
 *      exist in the JSON asset; the pools are declared as separate arrays.
 *      src/map.ts derives the flags from the pools at load time.
 * ============================================================================
 */

/**
 * ============================================================================
 * DEAD DROP — ENGINE TYPE SPECIFICATION (M1 Week 2 artifact)
 * ============================================================================
 *
 * Derived strictly from `03-rules.md` §1 (components & state model) and §2
 * (day-resolution sequence), ruleset **1.0.0-alpha.1**, map_alpha v1.0.0.
 *
 * SCOPE GUARD (M1 constraint, per m1/M1-execution-plan.md W2):
 *   - TYPES ONLY. No functions, no resolution logic, no runtime behavior.
 *   - No package.json, no build config, no dependencies — this file is a
 *     design/spec artifact, not application code. It is intentionally NOT
 *     compiled anywhere. It becomes the skeleton input for the M2 engine.
 *   - If this file and 03-rules.md disagree, 03-rules.md WINS, and the
 *     discrepancy is a finding for m1/engine-types/README.md.
 *
 * Companion reading: m1/engine-types/README.md (type→§ mapping + the
 * ambiguities that drafting this file surfaced).
 * ============================================================================
 */

/* ---------------------------------------------------------------------------
 * 0. Identity & version anchors (03-rules §11, §9.12)
 * ------------------------------------------------------------------------- */

/** Current ruleset under which new cases are created. Live cases are pinned to
 *  their creation version for their entire life (§9.12, §11). */
export const RULESET_VERSION = '1.0.0-alpha.1';

/** Map data is versioned on its own clock, separate from rules (§11). */
export const MAP_ID_ALPHA = 'map_alpha';
export const MAP_VERSION_ALPHA = '1.0.0';

/* ---------------------------------------------------------------------------
 * 1. The city (03-rules §1.1; data: assets/sample_map_alpha.json)
 * ------------------------------------------------------------------------- */

/** Node id format: `D{district}-{ring position 01..12}`, e.g. `"D2-07"`. */
export type NodeId = string;

/** One of exactly 4 districts (map_alpha). Keyed by id, valued by flavor name. */
export type DistrictId = 'D1' | 'D2' | 'D3' | 'D4';

/** Edge transit class (§1.1): exactly one per edge.
 *  F = Foot, T = Tram, M = Metro. Classes differ in stamina cost (§3.2) and
 *  evidence exposure (§4) — NEVER in speed: every move takes exactly one day. */
export type EdgeClass = 'F' | 'T' | 'M';

export interface CityMapNode {
  id: NodeId;
  district: DistrictId;
  is_gate: boolean;
  is_safehouse: boolean;
  is_drop_candidate: boolean;
}

export interface CityMapEdge {
  a: NodeId;
  b: NodeId;
  type: EdgeClass;
}

export type CityMap = {
  map_id: string;
  version: string;
  districts: Record<DistrictId, string>;
  nodes: CityMapNode[];
  edges: CityMapEdge[];
  /** map_alpha pools: 16 drop candidates, 2 gates, 2 safehouses. */
  drop_candidates: NodeId[];
  gates: NodeId[];
  safehouses: NodeId[];
  notes: string;
};

/* ---------------------------------------------------------------------------
 * 2. Case configuration (03-rules §1.2 — public unless marked)
 * ------------------------------------------------------------------------- */

/** Reveal schedule. Typed as plain arrays (NOT literal [3,6]/[4]) because
 *  P9/P10 are [hypothesis] parameters swept by simulation scenario S2
 *  (04-balance-sim §4.4); v1.0-alpha values are {3,6} / {4}. */
export interface RevealSchedule {
  district_days: readonly number[];
  transit_days: readonly number[];
}

export interface CaseConfig {
  map_id: string;
  ruleset_version: string;
  /** PUBLIC — the Fugitive's start node (a declared safehouse). */
  safehouse: NodeId;
  /** PUBLIC and ORDERED. Generator forbids drops[0] === drops[1] and
   *  gate ∈ drops (§9.8) — a generator obligation, unenforceable in types. */
  drops: readonly [NodeId, NodeId];
  /** PUBLIC. */
  gate: NodeId;
  /** Default 12 (P3). */
  stamina_budget: number;
  /** Default 10 (P4). */
  intel_budget: number;
  reveal_schedule: RevealSchedule;
  /** Recorded; the case is reproducible from (config, action sequence). */
  seed: number;
}

/* ---------------------------------------------------------------------------
 * 3. Verdicts & winners (03-rules §1.3, §6)
 * ------------------------------------------------------------------------- */

/** The complete verdict set. No draws exist (§6). Fixed by rules logic, hence
 *  a closed literal union (unlike swept parameters, which stay `number`). */
export type Verdict =
  | 'ESCAPE'      // Fugitive wins
  | 'CAPTURE'     // Investigator wins
  | 'EXPIRY'      // Investigator wins (direction is hypothesis Q1)
  | 'FORFEIT_F'   // Investigator wins
  | 'FORFEIT_I'   // Fugitive wins
  | 'VOID';       // nobody (§9.11)

export type Winner = 'FUGITIVE' | 'INVESTIGATOR' | 'NOBODY';

/** Derived from the §6 table. Kept as DATA (not logic) so the engine cannot
 *  re-derive it inconsistently with the rules text. */
export const VERDICT_WINNER: Readonly<Record<Verdict, Winner>> = {
  ESCAPE: 'FUGITIVE',
  CAPTURE: 'INVESTIGATOR',
  EXPIRY: 'INVESTIGATOR',
  FORFEIT_F: 'INVESTIGATOR',
  FORFEIT_I: 'FUGITIVE',
  VOID: 'NOBODY',
};

/* ---------------------------------------------------------------------------
 * 4. Phases & resolution steps (03-rules §1.3 phase enum; §2 seven-step order)
 * ------------------------------------------------------------------------- */

/** The four externally observable phases (§1.3 CaseState). */
export type Phase =
  | 'FUGITIVE_MOVE'
  | 'RESOLVING'
  | 'INVESTIGATOR_ACTIONS'
  | 'CASE_OVER';

/** The seven internally normative steps of one day (§2). Drafting note: §1.3
 *  exposes only the 4 phases above; the mapping is implicit in the rules text
 *  — step 1 = FUGITIVE_MOVE, steps 2–5 = RESOLVING, step 6 =
 *  INVESTIGATOR_ACTIONS, step 7 (clock advance) is a TRANSITION, not a phase.
 *  An engine may track steps internally but must expose only Phase. */
export type ResolutionStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Day index. 1..8 under v1.0-alpha (P1). Kept `number` — not a literal
 *  union — because P1 is swept by scenario S6 (04-balance-sim §4.4); engines
 *  validate the range at case load, not at the type level. */
export type Day = number;

/* ---------------------------------------------------------------------------
 * 5. Actions (03-rules §2 step 1, §3, §5, §9.13)
 * ------------------------------------------------------------------------- */

/** What the Fugitive may SUBMIT. Legality (engine-side, not expressible in
 *  types): Move ⇔ edge (current→to) exists ∧ stamina ≥ edge cost (§3.1);
 *  Hold ⇔ holds_used < P6 max ∧ stamina ≥ 1 (§3.3). Exactly one per day. */
export type FugitiveSubmission =
  | { kind: 'MOVE'; to: NodeId }  // cost derived from the edge's class (§3.2)
  | { kind: 'HOLD' };             // can collect a pending drop (§2 step 4, §3.3)

/** Superset used internally by resolution: §9.13 (0 SP ⇒ nothing affordable)
 *  resolves the day as a forced Hold at no SP cost — the ENGINE produces it,
 *  it is never a legal client submission. Type-level separation documents that. */
export type FugitiveResolvedAction = FugitiveSubmission | { kind: 'FORCED_HOLD' };

/** What the Investigator may SUBMIT in step 6 (§2, §5). Caps: ≤2 probes and
 *  ≤1 stakeout per day (§5.3); stakeout forbidden on Day 8 (§5.2, §9.3).
 *  WAIT = doing nothing, always legal. */
export type InvestigatorSubmission =
  | { kind: 'PROBE'; target: NodeId }     // 1 IP (§5.1)
  | { kind: 'STAKEOUT'; target: NodeId }  // 3 IP (§5.2)
  | { kind: 'WAIT' };

/** Envelope for ANY submitted action — duplicate submissions with the same
 *  key return the original result (§9.10; 08-api-security §4). */
export interface ActionEnvelope<A> {
  idempotency_key: string;
  action: A;
}

/* ---------------------------------------------------------------------------
 * 6. Events & logs (03-rules §1.3 log fields; §2 steps 2–5; §4; §5.2; §9.13)
 * ------------------------------------------------------------------------- */

export type ProbeResult = 'HIT' | 'MISS'; // information only — never a capture (§5.1)

/** Public events: visible to BOTH roles (and to spectators). */
export type PublicEvent =
  | { day: Day; kind: 'DISTRICT_REVEAL'; district: DistrictId }          // §2 step 3, days 3 & 6
  | { day: Day; kind: 'TRANSIT_REVEAL'; move_class: EdgeClass | 'NO_MOVEMENT' } // §2 step 3 day 4; §9.7
  | { day: Day; kind: 'DROP_COMPLETED'; slot: 1 | 2; site: NodeId }      // §2 step 4 (fires after Move OR Hold)
  | { day: Day; kind: 'STRANDED' }                                        // §9.13 log entry
  | { day: Day; kind: 'DAY_MARKER' }                                      // §1.3 "day markers"
  | { day: Day; kind: 'VERDICT'; verdict: Verdict };

/** Investigator-private events. The Fugitive never sees these during a case
 *  (§1.3 hidden list; §5.2 silent-miss). Revealed in full at case end (§8.6 ref). */
export type PrivateInvestigatorEvent =
  | { day: Day; kind: 'PROBE_RESULT'; target: NodeId; result: ProbeResult }
  | { day: Day; kind: 'STAKEOUT_PLACED'; target: NodeId }   // armed during day d step 6
  | { day: Day; kind: 'STAKEOUT_MISS'; target: NodeId };    // consumed silently (§5.2); a hit ends the case as public VERDICT CAPTURE

/* ---------------------------------------------------------------------------
 * 7. Dynamic state (03-rules §1.3 CaseState — verbatim shape)
 * ------------------------------------------------------------------------- */

export interface FugitiveState {
  /** HIDDEN from the Investigator until case end. */
  position: NodeId;
  /** HIDDEN from the Investigator (Card B: "not your route, not your SP, not your Holds"). */
  stamina: number;
  /** 0..P6_hold_max (2 under v1.0-alpha; S5 sweeps {1,2,3}) ⇒ kept `number`. */
  holds_used: number;
  /** 0..2 — P2 is [computed]-pinned (3-drop shape infeasible), so this one is
   *  safe as a closed union. */
  drops_collected: 0 | 1 | 2;
}

export interface InvestigatorState {
  /** HIDDEN from the Fugitive (§1.3 hidden list). */
  intel: number;
  /** 0..P7_daily_cap (2 under v1.0-alpha; S4 sweeps {1,2}) ⇒ kept `number`.
   *  Reset happens in §2 step 7 (clock advance), not at phase entry. */
  probes_today: number;
  /** Armed during day d step 6; resolves day d+1 step 2; consumed on hit or
   *  miss alike (§5.2). Nulling it is transition logic — types cannot say so. */
  stakeout_armed: NodeId | null;
}

export interface CaseState {
  day: Day;
  phase: Phase;
  fugitive: FugitiveState;
  investigator: InvestigatorState;
  /** Public events in order. */
  log: PublicEvent[];
  /** Investigator-only events in order. */
  private_log_investigator: PrivateInvestigatorEvent[];
  /** null while the case is live. */
  verdict: Verdict | null;
}

/* ---------------------------------------------------------------------------
 * 8. Role-scoped views — the information boundary as TYPES
 *    (03-rules §1.3 exhaustive hidden/public list; enforced by 08-api-security)
 * ------------------------------------------------------------------------- */

export type Role = 'INVESTIGATOR' | 'FUGITIVE';

/** Block declaration form used below to state a structural fact crisply:
 *  an empty record means "the role sees NO dynamic fields here". */
export type HiddenBlock = Record<never, never>;

/** Investigator's view of CaseState. The fugitive block is INTENTIONALLY
 *  empty: every FugitiveState field is hidden from the Investigator during
 *  play (§1.3 exhaustive list). The Investigator's knowledge lives in
 *  `log` + `private_log_investigator` + their own belief model (UI-layer,
 *  06-uiux — deliberately NOT part of engine state). */
export type InvestigatorView = Omit<CaseState, 'fugitive'> & {
  fugitive: HiddenBlock;
};

/** Fugitive's view of CaseState. The investigator block is INTENTIONALLY
 *  empty (§1.3: probe/stakeout placements & results and remaining intel are
 *  hidden), and the private log is stripped entirely. */
export type FugitiveView = Omit<CaseState, 'investigator' | 'private_log_investigator'> & {
  investigator: HiddenBlock;
};

/** One resolved Fugitive day, as recorded by the engine for §8.6 disclosure.
 *
 * T12 (engine amendment over the M1 draft, registered in
 * m1/engine-types/README.md — never silently patched): `edge_class` is
 * `EdgeClass | null` — HOLD / FORCED_HOLD traverse no edge, so there is no
 * honest EdgeClass value for them (the M1 draft demanded one). FORCED_HOLD
 * carries `sp_cost: 0` (§9.13). */
export interface FugitiveRouteEntry {
  day: Day;
  action: FugitiveResolvedAction;
  from: NodeId;
  to: NodeId;
  edge_class: EdgeClass | null; // T12
  sp_cost: number;
}

/** Case-end full disclosure (§8.6 ref): both logs plus the complete route. */
export type CaseEndDisclosure = CaseState & {
  fugitive_route: readonly FugitiveRouteEntry[];
};

/* ---------------------------------------------------------------------------
 * 9. Parameter table as DATA (04-balance-sim §2, v1.0-alpha)
 *    Status labels are copied verbatim; sweeping any of these is an M2
 *    simulation output — never an M1 activity.
 * ------------------------------------------------------------------------- */

export const PARAMETERS_V1_0_0_ALPHA_1 = {
  P1_days_per_case: 8,                    // [hypothesis]
  P2_drops: 2,                            // [computed: 3-drop infeasible in 8 days]
  P3_stamina_budget: 12,                  // [hypothesis]
  P4_intel_budget: 10,                    // [hypothesis]
  P5_transit_costs: { F: 1, T: 2, M: 3 }, // [design judgment; geometry-derived]
  P6_hold_cost: 1,                        // [hypothesis]
  P6_hold_max: 2,                         // [hypothesis]
  P7_probe_cost: 1,                       // [hypothesis]
  P7_probe_daily_cap: 2,                  // [hypothesis]
  P8_stakeout_cost: 3,                    // [hypothesis]
  P8_stakeout_daily_cap: 1,               // [hypothesis]
  P9_district_reveal_days: [3, 6],        // [hypothesis]
  P10_transit_reveal_days: [4],           // [hypothesis]
  P11_stakeout_window: 'armed d resolves d+1; forbidden on day 8', // fixed by rules logic
  P12_feasibility_band: [5, 7],           // [computed: 55/480 configs qualify at SP=12]
  P13_matchmaking_rating_band: 100,       // [design judgment]
  P14_clocks: { casual_hours: 24, ranked_hours: 12 }, // [design judgment]
} as const;
