# M2 W3 — Simulation Report: 20-Pair Policy Matrix + Scenario Sweeps S1–S7

**Status:** EXECUTED 2026-10-25 · **Ruleset:** `1.0.0-alpha.1` (canonical resolution; sweep overrides
per [ADR-003](adr-003-sim-overrides.md), echoed per cell) · **Map:** map_alpha v1.2.0 ·
**Harness:** `packages/sim` (@dead-drop/sim 0.1.0-alpha.0) driving `@dead-drop/engine` 0.3.0-alpha.0 ·
**Raw data:** [`w3-results/`](w3-results/) (`matrix.json`, `sweeps.json`, `s7-camping.json`,
`determinism.json`, `performance.json`) · Plan: [`M2-execution-plan.md`](M2-execution-plan.md) §1 W3.

Everything below comes from the recorded run of 2026-10-25: **20,000 matrix cases
(20 pairs × N=1,000, common random numbers), 52,000 sweep cases (26 cells × 4 focal pairs × N=500),
1,500 camping-pricing addendum cases (S7), 60,000 determinism double-runs (10,000 seeds × 3 pairs)**.
No session data is involved (S1–S3 remain human-gated per the fabrication guard); every number here
is machine-generated and reproducible via `npm run sim`.

## 1. Method and named conventions

The harness (`packages/sim/src/harness.ts`) drives the pure engine headlessly. Policies submit
through `CaseSession` exactly like future clients; TypeScript confines each policy to its role view
(§1.3 information wall). Exact policy rules live in `packages/sim/src/policies.ts`'s header; the
load-bearing conventions:

| Convention | Content |
|---|---|
| CRN | All pairs share the same seeded case list per cell (seeds 1..N) — pair differences isolate policy effect. |
| Belief model | Exact Bayesian filter over (node, sp, drops, holds) from public log + investigator-private log only; transition prior = **uniform over legal actions** (strategy-agnostic). |
| Stakeout choice | **Gate** on current posterior max ≥ 0.4 (where they are); **target** the predictive argmax (where they will be at §2-step-2 resolution). |
| Calibration comparator | Stakeout hit-rate vs the **predictive** mass at placement (one unobserved day ahead). |
| Fugitive competence | Feasibility-first: route-optimal (SP, days) choices; leak/deception behaviors express as tie-breaks within route parity; SlackBurner burns slack within feasibility; F-Random is the noise floor by definition. |
| S6 band shift | P1 ∈ {7,8,9} with P12 shifted to [5, P1−1]; cases regenerate per cell from the same seed list. |
| S1 semantics | Budgets sweep as PLAYED budgets over the canonical case-shape pool (isolate budget effect from case-shape effect). |

**Pilot disclosures (all fixed before the recorded run — no recorded number below is affected):**
three policy defects were found and repaired during smoke runs, each registered in the policy
header: (1) stakeout targeting on the current argmax converted 86% probe accuracy into 0 captures
against moving fugitives; (2) F-LeakAware's leak tiers as hard filters compounded +1 day per reveal
day and cost ~50% of completions; (3) the route helpers classified the *completing* move itself as
infeasible (no terminal-state check). These are policy-layer fixes only — the engine and ruleset
were untouched throughout (zero rules churn).

**Performance (04-balance-sim §4.1):** 995 cases/s through the full policy+belief layer; 831 cases/s
engine-level (F-Beeline×I-Random, no belief filter); 877 cases/s on sweeps. The §4.1 estimate
("≥1,000 cases/s/order-of-magnitude, est.") is met at the same order of magnitude; the belief
filter dominates the remaining gap. Determinism double-run: 178 cases/s (regenerates cases per
pass by design).

**Determinism (G1 evidence):** 10,000 seeds × 3 pairs (F-Beeline×I-Random, F-Random×I-Random,
F-Random×I-GreedyProbe), each run twice from scratch with full-transcript digests (verdict, ledgers,
both logs, §8.6 route): **0 mismatches**. `w3-results/determinism.json`.

## 2. The 20-pair matrix (N=1,000, investigator win% with Wilson 95% CI)

