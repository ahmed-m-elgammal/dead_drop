/**
 * Dead Drop — Fugitive archetypes (M3 W2).
 *
 * Spec: 05-ai-spec §3 — parameterized blends over four knobs, fixed for MVP,
 * exposed in the solo ladder. Anti-cheat parity (normative): archetypes never
 * read the Investigator's private actions; `caution` reacts only to PUBLIC
 * events. The function signature takes the FUGITIVE VIEW only — the
 * information wall is the type (same wall as the Stage-1 planner).
 *
 * Selection algorithm (registered W2 shape, ADR-006):
 *   1. candidates = planFugitiveDay() — the exact-feasibility-filtered move
 *      list from W1. Selection domain = feasible candidates if any exist,
 *      else all (a doomed fugitive still plays on).
 *   2. route_entropy — with probability `route_entropy` (seeded draw), pick
 *      UNIFORMLY among the domain (Random = entropy 1 → always).
 *   3. slack_use — with probability `slack_use` (seeded draw), prefer
 *      ambiguity-preserving detours: the most expensive feasible moves
 *      (transit class widens tomorrow's belief set most), falling back to
 *      HOLD (parity-breaking) when no detour exists.
 *   4. otherwise argmax of the blended score:
 *        base    = min graph-distance from the belief candidate set (W1)
 *        + deception × (off-belief bonus + revealed-district re-cross bonus)
 *        − caution   × (hot-zone penalty from the last 2 days of public events)
 *
 * Determinism / reproducibility (05-ai-spec §7): every stochastic draw comes
 * from a per-day mulberry32 stream keyed by (case seed, archetype, day) —
 * never Math.random, never wall-clock. Journal replay reproduces the exact
 * route for any archetype.
 */
import {
  mulberry32,
  rngInt,
  type CaseConfig,
  type CaseSession,
  type FugitiveSubmission,
  type FugitiveView,
  type NodeId,
  type ValidatedMap,
} from '@dead-drop/engine';
import { candidateSet, graphDistances } from './belief';
import { fPlannerMove, planFugitiveDay, type PlannedMove, type PlannerDeps } from './f-planner';
import { tutorialFugitiveAction } from './tutorial';

export type ArchetypeId = 'baseline' | 'random' | 'cautious' | 'deceptive';

/** 05-ai-spec §3 knob table. `null` knobs = the pure Stage-1 planner. */
export interface ArchetypeKnobs {
  route_entropy: number;
  deception: number;
  caution: number;
  slack_use: number;
}

export interface ArchetypeMeta {
  id: ArchetypeId;
  label: string;
  tier: string;
  tagline: string;
  knobs: ArchetypeKnobs | null;
}

/** Fixed MVP blends, verbatim from 05-ai-spec §3. */
export const ARCHETYPES: Readonly<Record<ArchetypeId, ArchetypeMeta>> = {
  baseline: {
    id: 'baseline',
    label: 'Baseline',
    tier: 'Sparring',
    tagline: 'The Stage-1 planner — deterministic, readable. Plays the same information wall you do.',
    knobs: null,
  },
  random: {
    id: 'random',
    label: 'Random',
    tier: 'Teaching',
    tagline: 'Teaching wheels — wanders feasibly and reveals the map\u2019s texture.',
    knobs: { route_entropy: 1, deception: 0, caution: 0, slack_use: 0 },
  },
  cautious: {
    id: 'cautious',
    label: 'Cautious',
    tier: 'Sharp',
    tagline: 'Disciplined — avoids fresh evidence, hard to pin, rarely brilliant.',
    knobs: { route_entropy: 0.3, deception: 0.1, caution: 0.8, slack_use: 0.5 },
  },
  deceptive: {
    id: 'deceptive',
    label: 'Deceptive',
    tier: 'Boss',
    tagline: 'The boss — doubles back, holds to break parity, baits stakeouts.',
    knobs: { route_entropy: 0.5, deception: 0.8, caution: 0.3, slack_use: 0.9 },
  },
};

/** Per-archetype RNG salts — arbitrary but FIXED constants (replay stability). */
const ARCH_SALT: Readonly<Record<ArchetypeId, number>> = {
  baseline: 0x00000,
  random: 0x5eed0001,
  cautious: 0x5eed0002,
  deceptive: 0x5eed0003,
};

/** One stream per (seed, archetype, day): draw counts inside a day are
 *  deterministic given the session state, so replay is exact. */
function dayRng(seed: number, arch: ArchetypeId, day: number): () => number {
  return mulberry32((seed ^ Math.imul(day + 1, 0x9e3779b1) ^ ARCH_SALT[arch]) >>> 0);
}

/** Nodes "too close to fresh public events" for the caution knob: drop sites
 *  (+ their approaches) and every node of freshly revealed districts, from
 *  the last two RESOLVED days of the public log. Public channels only. */
function hotZones(vm: ValidatedMap, log: FugitiveView['log'], day: number): Set<NodeId> {
  const hot = new Set<NodeId>();
  for (const ev of log) {
    if (ev.day < day - 2 || ev.day > day - 1) continue;
    if (ev.kind === 'DROP_COMPLETED') {
      hot.add(ev.site);
      for (const { node } of vm.adjacency.get(ev.site) ?? []) hot.add(node);
    } else if (ev.kind === 'DISTRICT_REVEAL') {
      for (const [n, d] of vm.districtOf) if (d === ev.district) hot.add(n);
    }
  }
  return hot;
}

/** Districts that ever had a DISTRICT_REVEAL — the deception knob's
 *  "re-cross published ground" bonus (05-ai-spec §3 `deception`). */
