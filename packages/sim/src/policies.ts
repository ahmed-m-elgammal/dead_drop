/**
 * ============================================================================
 * Scripted policies (04-balance-sim §4.2) — the 5 × 4 balance matrix actors.
 * ============================================================================
 *
 * POLICIES ARE NOT RULES. Nothing here feeds back into the engine; policies
 * only SUBMIT actions through the harness, exactly like clients will. All
 * policies are deterministic given (case seed, policy name): random ones draw
 * from a per-(case, role) seeded stream supplied by the harness.
 *
 * INFORMATION DISCIPLINE (T2 wall): fugitive policies receive FugitiveView,
 * investigator policies receive InvestigatorView. No policy can see the
 * opponent's hidden fields — the type system forbids it, and the harness
 * never passes the raw CaseState.
 *
 * Exact policy rules (the sim's contract; each is a named convention in the
 * W3 report):
 *
 *  F-Beeline      Recomputes the min-(SP, days, lexicographic) completing
 *                 route each day (moves only, never Holds); greedy min-cost
 *                 walk as fallback when the remaining budget cannot complete
 *                 (possible under S1's tightened stamina).
 *  F-Random       Uniform over legal options (affordable moves + Hold if
 *                 legal) — the §4.2 "uniform legal move each day" floor.
 *  F-LeakAware    Plays to WIN and plays the calendar: restricts to route-
 *                 OPTIMAL moves (minimum total completing-route SP cost;
 *                 feasibility-first — leak preferences never buy delay),
 *                 then breaks ties by (1) staying in-district on a district-
 *                 reveal day, (2) varying edge class on a transit-reveal
 *                 day, lexicographic last. Holds only when no move is
 *                 affordable. (Pilot 2026-10-25: the first draft applied the
 *                 tiers as hard filters; they compounded +1 day per reveal
 *                 day and cost ~50% of completions vs even I-Random —
 *                 redesigned as tie-breaks before any recorded run.)
 *  F-Deceptive    LeakAware base; at route-cost parity prefers targets inside
 *                 already-revealed districts (route doubling into "cleared"
 *                 areas); proactively Holds (≤2 per case) when legal,
 *                 feasible, and standing in a revealed district — burns a
 *                 day to break tracker parity (its signature cost, kept).
 *  F-SlackBurner  Picks the MAX-cost affordable move that still leaves the
 *                 case completable within the remaining days (min-days BFS);
 *                 ties lexicographic. If nothing keeps feasibility, cheapest
 *                 legal move (the case is lost anyway — keep walking).
 *
 *  I-GreedyProbe  Exact Bayesian tracker (BeliefTracker). Probes the CURRENT
 *                 modal node (≤ cap/day). Stakeout: GATE on the current
 *                 posterior max ≥ 0.4 (the spec's "never stakes until
 *                 posterior max ≥ 0.4" reads on the posterior over where the
 *                 fugitive IS), TARGET the PREDICTIVE argmax (the posterior
 *                 advanced through the one unobserved day — the distribution
 *                 the §2-step-2 resolution actually tests). Pilot-justified
 *                 convention (2026-10-25): targeting today's argmax converts
 *                 86% probe accuracy into 0 captures against a moving
 *                 fugitive; gating on the predictive mass (≈1/degree ≈ 0.3)
 *                 would never open at all. No probes on stake days; WAIT when
 *                 nothing is legal. Instrumented for Q4 (cap binding).
 *  I-Calendar     GreedyProbe + budget discipline: from day 5, probes only
 *                 while intel − probe_cost ≥ one stakeout's cost (the
 *                 "reserve 3 IP"); from day P1−2 on, stakes the predictive
 *                 argmax whenever affordable regardless of mass (never die
 *                 with IP unspent); same 0.4 current-mass gate mid-game.
 *  I-Aggressive   Camps public objective sites: stakes the pending drop site
 *                 while drops < 2 (public events), then the gate. Never
 *                 probes. The degenerate-camp probe (S7).
 *  I-Random       Uniform over LEGAL action kinds each decision, target
 *                 uniform over all map nodes — the floor.
 * ============================================================================
 */
