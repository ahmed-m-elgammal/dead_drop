/**
 * ============================================================================
 * Simulation harness (04-balance-sim §4.1–§4.3) — M2 W3.
 * ============================================================================
 *
 * Drives the pure engine (packages/engine) headlessly: seeded generated cases
 * × scripted policy pairs ⇒ verdicts ⇒ aggregated statistics. The harness is
 * the referee: it reads the full CaseState ONLY for outcome metrics after the
 * verdict (and for the S3 snapshot, which is a role view); policies during
 * play see role views exclusively.
 *
 * Conventions (named, echoed in every results file):
 *   CRN   Common random numbers — every policy pair runs the SAME N seeded
 *         cases (config identical across pairs), so pair differences isolate
 *         policy effect. Random policies still differ per pair: their streams
 *         are keyed (case seed, role, policy name).
 *   SEEDS Matrix/sweep case seeds are 1..N (per cell); S6 cells regenerate
 *         cases under their shifted feasibility band with the same seed list.
 *   WILSON Wilson score interval at 95% (z = 1.959963984540054).
 *   CHANCE Probe "chance" baseline = 1/|nodes| (uniform 48-node posterior,
 *         04-balance-sim §3.2).
 *   CALIB Stakeout calibration compares hit-rate against the PREDICTIVE
 *         posterior mass at the staked node (belief advanced through the one
 *         unobserved day between placement and §2-step-2 resolution).
 * ============================================================================
 */
import {
  CaseSession,
  VERDICT_WINNER,
  generateCase,
  isStranded,
  resolveParams,
  type CaseState,
  type CaseConfig,
  type EffectiveParams,
  type GeneratedCase,
  type InvestigatorView,
  type SimParamOverrides,
  type ValidatedMap,
  type Verdict,
  type Winner,
} from '@dead-drop/engine';
import {
  makeFugitive,
  makeInvestigator,
  policyRng,
  type FugitivePolicyName,
  type InvestigatorPolicyName,
} from './policies.js';

