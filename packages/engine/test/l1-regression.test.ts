import { describe, expect, it } from 'vitest';
import { cheapestDrop2, minDays } from '../src/feasibility.js';
import { loadAlphaMap, loadFixture } from './helpers.js';

interface RegressionFixture {
  meta: { source: string; usage: string };
  cases: Array<{
    case: string;
    safehouse: string;
    drops: [string, string];
    gate: string;
    min_days: number;
    cheapest_drop2_sp: number;
  }>;
}

/** L1 regression constants (m1/m2-handoff.md §3; 09-testing §1). The Python
 *  oracle is dd_m1_w1_validation.py / dd_m2_aud003_constraints.py — this test
 *  asserts the TS engine reproduces the same four numbers exactly. */
describe('L1 · paper-verified regression constants (4 cases)', () => {
  const vm = loadAlphaMap();
  const fixture = loadFixture<RegressionFixture>('regression-cases.json');

  it('fixture itself carries the handoff values', () => {
    const expected: Record<string, [number, number]> = {
      P1: [6, 5],
      P2: [6, 6],
      P3: [6, 7],
      canonical: [7, 6],
    };
    for (const c of fixture.cases) {
      const [d, s] = expected[c.case]!;
      expect([c.min_days, c.cheapest_drop2_sp]).toEqual([d, s]);
    }
  });

  for (const c of fixture.cases) {
    it(`${c.case}: ${c.safehouse} / [${c.drops[0]}, ${c.drops[1]}] / ${c.gate} → ${c.min_days}d / ${c.cheapest_drop2_sp}SP`, () => {
      const md = minDays(vm, c.safehouse, c.drops[0]!, c.drops[1]!, c.gate);
      const cd = cheapestDrop2(vm, c.safehouse, c.drops[0]!, c.drops[1]!);
      expect(md).toBe(c.min_days);
      expect(cd).toBe(c.cheapest_drop2_sp);
    });
  }
});
