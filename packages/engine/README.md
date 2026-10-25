# @dead-drop/engine — Rules Engine Package

**Version:** 0.2.0-alpha.0 · **Status:** M2 W2 **functionally complete** — `resolve()` implemented
(DRAFT-UNFREEZE per ADR-002, `../../m2/adr-002-resolve-unlock.md`), pending M1-freeze transcript
reconciliation · **Ruleset:** `1.0.0-alpha.1` · **Runtime deps: none** · Toolchain: ADR-001
(`../../m2/adr-001-toolchain.md`) · Plan: `../../m2/M2-execution-plan.md` §1 W2.

Pure, deterministic TypeScript engine for Dead Drop. The rules text
(`../../03-rules.md`) is the spec: if code and text disagree, the text wins and the
discrepancy is a finding. No RNG in resolution; the only randomness is the seeded
generator. This package never reads the network, the clock, or the filesystem at runtime.

## Scope — what exists here now, and what deliberately does not

| In the package (verified) | Deliberately absent (gated) |
|---|---|
| Type layer lifted from the M1 spec + **T12 amendment** (`src/types.ts`) | UI, networking, persistence (M3+; fenced out by `m1/m2-handoff.md` §4) |
| Map loading + structural validation (`src/map.ts`) | Belief/heatmap — UI/AI layer by design (T10) |
| The PINNED case-config feasibility gate, 1:1 port of the Python oracle (`src/feasibility.ts`) | Async-clock/forfeit layer — §7 is server territory; the engine exposes `forfeit()`/`voidCase()` only for §6 totality |
| Seeded case generator: C1 sampling, C5 reports, C6 batching, §9.8 asserts (`src/generator.ts`) | Simulation harness + scripted policies (W3, `m2/M2-execution-plan.md` §1 W3) |
| **`resolve()` — the §2 seven-step day resolution** (`src/engine.ts`): phases, §3 legality, §4 evidence, §5 actions, §6 verdicts via `VERDICT_WINNER`, §9.1–9.13 predicates, §9.10 idempotency, §8.6 disclosure, scripted driver | |
| L1 fixtures emitted by the Python oracle (`fixtures/`) | |

## Layout

```
packages/engine/
  src/types.ts         M1 lift + provenance banner + T12 amendment (FugitiveRouteEntry)
  src/map.ts           CityMap validation: structure gates, derived pool flags (T11), parallel-edge report
  src/feasibility.ts   C2 BFS · cheapest-drop-2 Dijkstra · backward/forward DPs · C3-A prefixes · case-gate C4
  src/generator.ts     mulberry32 PRNG · seeded C1 rejection sampling · C5 report · C6 batch diversity
  src/engine.ts        resolve(): CaseSession (interactive, idempotent) + runScriptedCase (pure driver)
  src/index.ts         public surface
  fixtures/            L1 acceptance data — emitted by tools/verification/dd_m2_emit_fixtures.py
  test/                vitest suites: L1 map/regression/configs · L2 generator · L3 resolve golden + properties
  test/micro-map.ts    SYNTHETIC 6-node test fixture (not game content) making every §9 ruling reachable
```

## `resolve()` at a glance (ADR-002 — DRAFT-UNFREEZE)

- **Two entry styles, one core:** `CaseSession` (phase-gated, §9.10 idempotency journal, role
  views, §8.6 disclosure) for the future M3 server; `runScriptedCase` (config + day-script ⇒
  outcome) for tests and the W3 harness. Property test proves both land on identical disclosures.
- **Golden anchoring:** rules §10 worked examples W1/W2/W3 (IP/SP ledgers, event order, silent
  miss discipline) and all four M1 regression constants escape end-to-end on min-days routes;
  plus a seed→generator→scripted-escape chain closing the W2 exit line.
- **§9 coverage:** 9.1/9.2 rejection (never clamped), 9.3 day-8 stakeout ban, 9.4 day-8 probe
  legality, 9.5 gate-before-drops, 9.6 capture-by-Hold, 9.7 no-movement reveal, 9.8 config
  validation, 9.10 cross-phase idempotent retry, 9.12 version pinning, 9.13 stranding (general
  condition, not just 0 SP).
- **Conventions pinned at implementation (registered, never silent):** T12 route `edge_class:
  null` for Holds · T13 district-before-transit on coinciding reveal days · T14 the S1 AUD-004
  engineered state was unreachable (triage-log M2-001; white-box test pins the real check) ·
  T15 parallel-edge moves resolve minimal-SP. See `m1/engine-types/README.md` §2.

## Fixture provenance (the audit chain)

```
assets/sample_map_alpha.json (v1.2.0)
  └─ tools/verification/dd_m2_emit_fixtures.py   (Python oracle machinery, cross-asserted)
       └─ fixtures/valid-configs.json            115 configs + measured gate values
          fixtures/regression-cases.json         P1 6d/5SP · P2 6d/6SP · P3 6d/7SP · canonical 7d/6SP
```

The emitter hard-fails unless its 115-config pass set is **identical** to the independent
M2-W1 recount (`tools/verification/m2_aud003_recount_results.json`). The engine's L1 suite
then asserts the **TS** gate reproduces every fixture record exactly over the full 2,208-space.
Two independent languages, one answer — the same reconciliation discipline as M1 W1.

## Verify

```bash
npm install          # workspace root (devDeps only; engine itself has zero deps)
npm run typecheck    # tsc --noEmit, strict + noUncheckedIndexedAccess
npm test             # vitest: 63 tests — L1 map/constants/115-reconciliation · L2 generator · L3 resolve
```

Latest recorded run (2026-10-25, W2 closure): **typecheck green · 63/63 green** (the 115-config
reconciliation evaluates the whole 2,208-space in <1s; the W2-exit chain runs five generated
seeds through generator → min-days route → scripted verdict).

## Documented divergences (never silently patched)

1. `MAP_VERSION_ALPHA` in the lifted types is the draft-time snapshot (`1.0.0`); the canonical
   asset is **v1.2.0** (pool 16→24, adopted M2 W1 lever). Runtime reads `map.version` from the
   loaded asset — the const is informational only. (Registered as part of T11,
   `m1/engine-types/README.md`.)
2. The JSON declares pools as arrays; `CityMapNode.is_*` flags are derived at load time
   (`src/map.ts`). (T11.)
3. The M1 file header says "no package.json / not compiled anywhere" — true of the M1 *artifact*,
   superseded for this engine copy by the user-authorized M2 W2 pre-flight (ADR-001 §Consequences).
   The M1 file itself remains untouched.
4. The Python oracle fixes SP=12 / days=8 as module constants; this port reads them from
   `PARAMETERS_V1_0_0_ALPHA_1`. Values currently agree; the fixture equality tests make any
   future drift fail loudly instead of drifting silently.
5. **T12 amendment:** `CaseEndDisclosure.fugitive_route[].edge_class` is `EdgeClass | null` in the
   ENGINE copy (Holds traverse no edge — the M1 draft demanded an impossible value); `sp_cost: 0`
   marks FORCED_HOLD days. The M1 artifact keeps its original shape.
6. **ADR-002 DRAFT-UNFREEZE:** `resolve()` implements the committed rules text but is not
   play-validated until the M1 freeze reconciliation gate (freeze-checklist §1) passes on real
   S1–S3 transcripts. No session data exists in this package.