import type {
  CaseConfig,
  EdgeClass,
  FugitiveSubmission,
  InvestigatorSubmission,
  InvestigatorView,
  FugitiveView,
  NodeId,
} from '@dead-drop/engine';
import {
  edgeCost,
  fugitiveLegality,
  investigatorLegality,
  mulberry32,
  type EffectiveParams,
  type ValidatedMap,
} from '@dead-drop/engine';
import { BeliefTracker } from './belief.js';

/* --------------------------------------------------------------- context */

export interface PolicyContext {
  vm: ValidatedMap;
  config: CaseConfig;
  params: EffectiveParams;
  /** Per-(case seed, policy name) deterministic stream (random policies). */
  rng: () => number;
}

/* ------------------------------------------------------- shared helpers */

function collectAt(d: 0 | 1 | 2, at: NodeId, d1: NodeId, d2: NodeId): 0 | 1 | 2 {
  if (d < 2 && at === (d === 0 ? d1 : d2)) return (d + 1) as 0 | 1 | 2;
  return d;
}

/** Sim-side min-completion-days BFS from an ARBITRARY mid-case state, moves
 *  only (Holds never help completion). Mirrors src/feasibility.ts semantics;
 *  policy input only — never a rules function. A state already AT the gate
 *  with both drops is complete: returns 0 (callers probe candidate states —
 *  the completing move itself must classify as feasible). */
export function minDaysFrom(
  vm: ValidatedMap,
  node: NodeId,
  sp: number,
  drops: 0 | 1 | 2,
  d1: NodeId,
  d2: NodeId,
  gate: NodeId,
  capDays: number,
): number | null {
  if (drops === 2 && node === gate) return 0;
  const seen = new Set<string>([`${node}|${sp}|${drops}`]);
  let frontier: Array<{ n: NodeId; sp: number; d: 0 | 1 | 2 }> = [{ n: node, sp, d: drops }];
  for (let day = 1; day <= capDays; day++) {
    const next: typeof frontier = [];
    for (const st of frontier) {
      const best = new Map<NodeId, number>();
      for (const e of vm.adjacency.get(st.n)!) {
        const c = edgeCost(e.cls);
        const prev = best.get(e.node);
        if (prev === undefined || c < prev) best.set(e.node, c);
      }
      for (const [m, c] of best) {
        if (st.sp < c) continue;
        const nd = collectAt(st.d, m, d1, d2);
        if (nd === 2 && m === gate) return day;
        const k = `${m}|${st.sp - c}|${nd}`;
        if (!seen.has(k)) {
          seen.add(k);
          next.push({ n: m, sp: st.sp - c, d: nd });
        }
      }
    }
    frontier = next;
    if (frontier.length === 0) return null;
  }
  return null;
}

/** Minimal-SP edge per target from a node (T15 first-wins tie-break, engine
 *  cheapestEdgeTo replica). */
function bestEdges(vm: ValidatedMap, from: NodeId): Map<NodeId, { cls: EdgeClass; cost: number }> {
  const best = new Map<NodeId, { cls: EdgeClass; cost: number }>();
  for (const e of vm.adjacency.get(from)!) {
    const cost = edgeCost(e.cls);
    const prev = best.get(e.node);
    if (prev === undefined || cost < prev.cost) best.set(e.node, { cls: e.cls, cost });
  }
  return best;
}

function lexLess(a: readonly NodeId[], b: readonly NodeId[]): boolean {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return a[i]! < b[i]!;
  }
  return a.length < b.length;
}

/* ------------------------------------------------------ fugitive policies */

export type FugitivePolicyName =
  | 'F-Beeline' | 'F-Random' | 'F-LeakAware' | 'F-Deceptive' | 'F-SlackBurner';

export const FUGITIVE_POLICIES: readonly FugitivePolicyName[] = [
  'F-Beeline', 'F-Random', 'F-LeakAware', 'F-Deceptive', 'F-SlackBurner',
];

