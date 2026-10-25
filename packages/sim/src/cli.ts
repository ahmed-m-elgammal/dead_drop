#!/usr/bin/env node
/**
 * ============================================================================
 * Sim CLI — matrix | sweeps | determinism | all  (M2 W3)
 * ============================================================================
 *
 * Run (from the repo root, after `npm run build`):
 *   node packages/sim/dist/cli.js --mode all --n 1000 --sweep-n 500 \
 *        --det-n 10000 --out m2/w3-results
 *
 * Writes:
 *   matrix.json        20-pair balance matrix (Wilson 95% CIs, histograms…)
 *   sweeps.json        S1–S7 cells + conventions
 *   determinism.json   double-run transcript digest comparison
 * All outputs echo map/ruleset identity, effective parameters, seed lists and
 * the named conventions (04-balance-sim §4.3 "conventions named in outputs").
 *
 * Exit code 0 only when everything ran AND determinism found no mismatch
 * (fail-loudly discipline, same as the Python oracles).
 * ============================================================================
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  validateCityMap,
  type GeneratedCase,
  type ValidatedMap,
} from '@dead-drop/engine';
import {
  determinismCheck,
  generateCaseList,
  runMatrix,
  type PolicyPair,
} from './harness.js';
import { runSweeps } from './sweeps.js';
import {
  FUGITIVE_POLICIES,
  INVESTIGATOR_POLICIES,
} from './policies.js';

/* ------------------------------------------------------------------ args */

interface Args {
  mode: 'matrix' | 'sweeps' | 'determinism' | 'all';
  n: number;
  sweepN: number;
  detN: number;
  out: string;
}

function parseArgs(argv: readonly string[]): Args {
  const get = (flag: string, def: string): string => {
    const i = argv.indexOf(flag);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1]! : def;
  };
  const mode = get('--mode', 'all');
  if (!['matrix', 'sweeps', 'determinism', 'all'].includes(mode)) {
    throw new Error(`unknown --mode ${mode}`);
  }
  return {
    mode: mode as Args['mode'],
    n: Number(get('--n', '1000')),
    sweepN: Number(get('--sweep-n', '500')),
    detN: Number(get('--det-n', '10000')),
    out: get('--out', 'm2/w3-results'),
  };
}

/* ------------------------------------------------------------------- io */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function loadMap(): ValidatedMap {
  const raw: unknown = JSON.parse(
    readFileSync(path.join(repoRoot, 'assets', 'sample_map_alpha.json'), 'utf8'),
  );
  return validateCityMap(raw);
}

const ALL_PAIRS: readonly PolicyPair[] = FUGITIVE_POLICIES.flatMap((f) =>
  INVESTIGATOR_POLICIES.map((i): PolicyPair => [f, i]),
);

/* ----------------------------------------------------------------- modes */

interface PerfRow { label: string; cases: number; seconds: number; casesPerSecond: number }

