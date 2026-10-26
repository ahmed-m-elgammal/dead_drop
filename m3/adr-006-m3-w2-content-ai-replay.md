# ADR-006 — M3 W2: archetypes as seeded blends, dist-resolved engine, replay-from-journal history, scripted tutorial

**Status:** accepted (2026-10-26) · **Scope:** M3 Week 2 (roadmap tasks 2/3/5) · **Supersedes:** nothing · **Companion:** `adr-005-m3-w1-web.md`, `m3/M3-execution-plan.md`

## Context

W1 shipped the playable solo loop (Investigator vs Stage-1 baseline) with the sandbox lift carrying the verified runtime. W2's pre-registered scope: Fugitive archetypes + difficulty select, the 24-case ladder (S7), IndexedDB history + replay viewer (S6), tutorial beats 1–3, and CI that makes the repo the buildable source of truth (retiring the lift's build role).

## Decisions

### D1 — Archetypes are selection policies over the W1 candidate list (05-ai-spec §3, verbatim knobs)

`lib/dd/archetypes.ts` keeps `planFugitiveDay()` (W1's exact-feasibility-filtered move list) as the shared candidate source and adds a per-archetype SELECTION layer: `route_entropy` → seeded uniform over feasible candidates; `slack_use` → appetite for widest-reach detours (max SP cost, falling back to HOLD); otherwise argmax of a blended score = W1 belief-distance + `deception` × (off-belief + revealed-district re-cross bonuses) − `caution` × (hot-zone penalty from the last two days of PUBLIC events). Feasibility is never traded away: if no candidate completes the case, the domain falls back to all candidates (a doomed fugitive plays on). Blends are the spec's fixed MVP table (Random 1/0/0/0 · Cautious .3/.1/.8/.5 · Deceptive .5/.8/.3/.9). `baseline` remains the pure W1 planner.

- **Anti-cheat parity (normative) holds by signature:** the archetype layer receives the FUGITIVE VIEW only; `caution` reads the public log (drop sites + revealed districts), never private state. The wall is the type, same as W1.
- **Reproducibility (05-ai-spec §7) holds by construction:** all stochastic draws come from a per-day `mulberry32` stream keyed `(case seed, archetype salt, day)` — no `Math.random`, no wall-clock. The case's identity expands to **(seed + archetype + investigator journal)** and replay is bit-exact (browser-verified: identical public log after reload+resume; tutorial case replays through history identically).

### D2 — The ladder is one fixed engine-built set; difficulty is a tier ramp

`buildLadder(VM, 20261026, 24)` (the M2 C6 generator — diversity-constrained, deterministic) is consumed as-is. Tier ramp: cases 1–8 Random (Teaching) · 9–16 Cautious (Sharp) · 17–24 Deceptive (Boss). The ramp doubles as the measurement frame for the §3 hypothesis (probes-per-capture monotonic Random < Cautious < Deceptive, measured at M4). Stars are a local proxy (3★ = capture with ≥4 IP left, 2★ capture, 1★ expiry, 0★ otherwise) stored in localStorage — no accounts, no server (roadmap §0 fence).

### D3 — History = IndexedDB of (seed + archetype + journal); the replay is REBUILT, never snapshotted

Closed cases archive to IndexedDB (`dead-drop`/`cases`). The §8.6 replay viewer builds a fresh `CaseSession`, replays the journal through the SAME day-runner (`runDays`) with the same archetype streams, and shows `disclosure()` — the engine object, not a re-derivation. One day-runner (`runDays(..., { scripted })`) is shared by the live store, resume-replay, and history-rebuild, with the tutorial's scripted controller as the only alternative path. A journal that doesn't reach a verdict throws (`NOT_OVER` surfaced in the history dialog) — corrupt rows can't render a fabricated story.

### D4 — Tutorial = fixed seed 6 + scripted Fugitive + beat gating in the store

Beats 1–3 (06-uiux §3) run on **seed 6** (found offline against the real generator: safehouse D3-06, drop[0] D2-06 adjacent via Metro, drop[1]/gate non-adjacent — the script reads as "caught in the act"). Day 1 the script HOLDs (probe-the-safehouse beat guarantees a HIT); day 2 it walks onto drop[0], ending in the day-2 step-2 stakeout check → CAPTURE. Beat gating lives in the store's `select/probe/stakeout/endPhase` (the spotlight is the auto-selected node + forced mode; the coach bar names the target); the verdict beat introduces the replay overlay. Guardrails per spec: no forfeit (abandon hidden), fixed outcomes, completion flag unlocks the "Tutorial again" label.

### D5 — The repo is now the buildable source of truth: engine dist is the client's dependency surface

The W1 sandbox lift exposed a resolution gap the W1 sync couldn't see: apps/web's tsconfig path mapped `@dead-drop/engine` to engine **src**, whose Node16 `.js` import specifiers Turbopack cannot resolve. W2 resolves the package as a BUILT workspace dependency: `exports` → `packages/engine/dist` (plain ESM), the tsconfig path pins **types** (`dist/index.d.ts`) only, `transpilePackages` is dropped, and CI encodes the order (engine `tsc` → vitest → web lint → `next build`). Consequences:

- the sync script (`scripts/m3_w1_sync_web.sh`) rewrites **every** `@/engine` form (`from` and `import()` — the W1 script missed the latter, which is how the gap survived W1), and copies only the app source + the five UI primitives the app uses;
- the UI template surface is pruned to button/input/badge/scroll-area/sonner (+ utils), with `@types/react` pinned 19.2.8 in apps/web — smaller dependency surface, no template version-skew;
- the route opts out of prerender (`dynamic = 'force-dynamic'` in the server layout): the app is a stateful offline-first client (07-architecture Option B), and build-time prerender has no honest work to do;
- the sandbox remains the interactive verification host (dev server + agent-browser), but nothing in the repo depends on it. The verified sync is one-way sandbox → repo, as in W1.

## Consequences

- W3 inherits: fugitive-side case screen (S2) + `I-GreedyProbe` baseline for solo Fugitive; skill measurement (05-ai-spec §4) can read the same IndexedDB history; PWA shell (W4) can cache the now-cleanly-buildable app.
- The archetype knobs are DATA in `ARCHETYPES` — the M4 hypothesis test and the post-MVP adaptive director (05-ai-spec §5) can re-blend without touching selection logic.
- Determinism now spans four consumers (engine tests, sim harness, W1 replay, W2 archetypes) — one property, verified at every layer.

## Verification record (W2)

Engine suite unchanged: 148/148 green (zero engine edits — `buildLadder` already existed from M2 C6). Sandbox `tsc --noEmit` + `eslint .` green. Browser E2E (agent-browser): tutorial beats 1–3 full run → scripted CAPTURE → replay intro; replay viewer scrubber + close from both entry points (verdict card, history); history list → replay → delete; ladder grid (24 slots, tier ramp verified 8/8/8) → ladder case opens with the right archetype; Random-archetype case: probe MISS recorded privately, D3 district reveal + drop completion in evidence log, belief halo renders; Deceptive-archetype case: two AI days clean; determinism: reload+resume reproduces the public log bit-for-bit; zero console errors. Repo space: `npm ci` → engine+sim build → 148/148 vitest → web lint → **`next build` green** (the W1 gap closed).

One real bug found and fixed in-loop: the tutorial's replay overlay rendered *beneath* the beat modal (nested fixed stacking) — the modal now yields while the replay is open; and the history rebuild initially re-ran the archetype planner over the scripted tutorial journal (diverging → `NOT_OVER`), fixed by the shared `runDays` scripted switch (D3).
