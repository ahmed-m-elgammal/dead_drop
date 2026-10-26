/**
 * ============================================================================
 * BeliefTracker — the Investigator-side EXACT belief filter (M3 W3 port)
 * ============================================================================
 *
 * VERBATIM PORT of packages/sim/src/belief.ts (@dead-drop/sim 0.1.1-alpha.0,
 * the M2 W3 implementation that ran the recorded 133,500-case matrix) onto
 * the web app's `@dead-drop/engine` lift. The port is checked against the sim's dist
 * build by scripts/w3_belief_parity.mts (same posteriors on N random cases).
 *
 * Why this exists here: 05-ai-spec §2's I-GreedyProbe baseline is defined
 * against an EXACT Bayesian tracker, and the M2 sim already owns the tuned,
 * pilot-verified implementation. The web AI must be the SAME opponent the
 * balance numbers were measured against — not a re-derivation.
 *
 * The engine deliberately keeps belief OUT of game state (T10): knowledge
 * lives in the Investigator's head. This filter is that head — fed ONLY what
 * the §1.3 wall lets the Investigator see (sync() takes an InvestigatorView;
 * TypeScript is the wall). It never reads live CaseSession state.
 *
 * Transition model (the one modeling convention): an UNOBSERVED fugitive day
 * is a uniform draw over the LEGAL actions available in each state — exactly
 * the legality the engine enforces (§3.1 affordable edges with the T15
 * minimal-SP parallel-edge rule; §3.3 Hold; §9.13 forced Hold when nothing
 * is affordable). Strategy-agnostic prior; skill shows up as hit-rate
 * EXCEEDING posterior mass (04-balance-sim §4.3/§4.5).
 *
 * Determinism: no RNG anywhere; pure arithmetic over a small state space
 * (48 nodes × 13 sp × 3 drops × 3 holds ≤ 5,616 states, pruned to reachable).
 * ============================================================================
 */
import type {
  DistrictId,
  EdgeClass,
  InvestigatorView,
  NodeId,
  PrivateInvestigatorEvent,
  PublicEvent,
} from '@dead-drop/engine';
import { edgeCost, type EffectiveParams, type ValidatedMap } from '@dead-drop/engine';

type Drops = 0 | 1 | 2;
type AnyEvent = PublicEvent | PrivateInvestigatorEvent;

/** Position-based, in-order drop collection (rules §2 step 4 / §3.3; AUD-004)
 *  — mirrors the engine's feasibility collect() exactly. */
function collect(d: Drops, at: NodeId, d1: NodeId, d2: NodeId): Drops {
  if (d < 2 && at === (d === 0 ? d1 : d2)) return (d + 1) as Drops;
  return d;
}

interface MassState {
  node: NodeId;
  sp: number;
  drops: Drops;
  holds: number;
  mass: number;
  /** Class of the day's resolved action (engine §2 step-3 reveal semantics):
   *  the taken edge's class for a MOVE, 'NO_MOVEMENT' for Hold/FORCED_HOLD. */
  cls: EdgeClass | 'NO_MOVEMENT';
  /** True when this state arose from a §9.13 forced Hold. */
  forced: boolean;
}

const skey = (n: NodeId, sp: number, d: Drops, h: number): string => `${n}|${sp}|${d}|${h}`;

/** Evidence rank within one day — reconstructs the engine's §2 emission order
 *  across the two event arrays (public + investigator-private):
 *  DAY_MARKER < STRANDED < STAKEOUT_MISS < DISTRICT_REVEAL < TRANSIT_REVEAL
 *  < DROP_COMPLETED < VERDICT < PROBE_RESULT/STAKEOUT_PLACED. (T13: district
 *  before transit.) STAKEOUT_PLACED is the policy's own step-6 action — no
 *  filtering information, tolerated as a no-op. */
function eventRank(kind: string): number {
  switch (kind) {
    case 'DAY_MARKER': return 0;
    case 'STRANDED': return 1;
    case 'STAKEOUT_MISS': return 2;
    case 'DISTRICT_REVEAL': return 3;
    case 'TRANSIT_REVEAL': return 4;
    case 'DROP_COMPLETED': return 5;
    case 'VERDICT': return 6;
    case 'PROBE_RESULT': return 7;
    case 'STAKEOUT_PLACED': return 7;
    default: throw new Error(`[BELIEF] unknown event kind ${kind}`);
  }
}

export class BeliefTracker {
  private readonly vm: ValidatedMap;
  private readonly d1: NodeId;
  private readonly d2: NodeId;
  private readonly p: EffectiveParams;

  /** Current posterior. Every state was produced by the LAST applied day
   *  transition, so the transient action metadata (cls/forced) is well-defined
   *  for all states until that day's evidence is consumed. */
  private states = new Map<string, MassState>();
  private lastAppliedDay = 0;
  private consumedPublic = 0;
  private consumedPrivate = 0;
  private over = false;

