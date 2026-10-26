# 05 — AI Specification

**Status:** design spec, pre-implementation. AI behavior is staged: each stage is buildable and testable independently, and the MVP requires only stages 1–3. Ranked play uses **no adaptive AI** — ranked is human-only; the AI exists in solo (both roles) and as a sparring/testing tool in simulation.

## 1. Staging overview

| Stage | Component | Mode | MVP? |
|---|---|---|---|
| 1 | Deterministic baseline Fugitive AI + baseline Investigator AI | Solo, tutorial | **Yes** |
| 2 | Fugitive archetypes: Random / Cautious / Deceptive (parameterized) | Solo ladder | **Yes** |
| 3 | Player-skill measurement (both roles) | Solo | **Yes** (measurement only) |
| 4 | Adaptive difficulty director (solo-only) | Solo | Post-MVP (M4+) |
| 5 | Stronger Investigator AI (belief-state planner) | Solo (Fugitive-side practice) | Post-MVP |
| 6 | Anti-exploit hardening (AI policy diversity checks) | Sim harness | Continuous |

Rationale: the solo *Investigator* experience (hunt an AI Fugitive) is the MVP's heart; the solo *Fugitive* experience can ship with a simple baseline AI and improve later (stage 5), because human Fugitives are the real draw once MP arrives.

## 2. Stage 1 — Deterministic baseline

**Fugitive baseline `F-Planner`:** deterministic, explainable route policy: compute all feasible completion routes (BFS, as in the generator), pick the one maximizing minimum distance-from-Investigator's-belief-mode (approximated by recent public reveal constraints), tie-break by lowest stamina cost. No randomness. Purpose: tutorial Fugitive ("The Vermeer Slip" uses a scripted variant that makes one detectable mistake — leaves Old Town the day before a district reveal) and the simulation harness's backbone.

**Investigator baseline `I-GreedyProbe`:** as specified in 04-balance-sim §4.2 — probes the modal node of a tracked belief distribution; stakes only when the posterior maximum ≥ 0.4 and remaining days ≤ 4; otherwise saves. Purpose: tutorial Investigator opponent and floor-strength sparring.

Both are pure functions of the public case state — same inputs, same outputs, no hidden reads of the opponent's state (anti-cheat parity: the AI must obey the same information walls as humans).

> **Implemented (M3 W3, ADR-007):** the web app runs a verbatim port of the sim's measured `I-GreedyProbe` (mass-only stakeout gate + predictive argmax — the recorded policy; the ≤4-days clause above was never in the measured code and is deferred to the M4 AI-spec reconciliation). Parity is enforced by `packages/sim/test/w3-webport-parity.test.ts`.

## 3. Stage 2 — Fugitive archetypes (solo ladder)

All archetypes share the movement legality rules and are parameterized blends over four knobs:

| Knob | Range | Meaning |
|---|---|---|
| `route_entropy` | 0–1 | Probability of choosing a non-optimal edge when feasible |
| `deception` | 0–1 | Willingness to revisit "cleared" areas and re-cross revealed districts |
| `caution` | 0–1 | Avoidance of nodes adjacent to recent public events (drops, reveals) — approximation of player-hunting without reading private state |
| `slack_use` | 0–1 | Fraction of stamina surplus spent on ambiguity-preserving detours/Holds |

**Archetypes (fixed blends for MVP, exposed in solo ladder):**
- **Random (`route_entropy`=1)** — teaching wheels; reveals the map's texture.
- **Cautious** (`entropy`=0.3, `deception`=0.1, `caution`=0.8, `slack_use`=0.5) — disciplined, hard to pin, rarely brilliant.
- **Deceptive** (`entropy`=0.5, `deception`=0.8, `caution`=0.3, `slack_use`=0.9) — the boss: doubles back, holds to break parity, baits stakeouts.

**Constraint (anti-cheat parity):** archetypes never read the Investigator's private actions (probes/stakeouts). `caution` reacts only to *public* events. This keeps AI behavior reproducible and makes solo a fair teacher for ranked instincts.