| Pair | Inv win% | 95% CI | Captures | Expiry | Escapes | Mean cap day |
|---|---|---|---|---|---|---|
| F-Beeline × I-GreedyProbe | 65.3 | [62.3, 68.2] | 653 | 0 | 347 | 2.0 |
| F-Beeline × I-Calendar | 65.3 | [62.3, 68.2] | 653 | 0 | 347 | 2.0 |
| F-Beeline × I-Aggressive | **93.2** | [91.5, 94.6] | 932 | 0 | 68 | 3.1 |
| F-Beeline × I-Random | 3.4 | [2.4, 4.7] | 34 | 0 | 966 | 3.3 |
| F-Random × I-GreedyProbe | **100.0** | [99.6, 100.0] | 240 | 760 | 0 | 2.6 |
| F-Random × I-Calendar | **100.0** | [99.6, 100.0] | 240 | 760 | 0 | 2.6 |
| F-Random × I-Aggressive | **100.0** | [99.6, 100.0] | 44 | 956 | 0 | 3.1 |
| F-Random × I-Random | **100.0** | [99.6, 100.0] | 31 | 969 | 0 | 3.5 |
| F-LeakAware × I-GreedyProbe | 65.3 | [62.3, 68.2] | 653 | 0 | 347 | 2.0 |
| F-LeakAware × I-Calendar | 65.3 | [62.3, 68.2] | 653 | 0 | 347 | 2.0 |
| F-LeakAware × I-Aggressive | **93.2** | [91.5, 94.6] | 932 | 0 | 68 | 3.1 |
| F-LeakAware × I-Random | 3.4 | [2.4, 4.7] | 34 | 0 | 966 | 3.3 |
| F-Deceptive × I-GreedyProbe | 67.9 | [64.9, 70.7] | 679 | 0 | 321 | 2.1 |
| F-Deceptive × I-Calendar | 67.9 | [64.9, 70.7] | 679 | 0 | 321 | 2.1 |
| F-Deceptive × I-Aggressive | **70.7** | [67.8, 73.4] | 707 | 0 | 293 | 2.8 |
| F-Deceptive × I-Random | 3.7 | [2.7, 5.1] | 37 | 0 | 963 | 3.9 |
| F-SlackBurner × I-GreedyProbe | **53.6** | [50.5, 56.7] | 536 | 0 | 464 | 2.0 |
| F-SlackBurner × I-Calendar | **53.6** | [50.5, 56.7] | 536 | 0 | 464 | 2.0 |
| F-SlackBurner × I-Aggressive | **72.3** | [69.4, 75.0] | 723 | 0 | 277 | 3.2 |
| F-SlackBurner × I-Random | 3.5 | [2.5, 4.8] | 35 | 0 | 965 | 3.7 |

Full per-pair detail (IP/SP unspent, probe/stakeout rates, calibration, Q4 counters, histograms):
`w3-results/matrix.json`.

Structural readings:

1. **F-LeakAware is outcome-identical to F-Beeline** (all cells equal). The calendar game does
   **not** emerge at zero-cost tie level on map_alpha: same-district/class-variance preferences
   almost never bind within (route-SP, days)-parity route sets. Q2-adjacent design note: if the
   calendar game is wanted, it must be *purchased* (Deceptive-style holds) or the route space must
   contain more cost-tied variety (content lever, M2 exit).
2. **F-Deceptive is measurably distinct** (+2.6pp investigator vs LeakAware rows — its proactive
   parity Holds mostly *cost* it, as designed: deception at a price).
3. **F-SlackBurner × I-GreedyProbe lands at 53.6% [50.5, 56.7] — the only belief cell inside the
   45–55 band.** Burning stamina surplus into expensive (predictable) edges is the single most
   effective scripted fugitive behavior against information-first tracking.
4. **I-Aggressive (objective camping) dominates every non-random fugitive (70.7–93.2%) and beats
   the belief trackers.** See §5 (S7): public drops + next-day stakeout resolution make camping the
   strongest scripted strategy — the "no dominant strategy" acceptance line (04 §4.5) is violated
   by design as written. This is W3's headline finding.
5. **F-Random never escapes** (0/1000 vs every investigator): a uniform random walk does not
   complete a 2-drop case in 8 days. The floor is far below the ceiling — skill headroom exists.

## 3. Scenario sweeps

### S1 — baseline balance grid: P4 ∈ {8,10,12} × P3 ∈ {10,12,14} (focal pairs, N=500)

Investigator win% (I-GreedyProbe rows; Calendar identical to ±3pp):

| | P4=8 | P4=10 | P4=12 |
|---|---|---|---|
| **P3=10** | 78.2 | 79.4 | 80.0 |
| **P3=12** | 65.8 | 67.0 | 67.6 |
| **P3=14** | 65.8 | 67.0 | 67.6 |

- **P3 (stamina) is the only lever that moves this needle**: 10 SP → ~78–80% investigator (starved
  routes are predictable); ≥12 SP saturates (66–68%). The W1 finding "stamina is ambiguity slack"
  now has its simulation confirmation: slack above 12 buys *nothing* to either role at scripted
  level.
- **P4 (intel) is nearly dead in [8,12]** (+1–2pp across the whole axis): belief policies spend
  ~6.8 IP of 10 against competent fugitives (`meanIpUnspent` 3.2), so 8 already suffices. The 45–55
  band cannot be reached by Intel pricing alone.

