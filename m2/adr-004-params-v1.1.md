# ADR-004 — W4 Retune: P8 3→4 Measured, REJECTED Under the §5 Adoption Rule; Parameter Table Stays v1.0-alpha

**Status:** Accepted · **Date:** 2026-10-25 · **Scope:** M2 Week 4 (m2/M2-execution-plan.md §1 W4)
· **Supersedes:** nothing (refines the W3 retune-list item 1) · **Depends on:** ADR-001
(toolchain), ADR-002 (resolve() unlock), ADR-003 (simulation parameter overrides).

## Context

The W3 simulation measured three §4.5 acceptance lines FAIL (band, camping dominance, capture
pacing) and named P8 stakeout cost 3→4 as the headline retune candidate, with an explicit watch
("Deceptive/SlackBurner × GreedyProbe cells must not drop below 45%") and the pre-registered 04
§5 adoption rule: *a change is adopted only if it moves ≥2 metrics in the desired direction
without regressing a third*. 10-roadmap M2 task 5 authorizes **≤1** parameter pass at W4, and
"retuned parameter table v1.1 **if warranted**" is the deliverable. The ruleset text is frozen
at `1.0.0-alpha.1` until the M1 freeze (m1/freeze-checklist.md §2), so any adoption must also
respect the sequencing discipline that kept the alpha.1 evidence base (115-config
reconciliation, golden worked examples, L1 fixtures) intact all milestone.

## Decision

1. **Measure, then obey the pre-registered rule.** The candidate ran through the full 20-pair
   matrix (N=1,000/pair, CRN seeds 1..1000 — identical to the W3 baseline, so every comparison
   is paired) via the ADR-003 override surface, plus a 10,000-seed determinism double-run under
   the candidate. Results (`m2/w4-results/`, paired diff in `adoption-check.json`):
   - Camping dominance: **decisive desired move** — 93.2/93.2/70.7 → 65.6 [62.6, 68.5]
     (CIs disjoint); SlackBurner×Aggressive 72.3 → **41.4** [38.4, 44.5] (fugitive-favored,
     restoring archetype viability).
   - Focal band: directional move only — 65.3–67.9 → 63.9 [60.9, 66.8] (significant vs the
     Deceptive cells, not vs LeakAware).
   - Capture pacing: **REGRESSED** — pooled days-4–8 capture share 1.9% → **0.6%** (stakes/case
     1.31 → 1.01; the surviving placements concentrate on the highest-probability opening
     moments).
   - Calibration: improved (49.9% vs 16.2% → **63.5% vs 15.6%**; F-Random control unchanged).
   - **§5 accounting: 1 decisive move + 1 directional move + 1 regression → NOT MET. The pass
     is NOT adopted.** A candidate that fixes the headline metric while regressing a third is
     exactly what the rule exists to catch; the watch items held, but the rule outranks the
     recommendation.
2. **The parameter table stays v1.0-alpha.** 04 §2 gets the measured status downgrades (P3/P4
   [computed-insensitive at scripted level]) but NO value changes and NO version bump. The ≤1
   pass budget is not "spent" by a rejected candidate: adoption is what consumes the pass, and
   documenting the rejection explicitly prevents pass-shopping (re-running adoption attempts
   until one clears the bar).
3. **The candidate is preserved as measured data, not folklore.** The engine exports
   `PARAMETERS_V1_1_ALPHA_CANDIDATE` (alpha.1 + P8=4, table-driven — never hard-coded) and the
   frozen `RETUNED_CANDIDATE_P8_4` preset riding the T16/ADR-003 override surface; the sim CLI
   gained `--mode retune` reproducing the recorded run. The naming is deliberate: no v1.1 table
   is in force, so nothing is named as if one were.
4. **Sequencing (unchanged from ADR-003):** `CANONICAL_PARAMS` remains the alpha.1 snapshot and
   the ruleset text stays frozen until the M1 freeze; if M4 later adopts the candidate, the
   freeze-commit pattern (Branch-B, freeze-checklist §2) lands the text + canonical flip in one
   change. The default path is byte-identical to `1.0.0-alpha.1` and stays pinned by tests.
5. **G1 closes on the retune-list branch** (the M2 exit condition's explicit alternative to a
   met band): the retune list in `w4-balance-report-v1.md` §2 is specific, measured, and carries
   the content lever (day-1 route diversity) that attacks the band and pacing problems at their
   measured root.

## Consequences

- M2 closes with the parameter table UNCHANGED and the balance story fully measured: the band
  and pacing lines are parameter-unreachable at scripted competence (S1 + S4 + this measurement
  agree), and the one strong parameter lever is quantified with its trade-off for M4.
- The M2-exit map revision inherits a concrete content brief: day-1 branching diversity around
  safehouses (band + pacing root cause), per the fix-ladder order (content before rules).
- M4's retune decision is pre-paid: if human play shows camping dominance, P8=4 is measured
  (including its pacing cost and its calibration improvement); if it does not, the candidate
  costs nothing.
- The engine gained a named, tested candidate preset (~30 lines + tests, default path
  untouched); 148/148 tests green including the new v1.1-candidate equivalence and default-path
  pricing pins.

## Alternatives considered

- **Adopt P8 3→4 anyway** (the camping fix is the headline; pacing was already failing at
  1.9%): rejected — it overrides the pre-registered rule and churns the ruleset before any
  human session, against both the §5 discipline and the freeze discipline (10-roadmap §3: rules
  churn is the last resort because it invalidates playtests).
- **Re-scope the pacing metric** (e.g., pool days 2–8, or scope it to belief pairs only):
  rejected — metric gerrymandering after seeing the data; the §4.5 line is the line.
- **Adopt a different parameter** (P9 denser reveals, P3/P4 moves): rejected on W3 evidence —
  S2 measured ≤4pp for schedule variants, S1 measured P3/P4 insensitive; no parameter candidate
  reaches the band.