export interface FugitivePolicy {
  readonly name: FugitivePolicyName;
  decide(view: FugitiveView): FugitiveSubmission;
}

interface RouteOpt { cost: number; days: number; path: NodeId[] }

/** F-Beeline machinery: min-(SP cost, days, lexicographic path) completion.
 *  A state already at the gate with both drops is complete (cost 0, 0 days)
 *  — needed because callers probe CANDIDATE post-arrival states, and the
 *  completing move itself must classify as feasible (pilot 2026-10-25: its
 *  absence made LeakAware/SlackBurner blind to the final approach). */
function bestRoute(
  vm: ValidatedMap,
  node: NodeId,
  sp: number,
  drops: 0 | 1 | 2,
  d1: NodeId,
  d2: NodeId,
  gate: NodeId,
  daysLeft: number,
  memo: Map<string, RouteOpt | null>,
): RouteOpt | null {
  if (drops === 2 && node === gate) return { cost: 0, days: 0, path: [] };
  if (daysLeft <= 0) return null;
  const key = `${node}|${sp}|${drops}|${daysLeft}`;
  if (memo.has(key)) return memo.get(key)!;
  memo.set(key, null); // cycle guard (paths are simple in practice; depth-bounded anyway)
  let best: RouteOpt | null = null;
  for (const [target, b] of bestEdges(vm, node)) {
    if (b.cost > sp) continue;
    const nd = collectAt(drops, target, d1, d2);
    if (nd === 2 && target === gate) {
      const cand: RouteOpt = { cost: b.cost, days: 1, path: [target] };
      if (best === null || cand.cost < best.cost ||
        (cand.cost === best.cost && (cand.days < best.days ||
          (cand.days === best.days && lexLess(cand.path, best.path))))) {
        best = cand;
      }
      continue;
    }
    const sub = daysLeft > 1
      ? bestRoute(vm, target, sp - b.cost, nd, d1, d2, gate, daysLeft - 1, memo)
      : null;
    if (sub === null) continue;
    const cand: RouteOpt = { cost: b.cost + sub.cost, days: sub.days + 1, path: [target, ...sub.path] };
    if (best === null || cand.cost < best.cost ||
      (cand.cost === best.cost && (cand.days < best.days ||
        (cand.days === best.days && lexLess(cand.path, best.path))))) {
      best = cand;
    }
  }
  memo.set(key, best);
  return best;
}

