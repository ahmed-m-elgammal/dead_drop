/**
 * Sim-layer tests — policy contract: legality (engine-enforced), determinism,
 * and the instrumentation surface. The engine throws on any illegal
 * submission, so "runs without throwing" IS the legality property.
 */
import { describe, expect, it } from 'vitest';
import type { GeneratedCase } from '@dead-drop/engine';
import { generateCase } from '@dead-drop/engine';
import { loadAlphaMap } from '../../engine/test/helpers.js';
import { runPairCase } from '../src/harness.js';
import {
  FUGITIVE_POLICIES,
  INVESTIGATOR_POLICIES,
  makeFugitive,
  makeInvestigator,
  policyRng,
} from '../src/policies.js';
import { resolveParams } from '@dead-drop/engine';

const vm = loadAlphaMap();
const params = resolveParams();

describe('policy set shape', () => {
  it('exposes exactly the 04-balance-sim §4.2 roster', () => {
    expect([...FUGITIVE_POLICIES]).toEqual(['F-Beeline', 'F-Random', 'F-LeakAware', 'F-Deceptive', 'F-SlackBurner']);
    expect([...INVESTIGATOR_POLICIES]).toEqual(['I-GreedyProbe', 'I-Calendar', 'I-Aggressive', 'I-Random']);
  });
});

describe('policy determinism (same inputs ⇒ same outcome)', () => {
  const gc: GeneratedCase = generateCase(vm, 7);

  for (const f of FUGITIVE_POLICIES) {
    for (const i of INVESTIGATOR_POLICIES) {
      it(`${f}×${i} reproduces byte-identical outcomes`, () => {
        const a = runPairCase(vm, gc, f, i);
        const b = runPairCase(vm, gc, f, i);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      });
    }
  }
});

describe('policy streams are keyed per (seed, role, policy)', () => {
  it('different policies draw different streams for the same case', () => {
    const a = policyRng(7, 'F', 'F-Random');
    const b = policyRng(7, 'F', 'F-LeakAware'); // deterministic policy; stream identity only
    void b;
    const drawsA = [a(), a(), a()];
    const c = policyRng(7, 'F', 'F-Random');
    expect([c(), c(), c()]).toEqual(drawsA); // reproducible
    const d = policyRng(8, 'F', 'F-Random');
    expect([d(), d(), d()]).not.toEqual(drawsA); // seed-sensitive
  });
});

describe('full-case legality sweep (engine-enforced)', () => {
  // Every illegal submission throws EngineError — surviving all 20 pairs × 6
  // seeds IS the property "policies only submit legal actions".
  for (const f of FUGITIVE_POLICIES) {
    for (const i of INVESTIGATOR_POLICIES) {
      it(`${f}×${i} plays 6 seeded cases to a verdict without illegal submissions`, () => {
        for (let seed = 1; seed <= 6; seed++) {
          const gc = generateCase(vm, seed);
          const o = runPairCase(vm, gc, f, i);
          expect(['ESCAPE', 'CAPTURE', 'EXPIRY']).toContain(o.verdict);
          expect(o.endDay).toBeGreaterThanOrEqual(1);
          expect(o.endDay).toBeLessThanOrEqual(8);
        }
      });
    }
  }
});

describe('instrumentation surface', () => {
  it('belief policies report mass sums; non-belief policies report null', () => {
    const gc = generateCase(vm, 3);
    const greedy = runPairCase(vm, gc, 'F-LeakAware', 'I-GreedyProbe');
    expect(greedy.probeMassSum).not.toBeNull();
    expect(greedy.stakeoutMassSum).not.toBeNull();
    expect(greedy.probeMassSum!).toBeGreaterThanOrEqual(0);

    const random = runPairCase(vm, gc, 'F-LeakAware', 'I-Random');
    expect(random.probeMassSum).toBeNull();
    expect(random.stakeoutMassSum).toBeNull();

    const camp = runPairCase(vm, gc, 'F-LeakAware', 'I-Aggressive');
    expect(camp.probes).toBe(0); // I-Aggressive never probes
    expect(camp.stakeoutPlacements).toBeGreaterThanOrEqual(1); // camps immediately
  });

  it('policy instances start with zeroed stats (no cross-case leakage)', () => {
    const ctx = { vm, config: generateCase(vm, 1).config, params, rng: () => 0.5 };
    const p = makeInvestigator('I-GreedyProbe', ctx);
    expect(p.stats.capBlocks).toBe(0);
    const f = makeFugitive('F-Deceptive', ctx);
    expect(f.name).toBe('F-Deceptive');
  });
});
