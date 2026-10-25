import { describe, expect, it } from 'vitest';
import { buildLadder, districtClass, generateCase, mulberry32 } from '../src/generator.js';
import { loadAlphaMap } from './helpers.js';

/**
 * L2 properties for the generator (09-testing §2 — scaffold-grade slice):
 * determinism, C6 batch diversity, §9.8 structural invariants (T8), and
 * C5 report completeness. resolve()-based properties (info-wall T2, stakeout
 * consumption T9) arrive with resolve() after the M1 freeze.
 */
describe('L2 · generator determinism', () => {
  const vm = loadAlphaMap();
  const SEED = 20260405;

  it('PRNG stream is deterministic for a fixed seed', () => {
    const a = mulberry32(SEED);
    const b = mulberry32(SEED);
    for (let i = 0; i < 1000; i++) expect(a()).toBe(b());
  });

  it('same seed ⇒ same generated case (config + C5 report)', () => {
    const c1 = generateCase(vm, SEED);
    const c2 = generateCase(vm, SEED);
    expect(c2.config).toEqual(c1.config);
    expect(c2.report).toEqual(c1.report);
  });

  it('different seeds yield (probabilistically) different cases', () => {
    const keys = new Set<string>();
    for (let s = 1; s <= 25; s++) keys.add(generateCase(vm, s).evaluation.key);
    expect(keys.size).toBeGreaterThan(1);
  });
});

describe('L2 · ladder batching (C5 + C6 + §9.8/T8)', () => {
  const vm = loadAlphaMap();

  it('builds the 24-case ladder deterministically, with C6 respected and §9.8 clean', { timeout: 300_000 }, () => {
    for (const seed of [1, 42, 777, 12345, 987654321]) {
      const ladder = buildLadder(vm, seed);
      const again = buildLadder(vm, seed);
      expect(again.map((c) => c.evaluation.key)).toEqual(ladder.map((c) => c.evaluation.key));

      expect(ladder).toHaveLength(24);
      const keys = new Set(ladder.map((c) => c.evaluation.key));
      expect(keys.size).toBe(24); // no config repeats within a batch

      // C6: no district-pair class >50% of the batch; no consecutive repeats.
      const counts = new Map<string, number>();
      let prev: string | null = null;
      for (const c of ladder) {
        const cls = districtClass(vm, c.evaluation);
        const n = (counts.get(cls) ?? 0) + 1;
        expect(n).toBeLessThanOrEqual(12); // ⌊24/2⌋
        counts.set(cls, n);
        expect(cls).not.toBe(prev);
        prev = cls;
      }

      // C5 reports complete + gates in range; §9.8 invariants (T8).
      for (const c of ladder) {
        expect(c.report.map_id).toBe('map_alpha');
        expect(c.report.ruleset_version).toBe('1.0.0-alpha.1');
        expect(c.report.config.safehouse).toBe(c.config.safehouse);
        expect(c.report.measured.min_days).toBe(c.evaluation.minDays);
        expect(c.report.measured.min_days).toBeGreaterThanOrEqual(5);
        expect(c.report.measured.min_days).toBeLessThanOrEqual(7);
        expect(c.report.measured.n_prefixes).toBeGreaterThanOrEqual(3);
        expect(c.report.measured.c4_margin_days).not.toBeNull();
        expect(c.config.drops[0]).not.toBe(c.config.drops[1]);
        expect(c.config.drops).not.toContain(c.config.gate);
        expect(c.report.structural_asserts).toEqual({
          drops_distinct: true,
          gate_not_in_drops: true,
          pools_disjoint: true,
        });
      }
    }
  });
});