export function makeFugitive(name: FugitivePolicyName, ctx: PolicyContext): FugitivePolicy {
  const { vm, config, params, rng } = ctx;
  const { d1, d2 } = { d1: config.drops[0]!, d2: config.drops[1]! };
  const districtDays = new Set(config.reveal_schedule.district_days);
  const transitDays = new Set(config.reveal_schedule.transit_days);

  switch (name) {
    case 'F-Beeline':
      return {
        name,
        decide(view) {
          const f = view.fugitive;
          const daysLeft = params.P1_days_per_case - view.day + 1;
          const route = bestRoute(vm, f.position, f.stamina, f.drops_collected, d1, d2, config.gate, daysLeft, new Map());
          const target = route !== null
            ? route.path[0]!
            : [...bestEdges(vm, f.position).entries()]
              .filter(([, b]) => b.cost <= f.stamina)
              .sort((x, y) => x[1].cost - y[1].cost || x[0].localeCompare(y[0]))[0]?.[0];
          if (target === undefined) {
            // Nothing affordable at all — the harness resolves §9.13 before
            // consulting us; reaching here is a harness bug.
            throw new Error(`[F-Beeline] consulted with no legal move (day ${view.day})`);
          }
          return { kind: 'MOVE', to: target };
        },
      };

    case 'F-Random':
      return {
        name,
        decide(view) {
          const leg = fugitiveLegality(vm, view, params);
          const options: FugitiveSubmission[] = leg.moves.map((to) => ({ kind: 'MOVE' as const, to }));
          if (leg.hold) options.push({ kind: 'HOLD' });
          if (options.length === 0) throw new Error('[F-Random] no legal options — harness bug');
          return options[Math.floor(rng() * options.length)]!;
        },
      };

    case 'F-LeakAware':
    case 'F-Deceptive': {
      const deceptive = name === 'F-Deceptive';
      let prevClass: EdgeClass | null = null;
      let proactiveHolds = 0;
      const revealed = new Set<string>();

      /** Feasibility-preserving move choice with leak tiers + route-cost
       *  minimization (see header). Returns a target or null (no moves). */
      const pick = (view: FugitiveView): NodeId | null => {
        const f = view.fugitive;
        const edges = [...bestEdges(vm, f.position).entries()].filter(([, b]) => b.cost <= f.stamina);
        if (edges.length === 0) return null;
        const daysLeftAfterToday = params.P1_days_per_case - view.day;
        const routeMemo = new Map<string, RouteOpt | null>();
        // Feasibility-preserving moves: a completing route must exist AFTER
        // this move (arrival collection applied inside bestRoute).
        const feasible = edges.filter(([m, b]) =>
          bestRoute(vm, m, f.stamina - b.cost, collectAt(f.drops_collected, m, d1, d2), d1, d2, config.gate, daysLeftAfterToday, routeMemo) !== null);
        const pool = feasible.length > 0 ? feasible : edges;

        // Route-optimal choice set, Beeline-ordered: (total route SP, total
        // route days) ascending — leak preferences must never buy delay OR
        // lose the clock (pilot 2026-10-25: cost-only ordering picked
        // slow-cheap routes and lost ~48% of completions vs even I-Random;
        // fixed before any recorded run). Leak behavior then expresses as
        // tie-breaks within the same (cost, days) class.
        const routeKey = (m: NodeId, b: { cost: number }): [number, number] => {
          const sub = bestRoute(vm, m, f.stamina - b.cost, collectAt(f.drops_collected, m, d1, d2), d1, d2, config.gate, daysLeftAfterToday, routeMemo);
          return sub === null ? [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY] : [b.cost + sub.cost, 1 + sub.days];
        };
        const keys = new Map<string, [number, number]>();
        for (const [m, b] of pool) keys.set(m, routeKey(m, b));
        let bestC = Number.POSITIVE_INFINITY;
        let bestD = Number.POSITIVE_INFINITY;
        for (const [c, d] of keys.values()) {
          if (c < bestC || (c === bestC && d < bestD)) {
            bestC = c;
            bestD = d;
          }
        }
        const optimal = pool.filter(([m]) => {
          const k = keys.get(m)!;
          return k[0] === bestC && k[1] === bestD;
        });

        // Leak tiers as STABLE tie-breaks within the optimal set:
        //   1. same district on a district-reveal day,
        //   2. edge class ≠ yesterday's on a transit-reveal day,
        //   3. (F-Deceptive only) target in an already-revealed district,
        //   4. lexicographic.
        const curDistrict = vm.districtOf.get(f.position)!;
        const tierKey = (m: NodeId): number => {
          let k = 0;
          if (districtDays.has(view.day) && vm.districtOf.get(m) !== curDistrict) k += 2;
          const cls = bestEdges(vm, f.position).get(m)!.cls;
          if (transitDays.has(view.day) && prevClass !== null && cls === prevClass) k += 1;
          return k;
        };
        optimal.sort((x, y) => {
          const tx = tierKey(x[0]);
          const ty = tierKey(y[0]);
          if (tx !== ty) return tx - ty;
          if (deceptive) {
            const rx = revealed.has(vm.districtOf.get(x[0])!) ? 0 : 1;
            const ry = revealed.has(vm.districtOf.get(y[0])!) ? 0 : 1;
            if (rx !== ry) return rx - ry; // doubling into cleared areas on ties
          }
          return x[0].localeCompare(y[0]);
        });
        return optimal[0]![0];
      };

      return {
        name,
        decide(view) {
          for (const ev of view.log) {
            if (ev.kind === 'DISTRICT_REVEAL') revealed.add(ev.district);
          }
          const f = view.fugitive;
          // Deceptive proactive Hold: breaks tracker parity, when feasible.
          if (deceptive &&
            proactiveHolds < 2 &&
            revealed.has(vm.districtOf.get(f.position)!) &&
            fugitiveLegality(vm, view, params).hold &&
            f.drops_collected < 2 &&
            (minDaysFrom(vm, f.position, f.stamina - params.P6_hold_cost,
              collectAt(f.drops_collected, f.position, d1, d2), d1, d2, config.gate,
              params.P1_days_per_case - view.day) ?? Infinity) <= params.P1_days_per_case - view.day) {
            proactiveHolds += 1;
            return { kind: 'HOLD' };
          }
          const target = pick(view);
          if (target !== null) {
            prevClass = bestEdges(vm, f.position).get(target)!.cls;
            return { kind: 'MOVE', to: target };
          }
          const leg = fugitiveLegality(vm, view, params);
          if (leg.hold) return { kind: 'HOLD' };
          throw new Error(`[${name}] no legal action — harness bug (day ${view.day})`);
        },
      };
    }

    case 'F-SlackBurner':
      return {
        name,
        decide(view) {
          const f = view.fugitive;
          const edges = [...bestEdges(vm, f.position).entries()].filter(([, b]) => b.cost <= f.stamina);
          if (edges.length === 0) {
            const leg = fugitiveLegality(vm, view, params);
            if (leg.hold) return { kind: 'HOLD' };
            throw new Error('[F-SlackBurner] no legal action — harness bug');
          }
          const movesLeftAfterToday = params.P1_days_per_case - view.day;
          const feasible = edges.filter(([m, b]) =>
            (minDaysFrom(vm, m, f.stamina - b.cost,
              collectAt(f.drops_collected, m, d1, d2), d1, d2, config.gate,
              movesLeftAfterToday) ?? Infinity) <= movesLeftAfterToday);
          const pool = feasible.length > 0 ? feasible : edges;
          if (feasible.length > 0) {
            // Burn: max immediate SP cost among feasibility-preserving moves.
            pool.sort((x, y) => y[1].cost - x[1].cost || x[0].localeCompare(y[0]));
          } else {
            pool.sort((x, y) => x[1].cost - y[1].cost || x[0].localeCompare(y[0]));
          }
          return { kind: 'MOVE', to: pool[0]![0] };
        },
      };
  }
}

