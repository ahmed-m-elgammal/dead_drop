# @dead-drop/engine — Rules Engine Package

**Version:** 0.1.0-alpha.0 · **Status:** M2 W2 pre-flight **verified** (2026-10-25) ·
**Ruleset:** `1.0.0-alpha.1` · **Runtime deps: none** · Toolchain: ADR-001
(`../../m2/adr-001-toolchain.md`) · Plan: `../../m2/M2-execution-plan.md` §1 W2.

Pure, deterministic TypeScript engine for Dead Drop. The rules text
(`../../03-rules.md`) is the spec: if code and text disagree, the text wins and the
discrepancy is a finding. No RNG in resolution; the only randomness is the seeded
generator. This package never reads the network, the clock, or the filesystem at runtime.

## Scope — what exists here now, and what deliberately does not

| In the package (verified) | Deliberately absent (gated) |
|---|---|
| Verbatim type layer lifted from the M1 spec (`src/types.ts`) | **`resolve()`** — the §2 seven-step day resolution. Freeze-gated: waits for the M1 freeze tag (`m1-freeze-<version>`, `m1/freeze-checklist.md` §2). This is the ONLY W2 item still blocked. |
| Map loading + structural validation (`src/map.ts`) | UI, networking, persistence (M3+; fenced out by `m1/m2-handoff.md` §4) |
| The PINNED case-config feasibility gate, 1:1 port of the Python oracle (`src/feasibility.ts`) | L2 resolve()-based properties (T2 info-wall, T9 stakeout consumption) — queued with resolve() |
| Seeded case generator: C1 sampling, C5 reports, C6 batching, §9.8 asserts (`src/generator.ts`) | Simulation harness + policies (W3) |
| L1 fixtures emitted by the Python oracle (`fixtures/`) | |

## Layout

```
packages/engine/
  src/types.ts         verbatim lift of m1/engine-types/dead-drop.types.ts (+ provenance banner)
  src/map.ts           CityMap validation: structure gates, derived pool flags (T11), parallel-edge report
  src/feasibility.ts   C2 BFS · cheapest-drop-2 Dijkstra · backward/forward DPs · C3-A prefixes · case-gate C4
  src/generator.ts     mulberry32 PRNG · seeded C1 rejection sampling · C5 report · C6 batch diversity
  src/index.ts         public surface
  fixtures/            L1 acceptance data — emitted by tools/verification/dd_m2_emit_fixtures.py
  test/                vitest suites (L1 map/regression/configs + L2 generator)
```

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
npm test             # vitest: 21 tests — L1 map / constants / 115-reconciliation + L2 generator
```

Latest recorded run (2026-10-25): **typecheck green · 21/21 green** (the 115-config
reconciliation evaluates the whole 2,208-space in <1s).

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