  constructor(
    vm: ValidatedMap,
    safehouse: NodeId,
    startSp: number,
    d1: NodeId,
    d2: NodeId,
    params: EffectiveParams,
  ) {
    this.vm = vm;
    this.d1 = d1;
    this.d2 = d2;
    this.p = params;
    // Day 0: the fugitive stands at the PUBLIC safehouse (config is public).
    this.states.set(skey(safehouse, startSp, 0, 0), {
      node: safehouse, sp: startSp, drops: 0, holds: 0, mass: 1,
      cls: 'NO_MOVEMENT', forced: false,
    });
  }

  /* ------------------------------------------------------------ public API */

  /** Posterior total (≈1 between normalizations; exact 1 right after them). */
  get totalMass(): number {
    let t = 0;
    for (const s of this.states.values()) t += s.mass;
    return t;
  }

  /** Consume every not-yet-seen event in the view (engine emission order).
   *  Idempotent across calls (tracks consumed indexes per event array). */
  sync(view: InvestigatorView): void {
    if (this.over) return;

    const newPublic: PublicEvent[] = view.log.slice(this.consumedPublic);
    const newPrivate: PrivateInvestigatorEvent[] =
      view.private_log_investigator.slice(this.consumedPrivate);
    this.consumedPublic = view.log.length;
    this.consumedPrivate = view.private_log_investigator.length;
    if (newPublic.length === 0 && newPrivate.length === 0) return;

    const merged: Array<{ ev: AnyEvent; rank: number; seq: number }> = [
      ...newPublic.map((ev, i) => ({ ev, rank: eventRank(ev.kind), seq: i })),
      ...newPrivate.map((ev, i) => ({ ev, rank: eventRank(ev.kind), seq: i })),
    ];
    // Stable sort by (day, rank, source seq) reconstructs §2 order; ties within
    // a rank keep array order (probe submission order; T13 district/transit).
    merged.sort((a, b) => a.ev.day - b.ev.day || a.rank - b.rank || a.seq - b.seq);

    for (const { ev } of merged) {
      if (this.over) break;
      if (ev.day > this.lastAppliedDay) {
        // The unobserved fugitive move (§2 step 1) precedes every day-d
        // evidence event (steps 2–5) and every probe (step 6).
        this.applyTransition(ev.day);
      }
      switch (ev.kind) {
        case 'DAY_MARKER':
          break; // boundary only; the transition is applied as above
        case 'STRANDED':
          this.condition((s) => s.forced);
          break;
        case 'STAKEOUT_MISS':
          this.condition((s) => s.node !== ev.target);
          break;
        case 'DISTRICT_REVEAL':
          this.condition((s) => this.districtOf(s.node) === ev.district);
          break;
        case 'TRANSIT_REVEAL':
          this.condition((s) => s.cls === ev.move_class);
          break;
        case 'DROP_COMPLETED':
          this.condition((s) => s.node === ev.site && s.drops === ev.slot);
          break;
        case 'PROBE_RESULT':
          this.condition(ev.result === 'HIT' ? (s) => s.node === ev.target : (s) => s.node !== ev.target);
          break;
        case 'VERDICT':
          this.over = true;
          break;
        case 'STAKEOUT_PLACED':
          break; // own step-6 action; no filtering information
      }
    }
    this.pruneNormalize();
  }

  /** Apply the unobserved transition for `day` if not yet applied. The
   *  policy calls this with view.day before reading the posterior during
   *  the day-d Investigator phase (the day-d fugitive move has already
   *  happened by §2 order — it is just unobserved). */
  markDay(day: number): void {
    if (this.over) return;
    if (day > this.lastAppliedDay) this.applyTransition(day);
  }

  /** Node-marginal posterior at the CURRENT belief. */
  nodeMarginal(): Map<NodeId, number> {
    const out = new Map<NodeId, number>();
    for (const s of this.states.values()) {
      out.set(s.node, (out.get(s.node) ?? 0) + s.mass);
    }
    return out;
  }

  /** Argmax node by posterior mass; ties break to the lexicographically
   *  smallest node id (deterministic). */
  maxNode(): { node: NodeId; mass: number } {
    const marg = this.nodeMarginal();
    let best: { node: NodeId; mass: number } | null = null;
    for (const [node, mass] of marg) {
      if (best === null || mass > best.mass || (mass === best.mass && node < best.node)) {
        best = { node, mass };
      }
    }
    if (best === null) throw new Error('[BELIEF] empty posterior');
    return best;
  }

  /** Posterior mass at one node (current belief). */
  massAt(node: NodeId): number {
    return this.nodeMarginal().get(node) ?? 0;
  }

  /** PREDICTIVE mass at one node: the belief advanced through ONE more
   *  unobserved fugitive day with NO evidence — i.e. the probability that a
   *  stakeout placed NOW on `node` finds the fugitive there at its resolution
   *  moment (next day, §2 step 2, post-move). Non-mutating. */
  predictiveMassAt(node: NodeId): number {
    const advanced = this.advance(this.states);
    let hit = 0;
    let total = 0;
    for (const s of advanced.values()) {
      total += s.mass;
      if (s.node === node) hit += s.mass;
    }
    return total > 0 ? hit / total : 0;
  }