**[hypothesis]** These blends produce distinguishable difficulty tiers; M4 playtest measures probes-per-capture per archetype (target: monotonic increase Random < Cautious < Deceptive).

## 4. Stage 3 — Player-skill measurement (both roles)

Measured per rolling window (last 10 cases), stored **on-device** in MVP (privacy: no server profile before accounts exist):

**Investigator skill axes:** probes-per-capture (efficiency); belief calibration (marker agreement with ground truth at case end — computed locally from the replay); budget discipline (unspent IP at verdict); stakeout conversion (hits ÷ stakes).
**Fugitive skill axes:** escape rate vs. archetype tier; reveal-days-exposure (how much truth each reveal carried); stamina discipline (unspent SP at escape); deception success (Investigator stakeout miss rate).

Output: a scalar tier per role (Novice / Analyst / Detective / Ghost-hunter) used for: solo ladder gating, archetype blend selection, and (post-M4) the adaptive director. No cross-player comparison, no server transmission — the ranked ladder is the only comparative surface, and it is purely match-based.

> **Implemented (M3 W3, ADR-007 D3):** per-case facts are collected from live engine state + the §8.6 disclosure at close and persisted on the history record; windows are the rolling last-10 closed cases per role, computed on-device. The four axes' MVP formulas, composite weights, and the 40/55/70 tier thresholds are registered in ADR-007 D3 (thresholds recalibrated at M4). The fugitive "escape rate vs. archetype tier" axis is implemented as plain escape rate while the fugitive seat has a single AI opponent (I-GreedyProbe); the per-opposition-tier breakdown slots in at M5+.

## 5. Stage 4 — Adaptive difficulty director (solo-only; post-MVP)

**Principle (inherited from the research phase, hardened by audit A8):** adaptation is solo-only, disclosed, bounded, and always in the player's favor.

| Lever | Bound | Trigger (skill-model rule) |
|---|---|---|
| Archetype blend | interpolate Cautious↔Deceptive ±0.2 | rolling probes-per-capture outside [4,7] |
| IP budget | ±1 (9–11) | two consecutive captures < day 5 (down) or two escapes (up) |
| SP budget | ±2 (10–14) | escape-rate outside [40%, 70%] |
| Assist heatmap | off → radius-1 hint → full | 3 consecutive Investigator losses |
| Reveal upgrade (informant) | one district→exact reveal at a fixed day (day 5), solo only | player stuck (no HIT by day 4) |

**Firewalls (normative):** never active in casual or ranked; never changes a case's *published* schedule mid-case except the single disclosed informant upgrade; never consumes or grants IP/SP beyond the bounds above; every activation is written to the case log ("Assist used: informant upgrade") so the player always knows.

**Validation:** the M2 simulation harness replays the director across 1,000-case batches to verify the band-completion target (40–60% per case, declining variance — PRD §6) before it ships at M4.

## 6. Stage 5 — Stronger Investigator AI (post-MVP)

Upgrade `I-GreedyProbe` with a proper belief-state planner: exact Bayesian filter over (position, drop-progress, stamina-bucket) using the public event log; stakeout decision via expected-value comparison (P(hit) × value-of-capture vs. information value of remaining probes). **Deferred** because: (a) human Fugitives arrive at M5 anyway; (b) a too-strong AI Investigator would make solo Fugitive mode feel unfair; (c) the planner is also the anti-exploit oracle (below), so it is built when needed, not before.

## 7. Anti-exploit testing (continuous from M2)

- **Policy diversity checks:** for each archetype, verify no single counter-policy wins >65% (the sim matrix of 04-balance-sim §4.2 doubles as the exploit scan).
- **Information-wall audit:** a test harness asserts that AI decisions are invariant to changes in the opponent's private state (i.e., the AI cannot "see" the hidden route). Any dependence fails CI.
- **Reproducibility:** ranked/solo cases are seed-replayable; AI + rules must reproduce identical outcomes from identical seeds (property test, 09-testing §3).