export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Wilson score 95% interval for a binomial proportion. */
export function wilson95(k: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const z = 1.959963984540054;
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

/* ------------------------------------------------------------- case runner */

export interface RunOptions {
  /** T16/ADR-003 simulation parameter overrides (S4/S5/S6). */
  params?: SimParamOverrides;
  /** Per-case config patch (S1 budgets, S2 schedules) — applied to the
   *  generated config; shape pools stay fixed (see report conventions). */
  configPatch?: Partial<Pick<CaseConfig, 'stamina_budget' | 'intel_budget' | 'reveal_schedule'>>;
  /** S3 control: the Investigator decides each day's actions on the view as
   *  of the START of that day (before the fugitive's move) — a one-day
   *  decision delay. Resolution order is UNCHANGED (engine-faithful). */
  delayInvestigator?: boolean;
}

export interface CaseOutcome {
  seed: number;
  pair: string;
  configKey: string;
  verdict: Verdict;
  winner: Winner;
  endDay: number;
  captureDay: number | null;
  escapeDay: number | null;
  ipUnspent: number;
  spUnspent: number;
  probes: number;
  probeHits: number;
  stakeoutPlacements: number;
  /** From the investigator policy's own tracker (null for non-belief). */
  probeMassSum: number | null;
  stakeoutMassSum: number | null;
  capBlocks: number;
}

/** Deep-enough copy of the investigator view for the S3 delayed mode: the
 *  policy must not observe events that land after the snapshot. */
function snapshotView(st: CaseState): InvestigatorView {
  return {
    ...st,
    fugitive: {},
    investigator: { ...st.investigator },
    log: st.log.map((e) => ({ ...e })),
    private_log_investigator: st.private_log_investigator.map((e) => ({ ...e })),
  };
}

export interface FullCaseResult {
  outcome: CaseOutcome;
  state: CaseState;
  /** The finished session (CASE_OVER) — the referee's handle for §8.6
   *  disclosure extraction (determinism digests). */
  session: CaseSession;
}

/** Full case run; returns the outcome AND the final state (the harness is the
 *  referee — full-state reads happen here only, after the verdict). */
export function runCaseFull(
  vm: ValidatedMap,
  gc: GeneratedCase,
  fPolicyName: FugitivePolicyName,
  iPolicyName: InvestigatorPolicyName,
  opts: RunOptions = {},
): FullCaseResult {
  const params: EffectiveParams = resolveParams(opts.params);
  const config: CaseConfig = opts.configPatch
    ? { ...gc.config, ...opts.configPatch }
    : gc.config;
  const pair = `${fPolicyName}×${iPolicyName}`;

  const session = new CaseSession(vm, config, { params: opts.params });
  const fpol = makeFugitive(fPolicyName, {
    vm, config, params, rng: policyRng(gc.config.seed, 'F', fPolicyName),
  });
  const ipol = makeInvestigator(iPolicyName, {
    vm, config, params, rng: policyRng(gc.config.seed, 'I', iPolicyName),
  });

  let delayed: ReturnType<typeof snapshotView> | null = null;
  let dayGuard = 0;
  const maxDay = params.P1_days_per_case;

  while (session.state.verdict === null) {
    const day = session.state.day;
    if (++dayGuard > maxDay + 2) {
      throw new Error(`[HARNESS] ${pair} seed ${gc.config.seed}: day overflow at ${day}`);
    }
    if (opts.delayInvestigator) {
      // Snapshot BEFORE the fugitive's day-d move: the Investigator will
      // decide day-d actions from end-of-day-(d−1) knowledge.
      delayed = snapshotView(session.state);
    }

    // §2 step 1 — fugitive day (§9.13 pre-checked, mirroring runScriptedCase).
    if (isStranded(vm, session.state, session.p)) {
      session.resolveStranded();
    } else {
      const action = fpol.decide(session.fugitiveView());
      session.submitFugitive({ idempotency_key: `sim-f-${gc.config.seed}-${day}`, action });
    }
    if (session.state.verdict !== null) break;

    // §2 step 6 — investigator actions until WAIT/phase end.
    let actionIdx = 0;
    while (session.state.verdict === null && session.state.phase === 'INVESTIGATOR_ACTIONS') {
      if (++actionIdx > 64) {
        throw new Error(`[HARNESS] ${pair} seed ${gc.config.seed}: investigator action loop guard on day ${day}`);
      }
      if (delayed !== null) {
        // Self-knowledge is NEVER delayed (the Investigator always knows its
        // own intel/probe-counter/armed slot — §1.3 hides only FUGITIVE
        // state); only the day-d evidence is. Refresh own state per decision.
        delayed.investigator = { ...session.state.investigator };
      }
      const view = delayed ?? session.investigatorView();
      const action = ipol.decide(view);
      if (action.kind === 'WAIT') {
        session.endInvestigatorPhase();
        break;
      }
      session.submitInvestigator({
        idempotency_key: `sim-i-${gc.config.seed}-${day}-${actionIdx}`,
        action,
      });
    }
  }

  const st = session.state;
  if (st.verdict === null) throw new Error(`[HARNESS] ${pair} seed ${gc.config.seed}: no verdict`);
  if (st.verdict === 'VOID' || st.verdict === 'FORFEIT_F' || st.verdict === 'FORFEIT_I') {
    // Clock-layer verdicts cannot occur in a headless sim — a policy bug or
    // engine regression would surface here. Fail loudly (fail-loudly rule).
    throw new Error(`[HARNESS] ${pair} seed ${gc.config.seed}: unexpected verdict ${st.verdict}`);
  }

  let probes = 0;
  let probeHits = 0;
  let placements = 0;
  for (const e of st.private_log_investigator) {
    if (e.kind === 'PROBE_RESULT') {
      probes += 1;
      if (e.result === 'HIT') probeHits += 1;
    } else if (e.kind === 'STAKEOUT_PLACED') {
      placements += 1;
    }
  }

  const configKey = `${config.safehouse}|${config.drops[0]}|${config.drops[1]}|${config.gate}`;
  return {
    outcome: {
      seed: gc.config.seed,
      pair,
      configKey,
      verdict: st.verdict,
      winner: VERDICT_WINNER[st.verdict],
      endDay: st.day,
      captureDay: st.verdict === 'CAPTURE' ? st.day : null,
      escapeDay: st.verdict === 'ESCAPE' ? st.day : null,
      ipUnspent: st.investigator.intel,
      spUnspent: st.fugitive.stamina,
      probes,
      probeHits,
      stakeoutPlacements: placements,
      probeMassSum: ipol.stats.probeMassSum,
      stakeoutMassSum: ipol.stats.stakeoutMassSum,
      capBlocks: ipol.stats.capBlocks,
    },
    state: st,
    session,
  };
}

export function runPairCase(
  vm: ValidatedMap,
  gc: GeneratedCase,
  fPolicyName: FugitivePolicyName,
  iPolicyName: InvestigatorPolicyName,
  opts: RunOptions = {},
): CaseOutcome {
  return runCaseFull(vm, gc, fPolicyName, iPolicyName, opts).outcome;
}

/* ----------------------------------------------------------- aggregation */

export interface PairAggregate {
  pair: string;
  n: number;
  invWins: number;
  captureWins: number;
  expiryWins: number;
  fugWins: number;
  invWinRate: number;
  invWilson95: [number, number];
  fugWinRate: number;
  fugWilson95: [number, number];
  captureDayHist: Record<string, number>;
  escapeDayHist: Record<string, number>;
  meanCaptureDay: number | null;
  meanEscapeDay: number | null;
  meanEndDay: number;
  meanIpUnspent: number;
  meanSpUnspent: number;
  probes: number;
  probeHits: number;
  probeHitRate: number | null;
  probeMassAtTarget: number | null;
  uniformProbeChance: number;
  stakeouts: number;
  /** All captures are stakeout captures (§5.1: probes never capture). */
  stakeoutHitRate: number | null;
  stakeoutMassAtPlacement: number | null;
  capBlocksPerCase: number;
}

export function aggregateOutcomes(pair: string, outcomes: CaseOutcome[], nodeCount: number): PairAggregate {
  const n = outcomes.length;
  let invWins = 0;
  let captureWins = 0;
  let expiryWins = 0;
  let fugWins = 0;
  let capDaySum = 0;
  let capDays = 0;
  let escDaySum = 0;
  let escDays = 0;
  let endDaySum = 0;
  let ipSum = 0;
  let spSum = 0;
  let probes = 0;
  let probeHits = 0;
  let placements = 0;
  let probeMassSum = 0;
  let probeMassN = 0;
  let stakeoutMassSum = 0;
  let stakeoutMassN = 0;
  let capBlocks = 0;
  const captureDayHist: Record<string, number> = {};
  const escapeDayHist: Record<string, number> = {};

  for (const o of outcomes) {
    if (o.winner === 'INVESTIGATOR') {
      invWins += 1;
      if (o.verdict === 'CAPTURE') {
        captureWins += 1;
        captureDayHist[String(o.captureDay)] = (captureDayHist[String(o.captureDay)] ?? 0) + 1;
        capDaySum += o.captureDay!;
        capDays += 1;
      } else if (o.verdict === 'EXPIRY') {
        expiryWins += 1;
      }
    } else if (o.winner === 'FUGITIVE') {
      fugWins += 1;
      escapeDayHist[String(o.escapeDay)] = (escapeDayHist[String(o.escapeDay)] ?? 0) + 1;
      escDaySum += o.escapeDay!;
      escDays += 1;
    }
    endDaySum += o.endDay;
    ipSum += o.ipUnspent;
    spSum += o.spUnspent;
    probes += o.probes;
    probeHits += o.probeHits;
    placements += o.stakeoutPlacements;
    if (o.probeMassSum !== null) {
      probeMassSum += o.probeMassSum;
      probeMassN += 1;
    }
    if (o.stakeoutMassSum !== null) {
      stakeoutMassSum += o.stakeoutMassSum;
      stakeoutMassN += 1;
    }
    capBlocks += o.capBlocks;
  }

  const mean = (s: number, c: number): number | null => (c > 0 ? s / c : null);
  return {
    pair,
    n,
    invWins,
    captureWins,
    expiryWins,
    fugWins,
    invWinRate: n > 0 ? invWins / n : 0,
    invWilson95: wilson95(invWins, n),
    fugWinRate: n > 0 ? fugWins / n : 0,
    fugWilson95: wilson95(fugWins, n),
    captureDayHist,
    escapeDayHist,
    meanCaptureDay: mean(capDaySum, capDays),
    meanEscapeDay: mean(escDaySum, escDays),
    meanEndDay: n > 0 ? endDaySum / n : 0,
    meanIpUnspent: n > 0 ? ipSum / n : 0,
    meanSpUnspent: n > 0 ? spSum / n : 0,
    probes,
    probeHits,
    probeHitRate: probes > 0 ? probeHits / probes : null,
    probeMassAtTarget: probeMassN > 0 && probes > 0 ? probeMassSum / probes : null,
    uniformProbeChance: 1 / nodeCount,
    stakeouts: placements,
    stakeoutHitRate: placements > 0 ? captureWins / placements : null,
    stakeoutMassAtPlacement: stakeoutMassN > 0 && placements > 0 ? stakeoutMassSum / placements : null,
    capBlocksPerCase: n > 0 ? capBlocks / n : 0,
  };
}

/* --------------------------------------------------------- matrix runner */

export type PolicyPair = readonly [FugitivePolicyName, InvestigatorPolicyName];

export interface MatrixCell {
  rows: PairAggregate[];
  /** Wall-clock seconds for the cell's case runs (performance evidence). */
  seconds: number;
  casesRun: number;
}

/** Run the pair matrix over a shared case list (CRN convention). */
export function runMatrix(
  vm: ValidatedMap,
  cases: GeneratedCase[],
  pairs: readonly PolicyPair[],
  opts: RunOptions = {},
): MatrixCell {
  const t0 = process.hrtime.bigint();
  const rows: PairAggregate[] = [];
  let casesRun = 0;
  for (const [f, i] of pairs) {
    const outcomes: CaseOutcome[] = [];
    for (const gc of cases) {
      outcomes.push(runPairCase(vm, gc, f, i, opts));
      casesRun += 1;
    }
    rows.push(aggregateOutcomes(`${f}×${i}`, outcomes, vm.map.nodes.length));
  }
  const seconds = Number(process.hrtime.bigint() - t0) / 1e9;
  return { rows, seconds, casesRun };
}

/* -------------------------------------------------------- case list utils */

/** Seeded case list, seeds 1..n (CRN convention). */
export function generateCaseList(
  vm: ValidatedMap,
  n: number,
  shape: { days?: number; band?: readonly [number, number] } = {},
): GeneratedCase[] {
  const out: GeneratedCase[] = [];
  for (let s = 1; s <= n; s++) out.push(generateCase(vm, s, shape));
  return out;
}

/* ------------------------------------------------------ determinism check */

export interface DeterminismResult {
  seeds: number;
  pairs: readonly string[];
  mismatches: Array<{ seed: number; pair: string; digestA: number; digestB: number }>;
  seconds: number;
  casesRun: number;
  /** A stable digest sample (first seed, first pair) for the report. */
  sampleDigest: number | null;
}

/** Full-transcript digest: verdict + day + final ledgers + BOTH event logs
 *  + the §8.6 route. Byte-level determinism evidence. */
function transcriptDigest(run: FullCaseResult): number {
  const st = run.state;
  const route = run.session.disclosure().fugitive_route;
  return fnv1a32(JSON.stringify({
    v: st.verdict,
    d: st.day,
    f: [st.fugitive.position, st.fugitive.stamina, st.fugitive.holds_used, st.fugitive.drops_collected],
    i: [st.investigator.intel, st.investigator.probes_today, st.investigator.stakeout_armed],
    log: st.log,
    plog: st.private_log_investigator,
    route: route.map((r) => [r.day, r.action.kind, r.from, r.to, r.edge_class, r.sp_cost]),
  }));
}

/** Run each (seed × pair) TWICE with fresh sessions/policies; require
 *  byte-identical transcripts (rules-header determinism guarantee,
 *  executable at sim scale). Random-policy streams are keyed by run inputs,
 *  so both passes must land on identical digests. */
export function determinismCheck(
  vm: ValidatedMap,
  seeds: number,
  pairs: readonly PolicyPair[],
  opts: RunOptions = {},
): DeterminismResult {
  const t0 = process.hrtime.bigint();
  const mismatches: DeterminismResult['mismatches'] = [];
  let sampleDigest: number | null = null;
  let casesRun = 0;

  for (const [f, i] of pairs) {
    for (let seed = 1; seed <= seeds; seed++) {
      const gcA = generateCase(vm, seed);
      const gcB = generateCase(vm, seed);
      const runA = runCaseFull(vm, gcA, f, i, opts);
      const runB = runCaseFull(vm, gcB, f, i, opts);
      casesRun += 2;
      const dA = transcriptDigest(runA);
      const dB = transcriptDigest(runB);
      if (sampleDigest === null) sampleDigest = dA;
      if (dA !== dB) mismatches.push({ seed, pair: `${f}×${i}`, digestA: dA, digestB: dB });
    }
  }
  const seconds = Number(process.hrtime.bigint() - t0) / 1e9;
  return { seeds, pairs: pairs.map(([f, i]) => `${f}×${i}`), mismatches, seconds, casesRun, sampleDigest };
}
