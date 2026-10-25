/**
 * ============================================================================
 * Scenario sweeps S1–S7 (04-balance-sim §4.4) — M2 W3.
 * ============================================================================
 *
 * Each sweep varies ONE design axis around the v1.0-alpha values and reports
 * the same aggregates as the matrix. Sweep cells reuse the COMMON case list
 * (CRN) except S6, whose feasibility band shifts with P1 (cases regenerate
 * under `shape` with the same seed list — ADR-003/T16).
 *
 * S7 is analysis-only: the degenerate-strategy probes (I-Aggressive camping,
 * F-Beeline exploitability) are read off the 20-pair matrix rows.
 *
 * Focal pairs for sweeps: the §4.5 acceptance pairs —
 *   (F-LeakAware|F-Deceptive) × (I-GreedyProbe|I-Calendar).
 * ============================================================================
 */
import type { ValidatedMap } from '@dead-drop/engine';
import type { RevealSchedule } from '@dead-drop/engine';
import {
  generateCaseList,
  runMatrix,
  type MatrixCell,
  type PolicyPair,
  type RunOptions,
} from './harness.js';
import type { FugitivePolicyName, InvestigatorPolicyName } from './policies.js';

export const FOCAL_PAIRS: readonly PolicyPair[] = [
  ['F-LeakAware', 'I-GreedyProbe'],
  ['F-LeakAware', 'I-Calendar'],
  ['F-Deceptive', 'I-GreedyProbe'],
  ['F-Deceptive', 'I-Calendar'],
];

export interface SweepCellResult {
  id: string;
  label: string;
  /** Effective overrides this cell ran under (echoed per ADR-003). */
  params?: Record<string, number>;
  configPatch?: Record<string, unknown>;
  delayInvestigator?: boolean;
  shape?: { days: number; band: [number, number] };
  rows: MatrixCell['rows'];
  seconds: number;
  casesRun: number;
}

export interface SweepMeta {
  conventions: string[];
}

export interface SweepsResult {
  S1: { cells: SweepCellResult[]; meta: SweepMeta };
  S2: { cells: SweepCellResult[]; meta: SweepMeta };
  S3: { cells: SweepCellResult[]; meta: SweepMeta };
  S4: { cells: SweepCellResult[]; meta: SweepMeta };
  S5: { cells: SweepCellResult[]; meta: SweepMeta };
  S6: { cells: SweepCellResult[]; meta: SweepMeta };
  S7: { meta: SweepMeta; note: string };
}

export interface SweepRunOptions {
  n: number;
  /** Extra RunOptions merged into every cell (none today). */
  base?: RunOptions;
}

function runCell(
  vm: ValidatedMap,
  id: string,
  label: string,
  cases: ReturnType<typeof generateCaseList>,
  pairs: readonly PolicyPair[],
  opts: RunOptions,
  extra: Omit<SweepCellResult, 'id' | 'label' | 'rows' | 'seconds' | 'casesRun'> = {},
): SweepCellResult {
  const cell = runMatrix(vm, cases, pairs, opts);
  return {
    id,
    label,
    ...extra,
    rows: cell.rows,
    seconds: cell.seconds,
    casesRun: cell.casesRun,
  };
}

const COMMON_CONVENTIONS = [
  'CRN: every pair in a cell runs the same seeded case list (seeds 1..N).',
  'Focal pairs = the 04-balance-sim §4.5 acceptance pairs.',
  'Wilson 95% CIs on investigator win-rate; raw counts attached.',
];