/* -------------------------------------------------- investigator policies */

export type InvestigatorPolicyName =
  | 'I-GreedyProbe' | 'I-Calendar' | 'I-Aggressive' | 'I-Random';

export const INVESTIGATOR_POLICIES: readonly InvestigatorPolicyName[] = [
  'I-GreedyProbe', 'I-Calendar', 'I-Aggressive', 'I-Random',
];

/** Policy-instrumented stats read by the harness after each case (§4.3). */
export interface InvestigatorStats {
  /** Belief mass at probed nodes, summed (belief policies only; else null). */
  probeMassSum: number | null;
  probeCount: number;
  /** PREDICTIVE belief mass at staked nodes at placement, summed. */
  stakeoutMassSum: number | null;
  stakeoutCount: number;
  /** Q4: day-decisions where a probe was wanted but the DAILY CAP blocked it
   *  (intel starvation is counted separately and not here). */
  capBlocks: number;
}

export interface InvestigatorPolicy {
  readonly name: InvestigatorPolicyName;
  decide(view: InvestigatorView): InvestigatorSubmission;
  readonly stats: InvestigatorStats;
}

function dropsFromLog(view: InvestigatorView): 0 | 1 | 2 {
  let d: 0 | 1 | 2 = 0;
  for (const ev of view.log) {
    if (ev.kind === 'DROP_COMPLETED' && ev.slot > d) d = ev.slot;
  }
  return d;
}

