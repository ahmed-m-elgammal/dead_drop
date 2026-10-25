/**
 * Dead Drop — rules-mechanical belief bookkeeping (M3 W1).
 *
 * The Investigator-side candidate-set tracker from the paper kit v2
 * (m1/kit/print/2-investigator-sheet.html), expressed as code. This is the
 * UI/AI layer's own knowledge — deliberately NOT engine state (engine type
 * decision T10: belief/heatmap stays out of CaseState).
 *
 * Everything here consumes ONLY public channels (03-rules §4): the case
 * config (public), the public event log, and the map. It is the same bookkeeping
 * the 05-ai-spec anti-cheat wall requires the AI to live behind — the AI and
 * the player's optional "belief halo" share one implementation, so neither
 * reads anything a human could not write down from the table.
 */
import type { DistrictId, EdgeClass, NodeId, PublicEvent, ValidatedMap, CaseConfig } from '@dead-drop/engine';

/** Multi-source BFS distances from a set of origin nodes (edge count, not SP). */
export function graphDistances(
  vm: ValidatedMap,
  origins: Iterable<NodeId>,
): Map<NodeId, number> {
  const dist = new Map<NodeId, number>();
  const queue: NodeId[] = [];
  for (const o of origins) {
    if (vm.adjacency.has(o) && !dist.has(o)) {
      dist.set(o, 0);
      queue.push(o);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i]!;
    const d = dist.get(cur)!;
    for (const { node } of vm.adjacency.get(cur) ?? []) {
      if (!dist.has(node)) {
        dist.set(node, d + 1);
        queue.push(node);
      }
    }
  }
  return dist;
}

function expand(vm: ValidatedMap, set: Set<NodeId>): Set<NodeId> {
  const out = new Set<NodeId>(set);
  for (const u of set) {
    for (const { node } of vm.adjacency.get(u) ?? []) out.add(node);
  }
  return out;
}

function filterByClass(vm: ValidatedMap, from: Set<NodeId>, to: Set<NodeId>, cls: EdgeClass): Set<NodeId> {
  const out = new Set<NodeId>();
  for (const u of from) {
    for (const { node, cls: c } of vm.adjacency.get(u) ?? []) {
      if (c === cls && to.has(node)) out.add(node);
    }
  }
  return out;
}

function nodesWithEdge(vm: ValidatedMap, from: Set<NodeId>, to: Set<NodeId>): Set<NodeId> {
  const out = new Set<NodeId>();
  for (const u of from) {
    for (const { node } of vm.adjacency.get(u) ?? []) {
      if (to.has(node)) out.add(node);
    }
  }
  return out;
}

/**
 * The candidate set after the last fully-resolved day in `log`:
 * where the Fugitive could plausibly BE, given public information only.
 *
 * Semantics per day d (mirrors the paper tracker prompts):
 *   candidates(d) = candidates(d-1) ∪ neighbors(candidates(d-1))
 *     ∩ district reveal (Days 3/6)          — §2 step 3
 *     ∩ transit class (Day 4)               — §2 step 3, §9.7
 *     = {site} on a DROP_COMPLETED event    — §2 step 4 (they ended there)
 *     = previous set on STRANDED / NO_MOVEMENT — §9.13, §9.7
 *
 * SP is deliberately ignored (conservative superset — their stamina is hidden).
 */
export function candidateSet(
  vm: ValidatedMap,
  config: CaseConfig,
  log: readonly PublicEvent[],
): Set<NodeId> {
  let prev = new Set<NodeId>([config.safehouse]);
  let cur = prev;
  let day = 0;
  for (const ev of log) {
    // New day begins: expand once from the previous resolved position set.
    if (ev.day !== day) {
      day = ev.day;
      cur = expand(vm, prev);
    }
    switch (ev.kind) {
      case 'DISTRICT_REVEAL': {
        cur = new Set<NodeId>([...cur].filter((n) => vm.districtOf.get(n) === ev.district));
        break;
      }
      case 'TRANSIT_REVEAL': {
        if (ev.move_class === 'NO_MOVEMENT') {
          cur = new Set<NodeId>(prev); // they Held — same position as yesterday
        } else {
          const filtered = filterByClass(vm, prev, cur, ev.move_class);
          if (filtered.size > 0) cur = filtered; // defensive: never collapse to ∅ on odd inputs
        }
        break;
      }
      case 'DROP_COMPLETED': {
        cur = new Set<NodeId>([ev.site]); // position-based check: they ended the day there
        break;
      }
      case 'STRANDED': {
        cur = new Set<NodeId>(prev); // forced Hold — no movement
        break;
      }
      case 'DAY_MARKER':
      case 'VERDICT':
        break; // bookkeeping events; no positional information
    }
    prev = cur;
  }
  // `cur` is the candidate set for the last event day; if the log ends with a
  // DAY_MARKER (a new day began, unresolved yet), the expansion for that day
  // already happened above and no events of that day have arrived.
  void config;
  return cur;
}

/**
 * Candidate set for the day CURRENTLY being planned (FUGITIVE_MOVE phase):
 * one more reachability expansion past the last resolved day — the tracker's
 * "today = where they could have ended today from yesterday's set" row.
 */
export function currentDayCandidates(
  vm: ValidatedMap,
  config: CaseConfig,
  log: readonly PublicEvent[],
): Set<NodeId> {
  return expand(vm, candidateSet(vm, config, log));
}

/** District of a node (typed helper over the validated map). */
export function districtOf(vm: ValidatedMap, n: NodeId): DistrictId {
  return vm.districtOf.get(n) ?? 'D1';
}