export function runSweeps(vm: ValidatedMap, opts: SweepRunOptions): SweepsResult {
  const { n } = opts;
  const baseCases = generateCaseList(vm, n);

  /* S1 — baseline role balance: P4 ∈ {8,10,12} × P3 ∈ {10,12,14}.
   * Convention: budgets are PLAYED budgets (per-case config); case shapes
   * stay the canonical feasibility pool (isolate budget effect from
   * case-shape effect). */
  const s1Cells: SweepCellResult[] = [];
  for (const p3 of [10, 12, 14]) {
    for (const p4 of [8, 10, 12]) {
      s1Cells.push(runCell(vm, `S1/P3=${p3}/P4=${p4}`, `SP=${p3} IP=${p4}`, baseCases, FOCAL_PAIRS, {
        ...opts.base,
        configPatch: { ...opts.base?.configPatch, stamina_budget: p3, intel_budget: p4 },
      }, { configPatch: { stamina_budget: p3, intel_budget: p4 } }));
    }
  }

  /* S2 — reveal-schedule adequacy (the roadmap's named risk). */
  const schedules: Array<[string, RevealSchedule]> = [
    ['base {3,6}/{4}', { district_days: [3, 6], transit_days: [4] }],
    ['dense {2,5,7}/{4}', { district_days: [2, 5, 7], transit_days: [4] }],
    ['transit+ {3,6}/{4,7}', { district_days: [3, 6], transit_days: [4, 7] }],
  ];
  const s2Cells: SweepCellResult[] = schedules.map(([label, sched]) =>
    runCell(vm, `S2/${label}`, label, baseCases, FOCAL_PAIRS, {
      ...opts.base,
      configPatch: { ...opts.base?.configPatch, reveal_schedule: sched },
    }, { configPatch: { reveal_schedule: { district_days: [...sched.district_days], transit_days: [...sched.transit_days] } } }),
  );

  /* S3 — first-mover initiative, control run only (NOT a rules proposal).
   * Implementation convention: the mirror is approximated as a ONE-DAY
   * DECISION DELAY for the Investigator (day-d actions decided on the
   * end-of-day-(d−1) view). Resolution order is untouched — a true
   * investigator-first resolution would be a rules variant, out of scope
   * per the plan. */
  const s3Cells: SweepCellResult[] = [
    runCell(vm, 'S3/baseline', 'Fugitive-first (rules as written)', baseCases, FOCAL_PAIRS, { ...opts.base }),
    runCell(vm, 'S3/I-delayed', 'Investigator decisions delayed one day', baseCases, FOCAL_PAIRS, {
      ...opts.base,
      delayInvestigator: true,
    }, { delayInvestigator: true }),
  ];

  /* S4 — stakeout pricing: P8 ∈ {2,3,4} × P7 ∈ {1,2} (P7 = probe COST;
   * the ±2/day cap is NOT swept here — it is Q4's instrument, not S4's). */
  const s4Cells: SweepCellResult[] = [];
  for (const p8 of [2, 3, 4]) {
    for (const p7 of [1, 2]) {
      s4Cells.push(runCell(vm, `S4/P8=${p8}/P7=${p7}`, `stakeout=${p8}IP probe=${p7}IP`, baseCases, FOCAL_PAIRS, {
        ...opts.base,
        params: { ...opts.base?.params, P8_stakeout_cost: p8, P7_probe_cost: p7 },
      }, { params: { P8_stakeout_cost: p8, P7_probe_cost: p7 } }));
    }
  }

  /* S5 — Hold economy: P6 max ∈ {1,2,3}. */
  const s5Cells: SweepCellResult[] = [1, 2, 3].map((hmax) =>
    runCell(vm, `S5/P6max=${hmax}`, `hold max=${hmax}`, baseCases, FOCAL_PAIRS, {
      ...opts.base,
      params: { ...opts.base?.params, P6_hold_max: hmax },
    }, { params: { P6_hold_max: hmax } }),
  );

  /* S6 — case length: P1 ∈ {7,8,9} with the P12 band shifted to [5, P1−1]
   * (keeps the "≥1 day of endgame slack" invariant; convention named).
   * Cases REGENERATE per cell under the shifted band; budgets/schedules stay
   * canonical; P1 overrides the resolution clock (T16). */
  const s6Cells: SweepCellResult[] = [];
  for (const p1 of [7, 8, 9]) {
    const shape = { days: p1, band: [5, p1 - 1] as [number, number] };
    const cases = generateCaseList(vm, n, shape);
    s6Cells.push(runCell(vm, `S6/P1=${p1}`, `days=${p1} band=[5,${p1 - 1}]`, cases, FOCAL_PAIRS, {
      ...opts.base,
      params: { ...opts.base?.params, P1_days_per_case: p1 },
    }, { params: { P1_days_per_case: p1 }, shape }));
  }

  return {
    S1: { cells: s1Cells, meta: { conventions: [...COMMON_CONVENTIONS, 'S1: played budgets vary; case shapes fixed (canonical pool).'] } },
    S2: { cells: s2Cells, meta: { conventions: [...COMMON_CONVENTIONS, 'S2 variants: {3,6}/{4} (base) vs {2,5,7}/{4} vs {3,6}/{4,7}.'] } },
    S3: {
      cells: s3Cells,
      meta: {
        conventions: [
          ...COMMON_CONVENTIONS,
          'S3 control: I-first approximated as a one-day DECISION delay; resolution order unchanged (a true mirror would be a rules variant — out of scope per plan).',
        ],
      },
    },
    S4: { cells: s4Cells, meta: { conventions: [...COMMON_CONVENTIONS, 'S4: P7 axis = probe COST (cap stays 2/day; Q4 instruments the cap).'] } },
    S5: { cells: s5Cells, meta: { conventions: [...COMMON_CONVENTIONS, 'S5: hold MAX varies (cost stays 1).'] } },
    S6: { cells: s6Cells, meta: { conventions: [...COMMON_CONVENTIONS, 'S6: band shifted to [5, P1−1]; cases regenerated per cell from the same seed list.'] } },
    S7: {
      meta: { conventions: ['S7 reads the 20-pair matrix rows (no separate runs).'] },
      note: 'Degenerate probes = matrix rows for I-Aggressive (gate/drop camping) and F-Beeline (exploitability: I-GreedyProbe vs F-Beeline).',
    },
  };
}

/** Convenience type re-exports for the CLI. */
export type { FugitivePolicyName, InvestigatorPolicyName };