function perf(label: string, cases: number, seconds: number): PerfRow {
  return { label, cases, seconds, casesPerSecond: seconds > 0 ? cases / seconds : 0 };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const vm = loadMap();
  const perfRows: PerfRow[] = [];
  const outDir = path.isAbsolute(args.out) ? args.out : path.join(repoRoot, args.out);
  mkdirSync(outDir, { recursive: true });

  const baseMeta = () => ({
    generated_by: '@dead-drop/sim cli (M2 W3)',
    map_id: vm.map.map_id,
    map_version: vm.map.version,
    ruleset: '1.0.0-alpha.1 (resolution defaults; sweep overrides echoed per cell — ADR-003/T16)',
    matrix_pairs: ALL_PAIRS.map(([f, i]) => `${f}×${i}`),
    conventions: [
      'CRN: all pairs share the same seeded case list per cell (seeds 1..N).',
      'Wilson score 95% CIs on role win-rates.',
      'Probe chance baseline = 1/|nodes| = 1/48 (uniform posterior, 04 §3.2).',
      'Stakeout calibration = hit-rate vs PREDICTIVE posterior mass at placement (one unobserved day ahead).',
      'Fugitive/investigator policies: exact rules in packages/sim/src/policies.ts header; NOT rules — submission-only.',
    ],
  });

  if (args.mode === 'matrix' || args.mode === 'all') {
    process.stderr.write(`[matrix] generating ${args.n} cases…\n`);
    const cases: GeneratedCase[] = generateCaseList(vm, args.n);
    process.stderr.write(`[matrix] running ${ALL_PAIRS.length} pairs × ${args.n} cases…\n`);
    const cell = runMatrix(vm, cases, ALL_PAIRS);
    perfRows.push(perf('matrix (20 pairs, belief + random policies)', cell.casesRun, cell.seconds));
    // §4.1 engine-level evidence: the same harness with cheap (no belief
    // filter) policies isolates resolution+submission throughput.
    const cheap = runMatrix(vm, cases, [['F-Beeline', 'I-Random']]);
    perfRows.push(perf('engine-level driver (F-Beeline×I-Random, no belief filter)', cheap.casesRun, cheap.seconds));
    const payload = {
      meta: {
        ...baseMeta(),
        n: args.n,
        seeds: `1..${args.n}`,
        seconds: cell.seconds,
        focal_note: 'I-GreedyProbe/I-Calendar rows carry belief-based calibration stats; I-Aggressive/I-Random do not (no tracker).',
      },
      rows: cell.rows,
    };
    writeFileSync(path.join(outDir, 'matrix.json'), JSON.stringify(payload, null, 2));
    process.stderr.write(`[matrix] done in ${cell.seconds.toFixed(1)}s\n`);
  }

  if (args.mode === 'sweeps' || args.mode === 'all') {
    process.stderr.write(`[sweeps] S1–S6 cells × ${args.sweepN} cases…\n`);
    const sweeps = runSweeps(vm, { n: args.sweepN });
    const sweepCases = sweeps.S1.cells.reduce((a, c) => a + c.casesRun, 0)
      + sweeps.S2.cells.reduce((a, c) => a + c.casesRun, 0)
      + sweeps.S3.cells.reduce((a, c) => a + c.casesRun, 0)
      + sweeps.S4.cells.reduce((a, c) => a + c.casesRun, 0)
      + sweeps.S5.cells.reduce((a, c) => a + c.casesRun, 0)
      + sweeps.S6.cells.reduce((a, c) => a + c.casesRun, 0);
    const sweepSeconds = sweeps.S1.cells.reduce((a, c) => a + c.seconds, 0)
      + sweeps.S2.cells.reduce((a, c) => a + c.seconds, 0)
      + sweeps.S3.cells.reduce((a, c) => a + c.seconds, 0)
      + sweeps.S4.cells.reduce((a, c) => a + c.seconds, 0)
      + sweeps.S5.cells.reduce((a, c) => a + c.seconds, 0)
      + sweeps.S6.cells.reduce((a, c) => a + c.seconds, 0);
    perfRows.push(perf('sweeps S1–S6 (focal pairs)', sweepCases, sweepSeconds));
    const payload = {
      meta: {
        ...baseMeta(),
        n_per_cell: args.sweepN,
        focal_pairs: ['F-LeakAware×I-GreedyProbe', 'F-LeakAware×I-Calendar', 'F-Deceptive×I-GreedyProbe', 'F-Deceptive×I-Calendar'],
      },
      ...sweeps,
    };
    writeFileSync(path.join(outDir, 'sweeps.json'), JSON.stringify(payload, null, 2));
    process.stderr.write(`[sweeps] done in ${sweepSeconds.toFixed(1)}s\n`);
  }

  if (args.mode === 'determinism' || args.mode === 'all') {
    const detPairs: readonly PolicyPair[] = [
      ['F-Beeline', 'I-Random'],
      ['F-Random', 'I-Random'],
      ['F-Random', 'I-GreedyProbe'],
    ];
    process.stderr.write(`[determinism] ${args.detN} seeds × ${detPairs.length} pairs, double-run…\n`);
    const det = determinismCheck(vm, args.detN, detPairs);
    perfRows.push(perf('determinism double-run', det.casesRun, det.seconds));
    const payload = {
      meta: { ...baseMeta(), seeds: `1..${args.detN}`, digest: 'fnv1a32 over full transcript (verdict, ledgers, both logs, §8.6 route)' },
      ...det,
      pass: det.mismatches.length === 0,
    };
    writeFileSync(path.join(outDir, 'determinism.json'), JSON.stringify(payload, null, 2));
    process.stderr.write(`[determinism] ${det.mismatches.length} mismatches in ${det.seconds.toFixed(1)}s\n`);
    if (det.mismatches.length > 0) {
      console.error('[determinism] FAIL — transcripts diverged; engine determinism broken');
      process.exitCode = 1;
    }
  }

  const perfPayload = {
    meta: baseMeta(),
    rows: perfRows,
    note: '04-balance-sim §4.1 target: ≥1,000 cases/second order-of-magnitude (est.). The engine-level driver (runScriptedCase, no policy layer) is faster; these numbers include the full policy + belief-filter layer.',
  };
  writeFileSync(path.join(outDir, 'performance.json'), JSON.stringify(perfPayload, null, 2));

  for (const r of perfRows) {
    console.log(`${r.label}: ${r.cases} cases in ${r.seconds.toFixed(1)}s → ${Math.round(r.casesPerSecond).toLocaleString('en-US')} cases/s`);
  }
  console.log(`results → ${path.relative(repoRoot, outDir)}/`);
}

main();
