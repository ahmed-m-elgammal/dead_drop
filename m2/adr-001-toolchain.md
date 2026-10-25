# ADR-001 — M2 Engine Toolchain (Node/TypeScript) and Package Layout

**Status:** Accepted · **Date:** 2026-10-25 · **Scope:** M2 Week-2 pre-flight (m2/M2-execution-plan.md
§1 W2 gate, second bullet — user-authorized session) · **Supersedes:** nothing (first toolchain ADR;
complements the toolchain *rationale* already in 07-architecture).

## Context

M2 builds a pure deterministic engine package (`10-roadmap` M2 task 1) as the artifact four later
milestones consume. The plan's W2 gate explicitly scoped "standing up Node + a TS toolchain (and
deciding package layout `packages/engine`)" as a Week-2 pre-flight. The M1 type draft
(`m1/engine-types/dead-drop.types.ts`) is plain erasable-syntax TypeScript (no enums, no
namespaces, no functions) written to be lifted verbatim. The environment verified for this
decision: **Node v24.21.0, npm 11.19.0 present**; no pnpm, no global tsc. Verification scripts
remain pure-Python-stdlib by standing project constraint and act as the **independent oracle**
(`tools/verification/README.md` — M2 reuse contract).

## Decision

| Dimension | Decision | Rationale |
|---|---|---|
| Runtime | **Node.js ≥ 22.14 (v24 LTS line)** — verified on v24.21.0 | Current LTS; ESM-native; matches 07-architecture's server-side TS choice |
| Language | **TypeScript ~5.9, `strict` + `noUncheckedIndexedAccess`, ESM with `NodeNext`** resolution | Library-first defaults; the engine is consumed later by a Next.js client (M3) and a headless harness (W3) — NodeNext works for both |
| Layout | **npm workspaces, `packages/*`** (`packages/engine` first) | npm 11 present → zero extra global tooling; pnpm re-evaluated if the workspace grows past ~3 packages |
| Test runner | **vitest 3** (devDependency at workspace root) | TS-native, fast; L2 property tests (09-testing §2) land in W2 proper |
| Type gate | **`tsc --noEmit -p packages/engine`** must pass before any push | The engine's correctness story is "reproduces the Python oracle" — a type-checked port makes that claim meaningful |
| Engine runtime deps | **Zero.** All dev tooling lives at the workspace root | 03-rules needs no libraries; determinism + auditability favor no-dependency |
| Data-fixtures flow | Python oracle emits JSON fixtures **into the package** (`packages/engine/fixtures/`), cross-asserted at emit time; TS tests assert equality | Dual-language reconciliation: two independent implementations, one answer (the W1 reconciliation pattern, now standing) |
| Verification scripts | Stay **pure Python stdlib**, byte-faithful where published | `tools/verification/README.md` constraints unchanged |

Versions locked this session: typescript **5.9.3**, vitest **3.2.7**, @types/node (workspace root
devDeps only; `@dead-drop/engine` declares no dependencies). esbuild's postinstall was approved
for the workspace (`npm install-scripts approve esbuild`) — vitest needs its platform binary.

## Alternatives considered

- **pnpm workspaces** — marginally faster installs; rejected for now (not installed; no
  workspace scale yet). Recorded as the first thing to revisit if `packages/` grows to
  app + server + shared.
- **`node:test` native runner (zero devDeps)** — viable fallback (Node 24 runs erasable TS
  natively), but vitest's matcher/property ergonomics are what the L2 suite wants; accepted the
  two devDeps instead.
- **Single-package repo (no workspaces)** — cheaper now, wrong at M3 when the client arrives;
  moving to workspaces later costs more than starting there.
- **Porting the oracle to TS and deleting Python** — rejected outright: the Python oracle's
  independence is the point (reconciliation across languages and codebases is the regression
  story, per `m1/w1-rules-audit.md` §6 evidence discipline).

## Consequences

- `npm install` at the repo root is now part of the dev workflow (node_modules gitignored).
- CI/pre-push gate: `npm run typecheck && npm test`.
- Engine code reads parameters from `PARAMETERS_V1_0_0_ALPHA_1` (never hard-coded) — the
  fixture equality tests catch any accidental parameter drift (feasibility.ts header note).
- The M1 artifact's "no package.json / not compiled anywhere" scope guard is **superseded for
  the engine copy only** by this user-authorized pre-flight; `m1/engine-types/dead-drop.types.ts`
  itself remains untouched as a design artifact (provenance banner in the engine copy records this).
