# ADR-005 — M3 W1: apps/web on the real engine, F-Planner W1 shape, replay-as-persistence

**Status:** accepted (2026-10-26) · **Scope:** M3 Week 1 (roadmap task 1 + parts of 2/3) · **Supersedes:** nothing · **Companion:** `m3/M3-execution-plan.md`

## Context

M2 closed with `engine@1.0.0-alpha.0` (G1 signed off). M3 is the playable single-player prototype (10-roadmap M3: web PWA, tutorial + 24-case ladder, AI stages 1–2). Week 1 must produce a playable end-to-end loop and set production-grade foundations — without re-implementing a single rule outside the engine, and without touching the frozen ruleset (`1.0.0-alpha.1`) or the M1 human-session path.

## Decisions

### D1 — The client drives `CaseSession` directly; zero rules in the UI

The solo client instantiates `CaseSession(vm, config)` and submits through the public API only (`submitFugitive` / `submitInvestigator` / `resolveStranded` / `endInvestigatorPhase`). The UI renders `investigatorView()` and never touches `state.fugitive` — the §1.3 information wall is enforced by the engine's types (T2), not by UI discipline. §9.13 stranding follows the engine's designed contract: submissions throw `STRANDED_NO_ACTION`, the caller invokes `resolveStranded()`.

### D2 — Stage-1 AI `F-Planner` (05-ai-spec §2) as a pure client-side module

Deterministic, no RNG. Per-day greedy over one-move horizons; every candidate filtered by an exact mid-case completion search (drops in order → gate, memoized over position × drops × SP × days); scored by min graph-distance from the rules-mechanical belief candidate set expanded to the current day; total-order tie-break (feasible > score > lower SP > node id; HOLD last). The belief model is the SAME public-channel bookkeeping the player's optional "belief halo" uses (`lib/dd/belief.ts`) — one implementation, structurally incapable of reading the Investigator's private log (the signature takes `FugitiveView`). This is the registered W1 approximation of "compute all feasible routes"; archetype blends (Random/Cautious/Deceptive) and the exact-Bayesian filter remain W2+ per 05-ai-spec staging.

### D3 — A case IS (seed + investigator journal); persistence = deterministic replay

`localStorage` holds `{seed, investigator: ActionEnvelope[]}`. On reload the session is rebuilt by replaying the journal through a fresh `CaseSession` and re-running the AI between entries — legal because both the engine and F-Planner are pure/deterministic (rules §1 determinism guarantee; 05-ai-spec §7 reproducibility). Fugitive moves are NOT journaled. This is the architecture doc's "the case is the action list + config (replayable)" pattern, live from W1; IndexedDB + full replay viewer (roadmap task 5) upgrade the storage, not the model.

### D4 — Repo home vs sandbox host

- **Canonical source:** `apps/web` in this monorepo (07-architecture Option B), consuming `@dead-drop/engine` as a workspace package (`transpilePackages` + tsconfig path for typecheck; root workspaces now include `apps/*`).
- **Verified runtime (W1):** the sandbox Next.js dev host, which cannot resolve workspace packages — it carries a verbatim engine lift under `src/engine` (import extensions adapted to bundler resolution; provenance banner pins the sync source commit `5958018`). The lift is a sandbox adaptation, NOT a fork: `apps/web` never imports it, and W2 adds the CI job that makes the repo the buildable source of truth (root `npm install` + `next build` in CI).
- Sync direction is one-way (sandbox → `apps/web`) with the single intentional diff: `@/engine` → `@dead-drop/engine`.

### D5 — Map: paper-map geometry, vector, fixed layout

`lib/dd/geometry.ts` ports the paper kit's ring math (12 nodes/district on a ring, hub node 06 rotated to face the canvas center, glyph-coded pools) to a portrait web viewBox (760×1000). No art pass, no procedural layout — the roadmap's M3 risk note (renderer scope creep) is respected by reusing the M1-validated layout as-is.

### D6 — UI scope line for W1 (06-uiux mapping)

Shipped: S3 (Investigator case screen: map, action bar with probe / hold-to-confirm stakeout + §5.2 line / end phase, IP gauge, evidence log with private-flagged entries), belief markers (three-state, local-only; tap-to-select + marker buttons as the W1 adaptation of the three-tap cycle), S6 lite (verdict card with §8.6 route + evidence replay and the "what you missed" beat), S1-lite setup screen (seed-reproducible case, briefing). Not shipped (later Ws): tutorial S0, fugitive-side S2, ladder S7, settings S9, assist heatmap, IndexedDB, analytics.

## Consequences

- Solo play is fully client-side and offline-capable — no server, no accounts (roadmap MVP fence respected).
- The engine gains its fourth consumer class (client UI) with zero engine changes; default resolution path untouched.
- W2 inherits: archetype blends + difficulty select, IndexedDB + replay viewer, tutorial beat 1–3, CI build for apps/web, and the belief-halo/indicator polish pass.

## Verification record (W1)

Browser-verified end-to-end (agent-browser): setup → probe HIT/MISS toasts → markers → day advance with AI moves → D3 district reveal → hold-to-confirm stakeout → silent miss recorded → Day-8 stakeout ban surfaced (§9.3) → verdict ESCAPE with route replay showing a 12/12-SP exact-budget escape (feasibility search correct) → reload-resume via journal replay. Lint green; no console errors.
