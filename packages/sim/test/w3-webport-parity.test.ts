/**
 * W3 parity gate: the apps/web BeliefTracker port must be BEHAVIORALLY
 * IDENTICAL to the sim implementation that produced the recorded M2 balance
 * numbers (packages/sim/src/belief.ts — the 133,500-case matrix run).
 *
 * Method: drive many random cases through the REAL engine (random feasible
 * fugitive moves + noisy random investigator actions, so both trackers see
 * rich evidence: reveals, drop completions, STRANDED, probe HIT/MISS,
 * stakeout misses), snapshot the InvestigatorView at every investigator
 * decision, then feed the SAME snapshots to both trackers and require
 * bit-close posteriors (node marginals, argmax nodes, predictive argmax).
 *
 * Float tolerance is 1e-12 — the two files are the same arithmetic, so any
 * real divergence orders of magnitude exceeds this. A failure here means the
 * on-device AI is no longer the measured opponent — fix the port, not the
 * test.
 */
import { describe, expect, it } from 'vitest';
import {
  CaseSession,
  edgeCost,
  generateCase,
  investigatorLegality,
  mulberry32,
  validateCityMap,
  type ActionEnvelope,
  type InvestigatorSubmission,
  type InvestigatorView,
  type NodeId,
  type SimParamOverrides,
} from '@dead-drop/engine';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { BeliefTracker as SimTracker } from '../src/belief.js';
import { BeliefTracker as PortTracker } from '../../../apps/web/src/lib/dd/belief-tracker.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const VM = validateCityMap(
  JSON.parse(readFileSync(path.join(repoRoot, 'assets', 'sample_map_alpha.json'), 'utf8')),
);
const ALL_NODES: NodeId[] = VM.map.nodes.map((n) => n.id as NodeId);

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-12;
}

function expectSamePosterior(sim: SimTracker, port: PortTracker): void {
  const sm = sim.nodeMarginal();
  const pm = port.nodeMarginal();
  expect(sm.size).toBe(pm.size);
  for (const [n, m] of sm) {
    expect(pm.has(n)).toBe(true);
    expect(close(m, pm.get(n)!)).toBe(true);
  }
  const sa = sim.maxNode();
  const pa = port.maxNode();
  expect(sa.node).toBe(pa.node);
  expect(close(sa.mass, pa.mass)).toBe(true);
  const sp = sim.predictiveMaxNode();
  const pp = port.predictiveMaxNode();
  expect(sp.node).toBe(pp.node);
  expect(close(sp.mass, pp.mass)).toBe(true);
}

/** One randomized case; snapshots fed to both trackers at every investigator
 *  decision. Returns the number of parity checkpoints. */
function runRandomCase(
  seed: number,
  params: { params?: SimParamOverrides },
  probeBias: number,
  stakeBias: number,
  holdBias: number,
): number {
  const rng = mulberry32(seed);
  const gen = generateCase(VM, seed);
  const session = new CaseSession(VM, gen.config, params);
  const sim = new SimTracker(
    VM, gen.config.safehouse, gen.config.stamina_budget,
    gen.config.drops[0]!, gen.config.drops[1]!, session.p,
  );
  const port = new PortTracker(
    VM, gen.config.safehouse, gen.config.stamina_budget,
    gen.config.drops[0]!, gen.config.drops[1]!, session.p,
  );
  let checkpoints = 0;
  let idx = 0;
  for (let step = 0; step < 4000; step++) {
    if (session.state.verdict !== null) break;

    if (session.state.phase === 'FUGITIVE_MOVE') {
      const pos = session.state.fugitive.position;
      // Cheapest parallel edge per target (T15), then affordability.
      const best = new Map<NodeId, number>();
      for (const e of VM.adjacency.get(pos)!) {
        const c = edgeCost(e.cls);
        const prev = best.get(e.node);
        if (prev === undefined || c < prev) best.set(e.node, c);
      }
      const afford = [...best.entries()].filter(([, c]) => c <= session.state.fugitive.stamina);
      const holdOk =
        session.state.fugitive.holds_used < session.p.P6_hold_max &&
        session.state.fugitive.stamina >= session.p.P6_hold_cost;
      if (afford.length === 0 && !holdOk) {
        session.resolveStranded(); // §9.13
      } else if (holdOk && rng() < holdBias) {
        session.submitFugitive({ idempotency_key: `f-${seed}-${idx++}`, action: { kind: 'HOLD' } });
      } else {
        const to = afford[Math.floor(rng() * afford.length)]![0];
        session.submitFugitive({ idempotency_key: `f-${seed}-${idx++}`, action: { kind: 'MOVE', to } });
      }
    } else if (session.state.phase === 'INVESTIGATOR_ACTIONS') {
      // One snapshot per investigator decision — both trackers consume it.
      const view: InvestigatorView = structuredClone(session.investigatorView());
      sim.sync(view);
      sim.markDay(view.day);
      port.sync(view);
      port.markDay(view.day);
      expectSamePosterior(sim, port);
      checkpoints++;

      const leg = investigatorLegality(session.state, session.p);
      const r = rng();
      let action: InvestigatorSubmission = { kind: 'WAIT' };
      if (leg.probe && r < probeBias) {
        action = { kind: 'PROBE', target: ALL_NODES[Math.floor(rng() * ALL_NODES.length)]! };
      } else if (leg.stakeout && r < stakeBias) {
        action = { kind: 'STAKEOUT', target: ALL_NODES[Math.floor(rng() * ALL_NODES.length)]! };
      }
      if (action.kind === 'WAIT') session.endInvestigatorPhase();
      else session.submitInvestigator({ idempotency_key: `i-${seed}-${idx++}`, action });
    }
  }
  expect(session.state.verdict).not.toBeNull();
  return checkpoints;
}

describe('W3 web-port parity: BeliefTracker ≡ sim belief.ts', () => {
  it('identical posteriors across 40 random cases with rich evidence', () => {
    let checked = 0;
    for (let seed = 1; seed <= 40; seed++) {
      checked += runRandomCase(seed, {}, 0.55, 0.7, 0.15);
    }
    expect(checked).toBeGreaterThan(200); // the run actually exercised many snapshots
  });

  it('identical posteriors under canonical AND override params (T16 surface)', () => {
    let checked = 0;
    for (let seed = 101; seed <= 115; seed++) {
      checked += runRandomCase(seed, { params: { P8_stakeout_cost: 4 } }, 0.8, 0.35, 0.3);
    }
    expect(checked).toBeGreaterThan(80);
  });
});