  /** Argmax of the PREDICTIVE distribution (see predictiveMassAt): the node
   *  most likely to hold the fugitive at a stakeout's resolution moment.
   *  Ties break lexicographically. Non-mutating. */
  predictiveMaxNode(): { node: NodeId; mass: number } {
    const advanced = this.advance(this.states);
    const marg = new Map<NodeId, number>();
    let total = 0;
    for (const s of advanced.values()) {
      total += s.mass;
      marg.set(s.node, (marg.get(s.node) ?? 0) + s.mass);
    }
    let best: { node: NodeId; mass: number } | null = null;
    for (const [node, mass] of marg) {
      const norm = total > 0 ? mass / total : 0;
      if (best === null || norm > best.mass || (norm === best.mass && node < best.node)) {
        best = { node, mass: norm };
      }
    }
    if (best === null) throw new Error('[BELIEF] empty predictive posterior');
    return best;
  }

  /* -------------------------------------------------------------- internals */

  private districtOf(n: NodeId): DistrictId {
    return this.vm.districtOf.get(n)!;
  }

  private applyTransition(day: number): void {
    this.states = this.advance(this.states);
    this.lastAppliedDay = day;
    this.pruneNormalize();
  }

  /** One unobserved fugitive day: expand every state over its LEGAL actions
   *  (engine legality, incl. T15 minimal-SP parallel resolution and §9.13).
   *
   *  Class metadata is part of the DAY-TRANSITION key: two branches can reach
   *  the same (node, sp, drops, holds) with different action classes (a Hold
   *  successor has holds+1; a Move successor from a state that already held
   *  does not — their keys collide), and a transit reveal must condition each
   *  branch separately. Metadata is collapsed at the START of the NEXT
   *  transition, where it becomes stale. */
  private advance(from: Map<string, MassState>): Map<string, MassState> {
    // Collapse last day's metadata (stale once that day's evidence is applied).
    const collapsed = new Map<string, MassState>();
    for (const s of from.values()) {
      const k = skey(s.node, s.sp, s.drops, s.holds);
      const prev = collapsed.get(k);
      if (prev !== undefined) prev.mass += s.mass;
      else collapsed.set(k, { ...s, cls: 'NO_MOVEMENT', forced: false });
    }

    const out = new Map<string, MassState>();
    const add = (s: MassState): void => {
      const k = `${skey(s.node, s.sp, s.drops, s.holds)}|${s.cls}|${s.forced ? 1 : 0}`;
      const prev = out.get(k);
      if (prev === undefined) out.set(k, s);
      else prev.mass += s.mass; // identical branch (same metadata) — merge
    };
    for (const s of collapsed.values()) {
      // Minimal-SP edge per target, first-wins on cost ties — a faithful
      // replica of the engine's cheapestEdgeTo iteration order.
      const best = new Map<NodeId, { cls: EdgeClass; cost: number }>();
      for (const e of this.vm.adjacency.get(s.node)!) {
        const cost = edgeCost(e.cls);
        const prev = best.get(e.node);
        if (prev === undefined || cost < prev.cost) best.set(e.node, { cls: e.cls, cost });
      }
      const moves = [...best.entries()].filter(([, b]) => b.cost <= s.sp);
      const holdLegal = s.holds < this.p.P6_hold_max && s.sp >= this.p.P6_hold_cost;

      if (moves.length === 0 && !holdLegal) {
        // §9.13 FORCED_HOLD: position, sp, holds unchanged; the position-based
        // drop check (§2 step 4) still fires. Single successor — full mass.
        add({
          node: s.node, sp: s.sp, drops: collect(s.drops, s.node, this.d1, this.d2),
          holds: s.holds, mass: s.mass, cls: 'NO_MOVEMENT', forced: true,
        });
        continue;
      }
      // Uniform-over-legal-actions prior: the parent's mass splits evenly
      // across ITS OWN options (states with fewer options do NOT dilute
      // other states' branches).
      const k = moves.length + (holdLegal ? 1 : 0);
      const share = s.mass / k;
      for (const [target, b] of moves) {
        add({
          node: target, sp: s.sp - b.cost, drops: collect(s.drops, target, this.d1, this.d2),
          holds: s.holds, mass: share, cls: b.cls, forced: false,
        });
      }
      if (holdLegal) {
        add({
          node: s.node, sp: s.sp - this.p.P6_hold_cost,
          drops: collect(s.drops, s.node, this.d1, this.d2),
          holds: s.holds + 1, mass: share, cls: 'NO_MOVEMENT', forced: false,
        });
      }
    }
    return out;
  }

  /** Hard evidence: keep states satisfying the predicate, drop the rest. */
  private condition(pred: (s: MassState) => boolean): void {
    for (const [k, s] of this.states) {
      if (!pred(s)) this.states.delete(k);
    }
  }

  private pruneNormalize(): void {
    let total = 0;
    for (const s of this.states.values()) total += s.mass;
    if (total <= 0) {
      // Cannot happen for consistent evidence (the true state always
      // survives); fail loudly rather than divide by zero.
      throw new Error('[BELIEF] posterior collapsed to zero — evidence contradicts the transition model');
    }
    for (const s of this.states.values()) s.mass /= total;
  }
}