### S2 — reveal-schedule adequacy (the roadmap's named risk) — **VERDICT WRITTEN**

| Schedule | LeakAware×GreedyProbe | Deceptive×Calendar |
|---|---|---|
| {3,6}/{4} (v1.0-alpha) | 67.0% [63,71] | 69.8% [66,74] |
| {2,5,7}/{4} (denser) | 65.8% [62,70] | 65.2% [61,69] |
| {3,6}/{4,7} (transit+) | 67.0% [63,71] | 69.8% [66,74] |

**S2 verdict:** the reveal schedule is **adequate and NOT the dominant balance lever** in its
swept neighborhood. Denser district reveals ({2,5,7}) shave 2–4pp off the investigator and are the
only variant with a directional effect; adding a day-7 transit reveal changes nothing (the case is
usually decided by then). The deeper reason is §4's capture-day distribution: the case is decided
on days 1–3, before most reveals fire — the public start + first-stakeout geometry dominates
everything the reveal calendar does. The roadmap risk "reveal schedule wrong" is **not confirmed**
at scripted level; keep {3,6}/{4} through M4 human playtests.

### S3 — first-mover initiative (control run only)

Baseline 67.0% investigator; with the Investigator's decisions delayed one day (end-of-day-(d−1)
view; resolution order untouched): **0.0% investigator, 1,000/1,000 fugitive escapes.**

A single day of decision delay converts the entire contest. The investigator's whole edge lives in
SAME-day evidence (probe results, reveals) feeding same-day stakeout placement. Design readout for
the async game: the server-resolved same-day information flow is not a nicety — it is the balance
itself. (Control run only, per plan — not a rules proposal.)

### S4 — stakeout pricing: P8 ∈ {2,3,4} × P7 (probe cost) ∈ {1,2}

Effects are small and monotone: P8=2 (cheaper stakeouts) +2.8pp investigator; P7=2 (pricier probes)
−1.2pp. Pricing moves the needle ±≤3pp — it cannot repair the §6 band problem (see §6). The one
big pricing effect is on the CAMPER — see §5.

### S5 — Hold economy: P6 max ∈ {1,2,3}

**All three cells are identical to the decimal.** At scripted level the hold cap is not a balance
lever: route-optimal fugitives rarely hold, and Deceptive's proactive holds only ever find one
useful window. The hold economy's value (bluffing, parity-breaking, §9.13 drama) must be judged at
M4 human playtests — the sim cannot see it. Q5's playtest warning ("confirm Fugitives understand
the gamble") stands.

### S6 — case length: P1 ∈ {7,8,9} (band [5, P1−1], cases regenerate)

| P1 | LeakAware×GreedyProbe | Deceptive×Calendar |
|---|---|---|
| 7 | 74.4% [70,78] | 79.0% [75,82] |
| 8 | 67.0% [63,71] | 69.8% [66,74] |
| 9 | 64.8% [61,69] | 68.6% [64,73] |

Shortening the clock hurts the fugitive (+7–9pp investigator); lengthening to 9 buys back only
~2pp — because captures happen on day 2 (§4), the clock is not the binding constraint. P1=8 with
band [5,7] remains reasonable.

### S7 — degenerate-strategy probes

- **F-Beeline exploitability: CONFIRMED.** I-Aggressive catches the deterministic beeliner 93.2%
  ([91.5, 94.6]) by simply camping drop 1. Any human who routes identically every case gets eaten;
  the anti-scripting generator constraint (C3 prefix diversity) does not protect against
  *cross-case* route repetition — that is matchmaking/rating territory (M6), noted for the ranked
  design.
- **I-Aggressive camping dominance + the pricing lever.** Dedicated addendum
  (`w3-results/s7-camping.json`, N=500/CRN): stakeout price P8 vs the camper —

  | P8 | vs Beeline/LeakAware | vs Deceptive | vs SlackBurner |
  |---|---|---|---|
  | 2 | 100.0% | 96.0% | 99.4% |
  | 3 | 93.2% | 71.2% | 74.6% |
  | 4 | 67.2% | 67.2% | **42.8%** |
  | 5 | 67.2% | 67.2% | **42.8%** |

  **P8 is the single strongest anti-camping lever measured in W3.** At P8=4 the camper falls to
  ~67% (still ≥65% vs route-optimal fugitives) and SlackBurner — the ambiguity burner — flips the
  matchup fugitive-favored (42.8% [38.5,47.2]). P8=5 saturates (budget-limited: 2 stakes/case).
  This is the concrete W4 retune candidate: **P8 3→4** (see §6 scorecard).

## 4. Capture-day distribution (04 §4.5 third line)