function revealedDistricts(log: FugitiveView['log']): Set<string> {
  const out = new Set<string>();
  for (const ev of log) if (ev.kind === 'DISTRICT_REVEAL') out.add(ev.district);
  return out;
}

function nodeOf(action: FugitiveSubmission, at: NodeId): NodeId {
  return action.kind === 'MOVE' ? action.to : at;
}

/** W1 total order, applied to a blended score: score' desc > cheaper SP >
 *  MOVE before HOLD > node id. Deterministic, explainable. */
function argmaxBlended(
  domain: PlannedMove[],
  blend: (m: PlannedMove) => number,
  at: NodeId,
): PlannedMove {
  let best = domain[0]!;
  let bestKey = '';
  for (const c of domain) {
    const key = [
      -blend(c),
      c.spCost,
      c.action.kind === 'MOVE' ? 0 : 1,
      nodeOf(c.action, at),
    ].join('|');
    if (bestKey === '' || key < bestKey) {
      best = c;
      bestKey = key;
    }
  }
  return best;
}

/** The one action the archetype commits today. `null` ⇒ stranded (§9.13) —
 *  the caller must use `session.resolveStranded()`. */
export function archetypeMove(
  deps: PlannerDeps,
  fv: FugitiveView,
  arch: ArchetypeId,
): FugitiveSubmission | null {
  if (arch === 'baseline') return fPlannerMove(deps, fv);

  const candidates = planFugitiveDay(deps, fv);
  if (candidates.length === 0) return null;

  const knobs = ARCHETYPES[arch].knobs!;
  const domain = candidates.some((c) => c.feasible)
    ? candidates.filter((c) => c.feasible)
    : candidates;

  const rng = dayRng(deps.config.seed, arch, fv.day);

  // 1) route_entropy — uniform over the domain (Random: always).
  if (rng() < knobs.route_entropy) {
    return domain[rngInt(rng, domain.length)]!.action;
  }

  // 2) slack_use — ambiguity-preserving appetite: widest-reach detours,
  //    falling back to HOLD (parity-breaking) when no detour exists.
  if (rng() < knobs.slack_use) {
    const detours = domain.filter((c) => c.spCost >= 2);
    if (detours.length > 0) {
      return argmaxBlended(detours, (c) => c.score, fv.fugitive.position).action;
    }
    const hold = domain.find((c) => c.action.kind === 'HOLD');
    if (hold) return hold.action;
  }

  // 3) blended score — base belief-distance, deception bonuses, caution penalties.
  const beliefPrev = candidateSet(deps.vm, deps.config, fv.log); // last resolved day
  const revealed = revealedDistricts(fv.log);
  const hot = hotZones(deps.vm, fv.log, fv.day);
  const at = fv.fugitive.position;

  const blend = (c: PlannedMove): number => {
    const n = nodeOf(c.action, at);
    let s = c.score;
    if (!beliefPrev.has(n)) s += 1.2 * knobs.deception; // "cleared" ground misleads
    if (revealed.has(deps.vm.districtOf.get(n) ?? '')) s += 0.6 * knobs.deception;
    if (hot.has(n)) s -= 1.5 * knobs.caution;
    return s;
  };
  return argmaxBlended(domain, blend, at).action;
}

/** Run the AI Fugitive's day (steps 1–5) through the engine's public API.
 *  Shared by the live store, the journal replay, and the history rebuild —
 *  one AI path everywhere, so a replay IS the original case bit-for-bit. */
export function runAiDays(
  session: CaseSession,
  config: CaseConfig,
  arch: ArchetypeId,
  onStranded?: () => void,
): void {
  const deps: PlannerDeps = { vm: session.vm, config, params: session.p };
  while (session.state.phase === 'FUGITIVE_MOVE' && session.state.verdict === null) {
    const action = archetypeMove(deps, session.fugitiveView(), arch);
    if (action === null) {
      session.resolveStranded(); // §9.13 — engine-produced, never submitted
      onStranded?.();
      continue;
    }
    session.submitFugitive({ idempotency_key: `ai-f-${session.state.day}`, action });
  }
}

/** The scripted tutorial Fugitive (lib/dd/tutorial.ts) — day 1 HOLDs at the
 *  safehouse, then walks onto the pending drop. Engine-submitted like any
 *  move; the tutorial case's journal replays through THIS controller, so
 *  history replays of tutorial cases diverge from nothing. */
export function runTutorialDays(session: CaseSession, config: CaseConfig): void {
  while (session.state.phase === 'FUGITIVE_MOVE' && session.state.verdict === null) {
    const me = session.fugitiveView().fugitive;
    const action = tutorialFugitiveAction(
      session.state.day,
      me.position,
      config.drops[0]!,
    ) as FugitiveSubmission;
    session.submitFugitive({ idempotency_key: `tut-f-${session.state.day}`, action });
  }
}

/** The ONE day-runner every caller shares. `scripted` (tutorial cases) swaps
 *  the archetype planner for the fixed script — replay-safe by construction. */
export function runDays(
  session: CaseSession,
  config: CaseConfig,
  arch: ArchetypeId,
  opts: { scripted?: boolean } = {},
  onStranded?: () => void,
): void {
  if (opts.scripted) runTutorialDays(session, config);
  else runAiDays(session, config, arch, onStranded);
}

/** Distances from the current-day belief set — exposed for tests/explainers. */
export function beliefDistances(deps: PlannerDeps, fv: FugitiveView): Map<NodeId, number> {
  return graphDistances(deps.vm, candidateSet(deps.vm, deps.config, fv.log));
}
