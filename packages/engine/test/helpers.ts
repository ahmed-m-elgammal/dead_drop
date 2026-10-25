import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateCityMap, type ValidatedMap } from '../src/map.js';
import type { EvaluatedConfig } from '../src/feasibility.js';

/** Repo root: packages/engine/test/helpers.ts → up 3. */
export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

let cachedMap: ValidatedMap | null = null;

/** Load + validate the canonical map asset (cached per test process). */
export function loadAlphaMap(): ValidatedMap {
  if (cachedMap) return cachedMap;
  const raw: unknown = JSON.parse(
    readFileSync(path.join(repoRoot, 'assets', 'sample_map_alpha.json'), 'utf8'),
  );
  cachedMap = validateCityMap(raw);
  return cachedMap;
}

export function loadRawMapJson(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(repoRoot, 'assets', 'sample_map_alpha.json'), 'utf8'),
  ) as Record<string, unknown>;
}

export function loadFixture<T = unknown>(name: string): T {
  return JSON.parse(
    readFileSync(path.join(repoRoot, 'packages', 'engine', 'fixtures', name), 'utf8'),
  ) as T;
}

/** Map a TS EvaluatedConfig onto the Python-emitted fixture record shape
 *  (snake_case) for deep-equality comparison. */
export function toFixtureRecord(ev: EvaluatedConfig) {
  return {
    key: ev.key,
    safehouse: ev.safehouse,
    drop1: ev.drop1,
    drop2: ev.drop2,
    gate: ev.gate,
    min_days: ev.minDays,
    min_cost_sp: ev.minCostSp,
    n_prefixes: ev.nPrefixes,
    cheapest_drop2_sp: ev.cheapestDrop2Sp,
    c4_case: ev.c4Case,
    c4_margin_days: ev.c4MarginDays,
    passes: ev.passes,
  };
}

export interface ValidConfigsFixture {
  meta: {
    generator: string;
    date: string;
    map: string;
    ruleset: string;
    space: string;
    reading: string;
    c2_only_in_band_ordered_24pool: number;
    crosscheck: { against: string; pass_count: number; pass_set_identical: boolean };
    usage: string;
  };
  pass_count: number;
  configs: ReturnType<typeof toFixtureRecord>[];
}