Belief-policy captures: **0–11% on days 4–8** (vs the ≥60% target): F-Beeline/LeakAware/SlackBurner
0/653–536 on days 4–8; F-Random 27/240; F-Deceptive 26/679. Histograms in `w3-results/matrix.json`.
The case is decided in the opening: the public start pins day-1 to the safehouse neighborhood, the
first stakeout resolves on day 2, and the belief tracker's opening read is brutally accurate
(stakeout hit-rate 49.9% at 0.16 predictive mass — a 3× skill premium over the uniform prior,
exactly the §4.5 calibration direction). **The acceptance line FAILS**: capture pacing is the
second W4 retune front (after camping dominance), and the two are linked — both stem from how
strong same-day information + next-day resolution is in the opening.

## 5. Q1 / Q4 first readouts (m2-handoff §5; 13-open-questions Q1/Q4)

- **Q1 (EXPIRY direction): KEEP investigator-wins.** At scripted level EXPIRY fires ONLY against
  the random-walk floor (760–969/1000 vs F-Random; 0 vs every route-optimal fugitive). Investigators
  win actively (captures), not passively, against competent play. No flip. Re-test at M4 with human
  endgames (humans stall differently).
- **Q4 (is the ±2 probes/day cap binding?): the cap is REAL, keep it.** Belief policies hit the cap
  on 1.28–2.34 days per case (capBlocks counter; `w3-results/matrix.json`) — binding ~16–30% of
  decision-days depending on opponent. Not dead weight, not the whole game. The rules-text
  simplification Q4 feared is unnecessary.

## 6. §4.5 acceptance scorecard → W4 retune list

| 04 §4.5 line | Result | Verdict |
|---|---|---|
| I-Greedy/Calendar vs F-LeakAware/Deceptive within 45–55% | 65.3–67.9% (CIs entirely >55) | **FAIL** |
| No policy pair >65% at α=0.05 | I-Aggressive 70.7–93.2% vs all non-random fugitives (also F-Random rows 100% vs the designed floor) | **FAIL** |
| ≥60% of captures on days 4–8 | 0–11% | **FAIL** |
| Stakeout hit-rate > posterior mass at placement | 49.9–52.6% vs 0.16–0.17 (smart fugitives); 19.9% vs 0.21 (Random, calibrated) | **PASS** (skill premium visible; prior calibrated vs noise) |

**W4 retune inputs (≤1 parameter pass, per 04 §5; nothing is changed in W3):**

1. **P8 stakeout cost 3→4** — directly attacks the dominant strategy (camping 93→67% vs
   route-optimal fugitives) with measured side-benefits: captures spread later (mean cap day
   3.1→2.7 at P8=4 is misleading — see raw JSON; the real effect is fewer opening stakes), and the
   SlackBurner matchup crosses into fugitive-favored, restoring a fugitive archetypes' viability.
   Watch: Deceptive/SlackBurner × GreedyProbe cells must not drop below 45%.
2. **The opening-information structure, not the calendar, owns the pacing problem.** Levers that do
   NOT touch rules text (fix-ladder order per 10-roadmap §3): content first — the M2-exit map
   revision can add day-1 route diversity around safehouses (more first-move branches = lower
   opening predictive mass); the C3 prefix constraint could later add a "day-1 branching ≥ k"
   clause (generator methodology, not rules). Parameter-only alternatives (P9 denser) measured weak
   (S2: −2pp).
3. **Do NOT touch P3 ≥ 12 (dead slack) or P4 ∈ [8,12] (dead axis)** — measured insensitive; their
   [hypothesis] status can be downgraded to [computed-insensitive at scripted level] in 04 §2 at
   the W4 parameter-version bump.
4. **F-LeakAware ≡ F-Beeline** (§2.1) is a policy-space fact, not a parameter fact: if the design
   wants the calendar game to matter, it must be priced (holds) or made structural (map content) —
   a design decision for the W4 report, not a silent tweak.

## 7. Honesty section

- No human session data exists or is used anywhere in W3 (S1–S3 remain human-gated; the fabrication
  guard is intact). The engine resolved every one of the 133,500 recorded case-runs.
- The three pilot-phase policy fixes are registered in `packages/sim/src/policies.ts`'s header with
  dates; the engine (`packages/engine`) shipped W2 unchanged except the additive ADR-003 override
  surface (T16) whose default path is byte-identical to 1.0.0-alpha.1 (proven by the unchanged
  63-test W2 suite + 115-config full-space reconciliation).
- Scripted policies are NOT humans: these numbers bound what mechanism-level structure does at
  scripted competence — they cannot establish fun, feel, or human-exploitability. The 45–55 band
  target remains defined for rated HUMAN play (04 §1); this matrix measures the mechanism substrate
  under it. W4's balance report must say both things.
- All outputs carry their conventions inline (`w3-results/*.json` → `meta.conventions`).
