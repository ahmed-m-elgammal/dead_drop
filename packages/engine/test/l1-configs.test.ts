import { describe, expect, it } from 'vitest';
import { enumerateSpace, } from '../src/generator.js';
import { evaluateConfig } from '../src/feasibility.js';
import { loadAlphaMap, loadFixture, toFixtureRecord, type ValidConfigsFixture } from './helpers.js';

/**
 * THE dual-language reconciliation test (M2 W2 pre-flight centerpiece):
 * the TS feasibility gate must reproduce the Python oracle's fixtures
 * EXACTLY — same 115 passing configurations out of the same 2208-space,
 * with identical per-config measured gate values (min_days, min_cost_sp,
 * n_prefixes, cheapest_drop2_sp, c4_case, c4_margin_days).
 *
 * Fixture provenance: tools/verification/dd_m2_emit_fixtures.py →
 * packages/engine/fixtures/valid-configs.json, whose pass set was itself
 * cross-asserted identical to the independent M2-W1 recount
 * (m2_aud003_recount_results.json). Two independent languages, one answer.
 */
describe('L1 · 115-config reconciliation (TS gate ≡ Python oracle)', () => {
  const vm = loadAlphaMap();
  const fixture = loadFixture<ValidConfigsFixture>('valid-configs.json');

  it('fixture meta is the expected pinned-reading contract', () => {
    expect(fixture.pass_count).toBe(115);
    expect(fixture.configs).toHaveLength(115);
    expect(fixture.meta.crosscheck.pass_set_identical).toBe(true);
    expect(fixture.meta.space).toContain('2208');
  });

  it('enumerates the same 2208 ordered space', () => {
    expect(enumerateSpace(vm)).toHaveLength(2208);
  });

  const tsPassing = new Map<string, ReturnType<typeof toFixtureRecord>>();
  let c2Only = 0;

  it('TS gate over the full space: same count, same key set, same values', { timeout: 300_000 }, () => {
    for (const [sh, d1, d2, g] of enumerateSpace(vm)) {
      const ev = evaluateConfig(vm, sh, d1, d2, g);
      if (ev === null) continue;
      c2Only += 1; // C2-only in-band (ordered, 24-pool)
      if (ev.passes) tsPassing.set(ev.key, toFixtureRecord(ev));
    }
    expect(tsPassing.size).toBe(fixture.pass_count);
    const tsKeys = new Set(tsPassing.keys());
    const fixtureKeys = new Set(fixture.configs.map((c) => c.key));
    expect(tsKeys).toEqual(fixtureKeys);
    for (const c of fixture.configs) {
      expect(tsPassing.get(c.key)).toEqual(c);
    }
  });

  it('reproduces the C2-only in-band fact (435/2208, convention named in fixture meta)', () => {
    expect(c2Only).toBe(fixture.meta.c2_only_in_band_ordered_24pool);
    expect(c2Only).toBe(435);
  });

  it('every passing config satisfies the C5 gate ranges', () => {
    for (const c of fixture.configs) {
      expect(c.min_days).toBeGreaterThanOrEqual(5);
      expect(c.min_days).toBeLessThanOrEqual(7);
      expect(c.min_cost_sp).toBeLessThanOrEqual(12);
      expect(c.n_prefixes).toBeGreaterThanOrEqual(3);
      expect(c.c4_case).toBe(true);
      expect(c.c4_margin_days).not.toBeNull();
    }
  });
});
