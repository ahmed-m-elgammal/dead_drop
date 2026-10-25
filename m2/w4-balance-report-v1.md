# M2 W4 — Balance Report v1 (one-page parameter verdict + retune list)

**Status:** EXECUTED 2026-10-25 · **Ruleset:** `1.0.0-alpha.1` (resolution defaults — unchanged all
milestone) · **Parameter table in force:** 04 §2 **v1.0-alpha** (NO bump this milestone — see the
verdict) · **Map:** map_alpha v1.2.0 · **Harness:** `@dead-drop/sim` driving `@dead-drop/engine`
· **Raw data:** [`w4-results/`](w4-results/) (`retune-matrix.json`, `retune-determinism.json`,
`adoption-check.json`) · Plan: [`M2-execution-plan.md`](M2-execution-plan.md) §1 W4 ·
Decision record: [`adr-004-params-v1.1.md`](adr-004-params-v1.1.md).

Everything below is machine-generated and reproducible (`npm run sim -- --mode retune` runs on the
same CRN seeds 1..1000 as the W3 baseline, so every comparison is paired). No session data is
involved anywhere (S1–S3 remain human-gated; the fabrication guard is intact).

## 1. The verdict (one page)

**The one authorized W4 retune pass was MEASURED and REJECTED under the pre-registered 04 §5
adoption rule. The parameter table stays v1.0-alpha; the measured candidate is preserved and
handed to M4 with its side-effect quantified.**

The W3 retune list's headline candidate — P8 stakeout cost 3→4 — was run through the full
20-pair matrix (N=1,000/pair, CRN identical to the W3 baseline) under the ADR-003 override
surface. Its effects, against the four §4.5 acceptance lines:

| §4.5 metric | W3 baseline (P8=3) | W4 measurement (P8=4) | Direction |
|---|---|---|---|
| Camping dominance (I-Aggressive vs non-random fugitives) | 70.7–93.2% | **65.6% [62.6, 68.5]** (SlackBurner: **41.4% [38.4, 44.5]**, fugitive-favored) | **DECISIVE improvement** (CIs disjoint; the α=0.05 ">65%" read flips for non-random fugitives) |
| Focal band (Greedy/Calendar × LeakAware/Deceptive) | 65.3–67.9% | 63.9% [60.9, 66.8] (all four cells) | Directional only (significant vs the Deceptive cells' 67.9, not vs LeakAware's 65.3) |
| Capture pacing (captures on days 4–8) | 1.9% (target ≥60) | **0.6%** | **REGRESSED** — pricier stakes (1.31→1.01/case) concentrate on the highest-probability opening placements |
| Stakeout calibration (hit-rate > predictive mass) | 49.9% vs 16.2% | **63.5% vs 15.6%** (skill premium widens: scarcer stakes are higher-quality) | Improved (PASS holds; F-Random control unchanged: 18.6% vs 20.0%, same calibrated-to-noise relation as baseline) |

**§5 adoption rule** ("adopt only if ≥2 metrics move in the desired direction without regressing
a third"): 1 decisive desired move + 1 directional move + **1 regression** → **NOT MET**. The
watch items from the W3 retune list held (band cells ≥45%; SlackBurner×GreedyProbe unchanged at
53.6%), but the rule is the rule — it was pre-registered precisely to prevent adopting a
headline fix while talking past a measured side-effect.

**The deeper, measured conclusion: at scripted competence the 45–55 band and the pacing line are
NOT parameter-reachable.** S1 showed P3/P4 saturated or dead; S4 showed pricing moves ±3pp; this
measurement shows the one strong lever buys the dominance fix at the price of a pacing
regression. The band and pacing problems live in the *opening-information structure* (public
start + same-day evidence feeding day-2 resolution) — their levers are content (day-1 route
diversity around safehouses; the M2-exit map revision) and human data (M4), not the parameter
table. This is now a measured statement, not a suspicion.

**Both readings (the honesty requirement):** the 45–55 band target is defined for rated HUMAN
play (04 §1); everything here is scripted-competence level. G1 therefore closes on the
"specific retune list" branch (below), NOT on a claim that the game is balanced. The M2 exit
condition (10-roadmap) is written exactly this way.

## 2. The retune list (specific, as G1 requires)

1. **P8 3→4 (measured candidate — rejected as an M2 adoption, preserved for M4).** Decisive
   anti-camping effect (−27.6pp; SlackBurner matchup flips fugitive-favored), calibration
   improves, but pacing regresses 1.9→0.6% (composition: scarcer stakes concentrate early).
   Re-evaluate at M4 with human data — if human play reproduces camping dominance, P8=4 is the
   pre-measured fix and the pacing cost must then be judged by humans (the pacing target
   itself was already failing at 1.9% — the candidate moves an already-failing metric, which is
   a trade for M4 to arbitrate, not for a scripted gate to wave through).
2. **Content lever (fix-ladder order, 10-roadmap §3: content before rules): day-1 route
   diversity around safehouses** in the M2-exit map revision — more first-move branches lower
   the opening predictive mass, attacking BOTH the band and the pacing problem at their measured
   root. The generator side could later add a "day-1 branching ≥ k" clause (methodology, not
   rules text).
3. **Do NOT touch P3 (≥12, saturated) or P4 ([8,12], dead)** — measured insensitive three ways
   now (W1 exhaustive + W3 S1 + this matrix). Status downgraded in 04 §2.
4. **F-LeakAware ≡ F-Beeline** (W3 §2.1) — the calendar game must be priced (holds) or made
   structural (map content) if wanted; M4 design decision.

## 3. Determinism, performance, and scope guards

- **Determinism under the candidate:** 10,000 seeds × 3 pairs, double-run, full-transcript
  digests — **0 mismatches** (`retune-determinism.json`), on top of the W3 canonical 10k green.
  The G1 determinism line is green in BOTH parameter worlds.
- Throughput 985 cases/s (matrix) / 173 cases/s (determinism double-run) — §4.1
  order-of-magnitude holds.
- **Scope guards held:** the canonical default path is byte-identical to `1.0.0-alpha.1`
  (pinned by the unchanged W2 golden/L1 suites + a new default-path pricing test); the candidate
  rides the T16/ADR-003 override surface (`RETUNED_CANDIDATE_P8_4`); zero rules churn; zero
  policy changes (the W3 pilot fixes remain the only ones, registered in the policy header).
- Engine tag: **`engine@1.0.0-alpha.0`** (the roadmap's `engine@1.0.0-alpha` deliverable, semver
  form) — marks the package that implements the frozen ruleset exactly and carries the measured
  candidate as data.

## 4. Honesty section

- No human session data exists or is used anywhere in W4. The engine resolved all 80,000 W4
  case-runs (20,000 matrix + 60,000 determinism double-run) plus the W3 baseline runs compared
  against.
- The §5 rejection is the system working as designed: the rule was pre-registered in 04 §5,
  the measurement was run on the same CRN seeds, and the regression was recorded rather than
  argued away. No adoption pressure was applied to the outcome.
- Scripted policies are not humans: the camping-dominance measurement is about MECHANISM
  structure (public drops + next-day stakeout resolution + stakeout pricing); whether humans
  camp, and whether they experience the camper as oppressive, is M4 data.
- The "no parameter path to the band" conclusion is scoped to scripted competence and the swept
  parameter space (S1/S4/this measurement); a human-validated parameter table (M4 v1.1) may
  differ.
