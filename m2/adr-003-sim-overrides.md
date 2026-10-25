# ADR-003 — Simulation Parameter Overrides (T16) and the Case-Shape Option

**Status:** Accepted · **Date:** 2026-10-25 · **Scope:** M2 Week 3 (m2/M2-execution-plan.md §1 W3)
· **Supersedes:** nothing · **Depends on:** ADR-001 (toolchain), ADR-002 (resolve() unlock).

## Context

M2 W3 must run scenarios S1–S7 (04-balance-sim §4.4). S1 (budgets) and S2 (reveal schedule) are
already per-case `CaseConfig` fields. But S4 (stakeout/probe pricing), S5 (hold economy), and S6
(case length) sweep parameters the engine reads from the frozen `PARAMETERS_V1_0_0_ALPHA_1` table
internally: P1 (days), P6 (hold cost/max), P7 (probe cost/cap), P8 (stakeout cost). Sweeping them
is the entire purpose of M2 simulation — the parameters are `[hypothesis]` rows — but the rules
engine's resolution must stay byte-identical to `1.0.0-alpha.1` for normal play (the whole
correctness story of M2 rests on that). Additionally, S6's shifted feasibility band (`[5, P1−1]`)
requires the *generator* to evaluate cases under a non-canonical P1/P12 pair.

## Decision

1. **Session-level, opt-in, validated parameter overrides** (`packages/engine/src/engine.ts`,
   registered as finding **T16** in `m1/engine-types/README.md`):
   - `SimParamOverrides` — six optional keys: `P1_days_per_case`, `P6_hold_cost`, `P6_hold_max`,
     `P7_probe_cost`, `P7_probe_daily_cap`, `P8_stakeout_cost`.
   - `resolveParams(overrides?)` merges onto a frozen `CANONICAL_PARAMS` snapshot and **fails
     loudly** (`CONFIG_INVALID`) on non-integers/negatives/P1 < 1.
   - `CaseSession(vm, config, { params })` (and `runScriptedCase(..., opts)`) accept it; every
     internal read of those parameters goes through `session.p`. `createCaseState`,
     `validateCaseConfig`, `fugitiveLegality`, `investigatorLegality`, `isStranded` take an
     optional trailing `params` (default canonical).
   - **CaseConfig stays pure rules-facing (§1.2)** — overrides are never carried in it.
   - **P2/P5/P11/P12 are not overridable** (structural/computed). P8's daily cap (1) is enforced
     structurally by the armed-stakeout slot, so only its COST is overridable (S4 sweeps cost —
     matches 04 §4.4).
   - Default path (no overrides) is byte-identical to `1.0.0-alpha.1`: proven by the unchanged
     63-test W2 suite + the 115-config full-space reconciliation, and pinned by new tests
     (`packages/engine/test/l3-params.test.ts`).
2. **Generator shape option** (`evaluateConfig(..., shape?)`, `generateCase(vm, seed, shape?)`):
   `{ days?, band? }` sweeps the P1/P12 pair for S6 (band shifted to `[5, P1−1]`); the C5
   feasibility report records `shape` **only** when non-canonical. Canonical calls omit it —
   C5 output shape unchanged for published cases.
3. **Legality helpers widened structurally**: `fugitiveLegality`/`isStranded` take
   `Pick<CaseState, 'fugitive'>`, `investigatorLegality` takes `Pick<CaseState, 'day' |
   'investigator'>` — so sim policies can call them with role views while the type system still
   forbids any investigator-side access to fugitive state.

## Consequences

- S1–S7 ran against the real engine with zero engine-behavior divergence from the ruleset
  (determinism double-run over 10k seeds: 0 mismatches).
- Every sim output row echoes the effective parameters it ran under (`w3-results/*.json`), keeping
  the "conventions named in outputs" requirement auditable.
- The M1 type artifact remains untouched; T16 is registered in the engine copy only (same
  discipline as T12).
- S1 convention: stamina/intel sweep as PLAYED budgets over the canonical case-shape pool — the
  generator's feasibility gate stays at P3=12, isolating budget effect from case-shape effect
  (recorded in `w3-results/sweeps.json` conventions).

## Alternatives considered

- **Mutable global parameter table** (monkey-patch `PARAMETERS_V1_0_0_ALPHA_1` per sweep): rejected
  — global mutable state, invisible in outputs, races with parallel test workers, and would make
  "the engine never mutates parameters" false.
- **Override fields inside CaseConfig**: rejected — pollutes the rules-facing §1.2 type and would
  flow into replays/disclosures as if it were case identity.
- **Threading P3 through the feasibility gate for S1**: rejected — the 115-config pass list is a
  committed M1/M2 artifact; re-gating per budget would confound budget effect with case-shape
  effect and invalidate the CRN design.