export function makeInvestigator(name: InvestigatorPolicyName, ctx: PolicyContext): InvestigatorPolicy {
  const { vm, config, params, rng } = ctx;
  const stats: InvestigatorStats = {
    probeMassSum: null, probeCount: 0,
    stakeoutMassSum: null, stakeoutCount: 0, capBlocks: 0,
  };
  const allNodes: NodeId[] = vm.map.nodes.map((n) => n.id);

  const belief = (): BeliefTracker =>
    new BeliefTracker(vm, config.safehouse, config.stamina_budget, config.drops[0]!, config.drops[1]!, params);

  switch (name) {
    case 'I-GreedyProbe':
    case 'I-Calendar': {
      const calendar = name === 'I-Calendar';
      const tracker = belief();
      let lastCapBlockDay = -1;
      return {
        name,
        stats,
        decide(view) {
          tracker.sync(view);
          tracker.markDay(view.day);
          const leg = investigatorLegality(view, params);
          const modal = tracker.maxNode();
          if (!leg.probe &&
            view.investigator.probes_today >= params.P7_probe_daily_cap &&
            view.investigator.intel >= params.P7_probe_cost &&
            view.day !== lastCapBlockDay) {
            // Wanted to probe; the daily cap is what blocked it (Q4).
            lastCapBlockDay = view.day;
            stats.capBlocks += 1;
          }
          // Stakeout: GATE on the current posterior (where they are), AIM at
          // the predictive argmax (where they'll be at §2-step-2 resolution).
          const pred = tracker.predictiveMaxNode();
          if (calendar && view.day >= params.P1_days_per_case - 2 && leg.stakeout) {
            stats.stakeoutCount += 1;
            stats.stakeoutMassSum = (stats.stakeoutMassSum ?? 0) + pred.mass;
            return { kind: 'STAKEOUT', target: pred.node };
          }
          if (leg.stakeout && modal.mass >= 0.4) {
            stats.stakeoutCount += 1;
            stats.stakeoutMassSum = (stats.stakeoutMassSum ?? 0) + pred.mass;
            return { kind: 'STAKEOUT', target: pred.node };
          }
          const budgetOk = !calendar || view.day < 5 ||
            view.investigator.intel - params.P7_probe_cost >= params.P8_stakeout_cost;
          if (leg.probe && budgetOk) {
            stats.probeCount += 1;
            stats.probeMassSum = (stats.probeMassSum ?? 0) + tracker.massAt(modal.node);
            return { kind: 'PROBE', target: modal.node };
          }
          return { kind: 'WAIT' };
        },
      };
    }

    case 'I-Aggressive':
      return {
        name,
        stats,
        decide(view) {
          const drops = dropsFromLog(view);
          const target = drops === 0 ? config.drops[0]! : drops === 1 ? config.drops[1]! : config.gate;
          if (investigatorLegality(view, params).stakeout) {
            stats.stakeoutCount += 1;
            return { kind: 'STAKEOUT', target };
          }
          return { kind: 'WAIT' };
        },
      };

    case 'I-Random':
      return {
        name,
        stats,
        decide(view) {
          const leg = investigatorLegality(view, params);
          const kinds: Array<'PROBE' | 'STAKEOUT' | 'WAIT'> = [];
          if (leg.probe) kinds.push('PROBE');
          if (leg.stakeout) kinds.push('STAKEOUT');
          kinds.push('WAIT');
          const kind = kinds[Math.floor(rng() * kinds.length)]!;
          if (kind === 'PROBE') {
            stats.probeCount += 1;
            return { kind: 'PROBE', target: allNodes[Math.floor(rng() * allNodes.length)]! };
          }
          if (kind === 'STAKEOUT') {
            stats.stakeoutCount += 1;
            return { kind: 'STAKEOUT', target: allNodes[Math.floor(rng() * allNodes.length)]! };
          }
          return { kind: 'WAIT' };
        },
      };
  }
}

/** Harness-visible PRNG factory (random policies share the mulberry32 family
 *  with the generator — one PRNG discipline across the sim). */
export function policyRng(caseSeed: number, role: 'F' | 'I', policyName: string): () => number {
  let h = 0x811c9dc5;
  const s = `${role}|${policyName}|${caseSeed}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return mulberry32(h >>> 0);
}
