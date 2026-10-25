/**
 * Dead Drop — Fugitive AI, Stage 1 baseline `F-Planner` (M3 W1).
 *
 * Spec: 05-ai-spec §2 — "deterministic, explainable route policy: compute
 * all feasible completion routes (BFS), pick the one maximizing minimum
 * distance from the Investigator's belief mode (approximated by recent
 * public reveal constraints), tie-break by lowest stamina cost. No
 * randomness."
 *
 * W1 implementation shape (registered approximation, documented in ADR-005):
 *   - per-day greedy over ONE-MOVE horizons, each candidate filtered by an
 *     exact mid-case completion feasibility search (drops in order → gate,
 *     budgeted by remaining days × SP) — the "all feasible routes" part,
 *     memoized;
 *   - the belief model is `belief.ts`'s rules-mechanical candidate set
 *     expanded to the current day — the same public-channel bookkeeping the
 *     player's belief halo uses;
 *   - total order tie-break: feasible > score > lower SP > node id, HOLD last.
 *
 * ANTI-CHEAT PARITY (05-ai-spec §2/§3, normative): this function receives the
 * FUGITIVE VIEW only. It reads the public log and the Fugitive's own state —
 * never `private_log_investigator`, never the Investigator's remaining intel.
 * The type signature is the information wall.
 */
import {
  cheapestEdgeTo,
  isStranded,
  type CaseConfig,
  type EffectiveParams,
  type FugitiveSubmission,
  type FugitiveView,
  type NodeId,
  type ValidatedMap,
} from '@dead-drop/engine';
import { currentDayCandidates, graphDistances } from './belief';

export interface PlannerDeps {
  vm: ValidatedMap;
  config: CaseConfig;
  params: EffectiveParams;
}

/** Exact feasibility: from `pos`, with `drops` collected and `sp` stamina and
 *  `days` remaining moves, can the Fugitive still complete both drops (in
 *  order) and reach the gate? Arrival collects (engine §2 step 4 is purely
 *  position-based), so collecting mid-path is part of the search. Holds are
 *  excluded — a min-cost route never needs one, which keeps the search a
 *  conservative and deterministic lower bound. */
export function canComplete(
  deps: PlannerDeps,
  pos: NodeId,
  drops: 0 | 1 | 2,
  sp: number,
  days: number,
): boolean {
  const { vm, config } = deps;
  const memo = new Map<string, boolean>();

  const pending = (d: 0 | 1 | 2): NodeId => (d === 0 ? config.drops[0] : config.drops[1])!;

  const walk = (at: NodeId, done: 0 | 1 | 2, left: number, moves: number): boolean => {
    if (done === 2 && at === config.gate) return true;
    if (moves === 0) return false;
    const key = `${at}|${done}|${left}|${moves}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    memo.set(key, false); // guard against cycles (moves strictly decrease, but cheap insurance)
    let result = false;
    for (const { node } of vm.adjacency.get(at) ?? []) {
      const edge = cheapestEdgeTo(vm, at, node);
      if (edge === null || edge.cost > left) continue;
      const done2 = (done < 2 && node === pending(done) ? done + 1 : done) as 0 | 1 | 2;
      if (done2 === 2 && node === config.gate) {
        result = true;
        break;
      }
      if (walk(node, done2, left - edge.cost, moves - 1)) {
        result = true;
        break;
      }
    }
    memo.set(key, result);
    return result;
  };

  return walk(pos, drops, sp, days);
}

export interface PlannedMove {
  action: FugitiveSubmission;
  /** min graph-distance from the belief set at the resulting position (explanability). */
  score: number;
  spCost: number;
  feasible: boolean;
}

/** All legal actions today with their deterministic scores. Exported for the
 *  replay/explain panel and tests. Empty ⇒ the day is stranded (§9.13) — the
 *  caller must use `session.resolveStranded()`. */
export function planFugitiveDay(deps: PlannerDeps, fv: FugitiveView): PlannedMove[] {
  const { vm, config, params } = deps;
  const me = fv.fugitive;
  // FugitiveView satisfies Pick<CaseState,'fugitive'> — the §9.13 predicate
  // reads only the fugitive block (engine docstring guarantees this).
  if (isStranded(vm, fv, params)) return [];

  // Belief set for the day being planned (public channels only).
  const belief = currentDayCandidates(vm, config, fv.log);
  const dist = graphDistances(vm, belief);
  const scoreOf = (n: NodeId): number => dist.get(n) ?? 999;

  const daysAfterToday = Math.max(0, params.P1_days_per_case - fv.day);
  const pending = (me.drops_collected === 0 ? config.drops[0] : config.drops[1])!;

  const candidates: PlannedMove[] = [];

  // Moves — neighbors in deterministic id order.
  const neighbors = (vm.adjacency.get(me.position) ?? [])
    .map((e) => e.node)
    .sort((a, b) => a.localeCompare(b));
  for (const v of neighbors) {
    const edge = cheapestEdgeTo(vm, me.position, v);
    if (edge === null || edge.cost > me.stamina) continue;
    const done2 = (me.drops_collected < 2 && v === pending
      ? me.drops_collected + 1
      : me.drops_collected) as 0 | 1 | 2;
    const feasible = canComplete(deps, v, done2, me.stamina - edge.cost, daysAfterToday);
    candidates.push({ action: { kind: 'MOVE', to: v }, score: scoreOf(v), spCost: edge.cost, feasible });
  }

  // Hold — considered last (deterministic tie-break puts moves first).
  if (me.holds_used < params.P6_hold_max && me.stamina >= params.P6_hold_cost) {
    const done2 = (me.drops_collected < 2 && me.position === pending
      ? me.drops_collected + 1
      : me.drops_collected) as 0 | 1 | 2;
    const feasible = canComplete(
      deps,
      me.position,
      done2,
      me.stamina - params.P6_hold_cost,
      daysAfterToday,
    );
    candidates.push({
      action: { kind: 'HOLD' },
      score: scoreOf(me.position),
      spCost: params.P6_hold_cost,
      feasible,
    });
  }

  candidates.sort((a, b) => {
    if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
    if (a.score !== b.score) return b.score - a.score; // maximize min-distance from belief
    if (a.spCost !== b.spCost) return a.spCost - b.spCost; // tie-break: cheapest
    const an = a.action.kind === 'MOVE' ? a.action.to : `~${me.position}`; // HOLD sorts last
    const bn = b.action.kind === 'MOVE' ? b.action.to : `~${me.position}`;
    if (a.action.kind !== b.action.kind) return a.action.kind === 'MOVE' ? -1 : 1;
    return an.localeCompare(bn);
  });
  return candidates;
}

/** The one action F-Planner commits today (first of the deterministic order). */
export function fPlannerMove(deps: PlannerDeps, fv: FugitiveView): FugitiveSubmission | null {
  const moves = planFugitiveDay(deps, fv);
  return moves.length > 0 ? moves[0]!.action : null;
}
