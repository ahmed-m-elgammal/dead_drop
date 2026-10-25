# M2 Handoff — from M1 (Requirements & design validation) to M2 (Simulation & generator)

**Status:** pre-written at M1 W3 (2026-10-25) · two `[AT FREEZE]` fields are filled at M1 close (`m1/freeze-checklist.md` §4) · everything else is freeze-independent.

**Frozen ruleset:** `[AT FREEZE — Branch A: 1.0.0-alpha.1 final alpha / Branch B: 1.0.0-beta if S3 triage patched]` · git tag `m1-freeze-<version>`.

**Session evidence at handoff:** `[AT FREEZE — tally (A ≥3 cases/role, partners B+C) + zero untriaged disputes; see w1-rules-audit §7]`.

## 1. What M2 builds on (frozen inputs)

1. **The ruleset is the spec.** `03-rules.md` §1–§11 is normative and frozen; live cases resolve under their creation version (§9.12). The engine must implement exactly this text — determinism guarantee included (no RNG in resolution; the only randomness is the seeded generator).
2. **Type layer starts from the W2 draft.** `m1/engine-types/dead-drop.types.ts` (types only, uncompiled by design) lifts verbatim into the engine package. Carry its findings **T1–T10** into engine test planning — especially **T2** (derive-don't-store: the Investigator's view of fugitive state is structurally empty; `drops_collected` comes from public events, never a mirrored field), **T8** (§9.8 invariants are generator obligations — assert them in the feasibility report), **T9** (consumed-stakeout-after-miss needs a fixture).
3. **Parameter values are imported, never hard-coded.** `PARAMETERS_V1_0_0_ALPHA_1` (in the type draft) is the single importable source; simulation sweeps (04-balance-sim §4.4 S1–S7) read from it.

## 2. First M2 task — AUD-003 (generator constraint semantics) — BEFORE writing the generator

Pin C3's exact semantics ("≥3 distinct minimal-cost first-three-day route prefixes" — strict vs loose reading of *minimal-cost* and the prefix window), then count the **full conjunction C2∧C3∧C4** over the ordered 960-config space. Strict reading admitted only **7/960** vs the 24-case ladder need. Pre-authorized lever if the count fails: widen the drop-candidate pool **16 → 24** (+ optionally a third safehouse) — a *content-data* change, no rules churn (04-balance-sim §6). Name every counting convention in outputs (AUD-002 lesson).

> **→ Executed 2026-10-25 (M2 W1):** C3 pinned to the min-cost reading; conjunction counted under
> four named readings; lever adopted with a documented 8-node selection — **115/2208** configs
> pass (4.8× ladder need). Full rationale, counts, erratum (W1 C4 either-gate laxity, corrected),
> and the generator constraint spec v1.0: [`../m2/aud003-constraint-analysis.md`](../m2/aud003-constraint-analysis.md).

## 3. Regression constants (paper-verified → L1 engine fixtures, 09-testing §1)

| Case | Config (public) | Min completion | Cheapest drop-2 route |
|---|---|---|---|
| P1 | D2-07 / [D2-06, D1-10] / D1-08 | **6 days** | 5 SP |
| P2 | D3-06 / [D3-05, D4-03] / D4-02 | **6 days** | 6 SP |
| P3 | D3-06 / [D2-06, D1-10] / D1-08 | **6 days** | 7 SP |
| canonical (03 §10) | D2-07 / [D2-09, D1-10] / D1-08 | **7 days** | 6 SP |

Engine BFS over (node, stamina, drop-progress) must reproduce these exactly; the independent oracle is `tools/verification/dd_m1_w1_validation.py` (re-derived from `assets/sample_map_alpha.json`, not from any earlier script).

## 4. M2 scope pointers (from the frozen docs)

- **Simulation harness:** 04-balance-sim §4 — pure deterministic engine module first, headless driver, 5×4 policy matrix, Wilson CIs, §4.5 acceptance bands (role win-rate 45–55%; no pair >65%; ≥60% of captures on days 4–8; stakeout hit-rate > posterior mass).
- **Case generator:** 04-balance-sim §6 constraints C1–C6 + seeds + feasibility report recorded per case.
- **Not in M2:** UI, multiplayer servers, AI behavioral models beyond the scripted policies, monetization (01-prd MVP boundary).

## 5. Known-unknowns M2 inherits (unchanged at M1 close)

B1 (no simulation results yet) and B3 (map/generator headroom) stay open in `14-readiness.md`; Q1 (EXPIRY direction) and Q4 (is the 2-probe cap ever binding?) get their first real readouts from S1/S7.
