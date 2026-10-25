# @dead-drop/sim — Simulation Harness Package

**Version:** 0.1.0-alpha.0 · **Status:** M2 W3 **executed** (2026-10-25) · **Ruleset:** `1.0.0-alpha.1`
(resolution defaults; sweep overrides per [../../m2/adr-003-sim-overrides.md](../../m2/adr-003-sim-overrides.md))
· **Runtime deps:** `@dead-drop/engine` only · Plan: [../../m2/M2-execution-plan.md](../../m2/M2-execution-plan.md) §1 W3.

Headless simulation harness for Dead Drop (04-balance-sim §4): seeded case generation, scripted
policy pairs, Wilson-CI aggregation, scenario sweeps S1–S7, and the determinism double-run. Pure
and deterministic — no RNG in resolution (the engine's guarantee is untouched); policy randomness
is seeded per (case seed, role, policy name).

**Policies are NOT rules.** They submit through `CaseSession` exactly like future clients and are
confined to role views by the type system (§1.3 wall, T2). Nothing here feeds back into the engine.

## Layout

```
packages/sim/
  src/belief.ts      BeliefTracker — exact Bayesian filter over (node, sp, drops, holds) from
                     role-visible events only; uniform-over-legal-actions transition prior;
                     per-day action-class metadata (transit reveals condition on it)
  src/policies.ts    the 5×4 scripted roster (04-balance-sim §4.2) + exact rule documentation
  src/harness.ts     case runner · Wilson 95% CIs · matrix runner (CRN) · determinism digests
  src/sweeps.ts      S1–S7 cell definitions + conventions
  src/cli.ts         matrix | sweeps | determinism | all  → JSON outputs
  test/              sim-belief (hand-computed posteriors) · sim-policies (legality/determinism)
                     · sim-harness (CRN, overrides, matrix smoke)
```

## Run

```bash
npm run build        # engine first (sim consumes its dist types), then sim
npm test             # vitest: engine 63+6 + sim suites
node packages/sim/dist/cli.js --mode all --n 1000 --sweep-n 500 --det-n 10000 --out m2/w3-results
```

Outputs (all with conventions echoed in `meta`): `matrix.json`, `sweeps.json`,
`s7-camping.json` (CLI addendum), `determinism.json`, `performance.json`.

## Policy contract (summary — full text in src/policies.ts)

- F-Beeline / F-Random / F-LeakAware / F-Deceptive / F-SlackBurner: feasibility-first route
  play; leak/deception express as tie-breaks at route parity; SlackBurner burns slack within
  feasibility; Random is the noise floor.
- I-GreedyProbe / I-Calendar: exact belief tracking; probe the current argmax; stake the
  PREDICTIVE argmax gated at current mass ≥ 0.4; Calendar adds the day-5 IP reserve and forced
  endgame stakes.
- I-Aggressive: camps public objectives (the degenerate probe, S7). I-Random: uniform legal floor.
- Investigator policies instrument probe-cap binding (Q4) and stakeout predictive mass
  (calibration, 04 §4.5).

## Recorded W3 results

See [../../m2/w3-simulation-report.md](../../m2/w3-simulation-report.md): 20-pair matrix,
S1–S7 sweeps, Q1/Q4 readouts, §4.5 scorecard (band FAIL / dominance FAIL / pacing FAIL /
calibration PASS → W4 retune list), determinism 10k seeds × 3 pairs double-run: 0 mismatches.
