# 04 — Balance & Simulation Specification

**Status:** methodology + analytical checks **[computed]** + first simulation results **[simulated,
M2 W3]** (20-pair matrix + S1–S7 sweeps, 2026-10-25 — [`m2/w3-simulation-report.md`](m2/w3-simulation-report.md);
§4.5 scorecard there: calibration PASS, band/dominance/pacing FAIL with a measured W4 retune list)
+ W4 retune measurement **[simulated, M2 W4]** — the one authorized retune pass (P8 3→4) was
measured and **REJECTED** under the §5 rule; the table below stays v1.0-alpha ([`m2/w4-balance-report-v1.md`](m2/w4-balance-report-v1.md),
[`m2/adr-004-params-v1.1.md`](m2/adr-004-params-v1.1.md)).
[computed] claims are closed-form or exhaustive-search calculations (see `tools/verification/`),
**[hypothesis]** claims need more simulation/M4 playtest, **[design judgment]** is taste.

## 1. What "balanced" means for Dead Drop

1. **Role fairness:** at equal skill, neither role's win rate leaves 45–55% (target band) — measured per rating band, since the two roles may have different learning curves.
2. **Information fairness:** the game is winnable through deduction — a competent Investigator's belief should converge on the truth faster than chance, and the convergence rate should be measurable and tunable.
3. **No dominant strategy:** no single Fugitive route policy or Investigator policy should dominate (e.g., "always beeline" or "always camp the gate").
4. **Decision richness:** budgets should bind (players should *want* more IP and more SP), but not starve (never forced into meaningless turns).
5. **Pacing:** capture days distributed across the case (not all Day-2 spikes or all Day-8 coin flips).

## 2. Parameter table (v1.0-alpha — still in force at M2 close; the W4 candidate was measured, not adopted)

| ID | Parameter | Value | Status |
|---|---|---|---|
| P1 | Days per case | 8 | [hypothesis] |
| P2 | Drops (ordered, public) | 2 | [computed: 3-drop shape infeasible in 8 days — 0/480 configs; min found 12 days] |
| P3 | Fugitive stamina (SP) | 12 | [computed-insensitive at scripted level: feasibility geometry-bound (W1); S1 shows ≥12 saturates — role is ambiguity slack] |
| P4 | Investigator intel (IP) | 10 | [computed-insensitive at scripted level: S1 shows dead in [8,12]] |
| P5 | Transit costs F/T/M | 1/2/3 | [design judgment; geometry-derived] |
| P6 | Hold cost / max | 1 SP / 2 per case | [hypothesis] |
| P7 | Probe cost / daily cap | 1 IP / 2 | [hypothesis] |
| P8 | Stakeout cost / daily cap | 3 IP / 1 | [hypothesis; W4 measured candidate 3→4 REJECTED per §5 — camping fix decisive (93.2→65.6) but pacing regresses 1.9→0.6%; preserved for M4 — ADR-004] |
| P9 | District reveal days | 3, 6 | [hypothesis; S2: adequate, ≤4pp effect — not the lever] |
| P10 | Transit reveal days | 4 | [hypothesis; S2: no effect] |
| P11 | Stakeout window | armed day d → resolves day d+1; forbidden on day 8 | fixed by rules logic |
| P12 | Generator feasibility band | min completion days ∈ [5,7] | [computed: C2-only 55/480 on the 16-pool; full C2∧C3∧C4 = **115/2208** on the widened 24-pool — see m2/aud003-constraint-analysis.md] |
| P13 | Matchmaking rating band | ±100 (launch) | [design judgment] |
| P14 | Clocks | casual 24 h / ranked 12 h | [design judgment] |

**Parameter history:** v1.0-alpha (current — unchanged since publication). M2 W4: the ≤1
retune pass was measured (P8 3→4 via ADR-003 overrides, CRN-paired) and **rejected** under the
§5 adoption rule — no value changed, no version bump; the pass is not consumed by a rejected
candidate (adoption consumes it; the explicit rejection prevents pass-shopping). Evidence:
`m2/w4-results/` + [`m2/w4-balance-report-v1.md`](../m2/w4-balance-report-v1.md) +
[`m2/adr-004-params-v1.1.md`](../m2/adr-004-params-v1.1.md). P3/P4 status downgrades above are
measurements at scripted level; values unchanged.

## 3. Computed analytical results (performed)

### 3.1 Feasibility and case-shape (exhaustive BFS over map_alpha) **[computed]**

- 3 ordered drops + gate, SP=14: minimum over all drop/gate/start configurations = **12 days**; **0/480** configurations complete ≤ 8 days even at SP=16. → The research concept's 3-drop case shape is geometrically impossible in 8 days; MVP uses 2 drops (audit A4).
- 2 drops + gate, SP=12, min-days band [5,7]: **55/480** configurations qualify (11.5%) — sufficient generator headroom for a 24-case ladder with repeats filtered. *(Convention, M1 audit AUD-002: "480" = unordered drop enumeration with drop order fixed by pool position; the generator-relevant ordered space is 113/960, the same ~11.8% rate. Constraint conjunction C2∧C3∧C4 counted at M2 W1: 8/960 on the 16-pool under the pinned C3 reading, **115/2208** after the authorized pool widening — see `m2/aud003-constraint-analysis.md`.)*
- Stamina sweep on a friendly 2-drop case: minimal days constant (7) across SP ∈ [8,14] → **feasibility is geometry-bound, not stamina-bound**; stamina's design role is route-ambiguity slack (audit A3).
- Map integrity: 48 nodes, 84 edges (F56/T16/M12), connected, degree 2–7.

### 3.2 Information algebra (closed-form) **[computed]**

Under a uniform 48-node posterior:
- Probe hit probability: **2.08%** per probe → blind probing is hopeless (expected ~24 probes to first hit; budget allows 10, capped 2/day). Information economy is structural, not decorative.
- District reveal (4 districts): removes exactly **2.00 bits** (48→12 candidates).
- Transit reveal (3 classes + "no movement"): removes **≤1.58 bits** (upper bound at uniform split).
- Stakeout capture probability = the posterior mass on the predicted node; at a perfectly split posterior that is ~2%, at a confident 50% belief ~50%. **1 stakeout = 3 probes of budget**, so committing early is mathematically dominated by information-first play *unless* end-game time pressure reverses it — this is the intended tension and a key sim readout.

### 3.3 What these results do NOT establish

They do not establish: role win-rates, fun, optimal strategies, reveal-schedule adequacy, or budget adequacy. Those require the simulation (§4) and playtests (§7). **No balance claim is proven.**

## 4. Simulation methodology (run at M2 W3 — results: m2/w3-simulation-report.md; W4 retune measurement: m2/w4-balance-report-v1.md)

> **Executed 2026-10-25.** The harness is `packages/sim` (pure TS on the engine; zero rules
> churn); policies + conventions are documented in the package README and the report §1. Raw
> outputs: `m2/w3-results/*.json`. Everything below remains the methodology spec; the §4.5
> acceptance lines now have first measured values (scorecard in the report §6).

### 4.1 Harness

The rules engine is implemented as a pure deterministic module (07-architecture §3) *before* any game client exists; the simulation harness drives it headlessly at ≥1,000 cases/second/order-of-magnitude (est. — trivial state space).

### 4.2 Agent policies (scripted, no ML at this stage)

**Fugitive policies:**
| Policy | Description | Tests |
|---|---|---|
| `F-Beeline` | Shortest feasible route, no Holds | Is prediction trivially easy? |
| `F-Random` | Uniform legal move each day | Investigator ceiling vs. noise |
| `F-LeakAware` | Avoids district changes on reveal-eve days; varies transit class pre-reveal | Does the calendar game emerge? |
| `F-Deceptive` | LeakAware + deliberate route doubling into "cleared" areas; Holds to break parity | Does deception punish naive trackers? |
| `F-SlackBurner` | Spends surplus stamina on meaningless detours | Does stamina slack actually buy ambiguity? |

**Investigator policies:**
| Policy | Description | Tests |
|---|---|---|
| `I-GreedyProbe` | Probes modal node(s) of its belief distribution; never stakes until posterior max ≥ 0.4 | Baseline information-first |
| `I-Calendar` | GreedyProbe + reserves 3 IP from day 5 for endgame stakeouts | Does budget discipline matter? |
| `I-Aggressive` | Stakes the gate or drop sites early | Is camping a dominant degenerate? |
| `I-Random` | Uniform legal actions | Floor |

Every policy pair runs on N ≥ 1,000 generated cases (seeded) per configuration. The matrix (5×4 = 20 pairs) is the balance surface.

### 4.3 Outputs and statistics

Per pair × configuration: win-rate per role with **Wilson 95% CIs**; capture-day histogram; mean IP/SP unspent (budget pressure); probe hit-rate vs. chance; stakeout hit-rate vs. posterior mass at placement (calibration of the "belief→prediction" conversion); escape-day histogram. Report format: one-page parameter verdict + retune list.

### 4.4 Scenario set

| ID | Question | Sweep |
|---|---|---|
| S1 | Baseline role balance at v1.0-alpha values | P4∈{8,10,12} × P3∈{10,12,14} |
| S2 | Reveal schedule adequacy | P9/P10 variants: {3,6}/{4} vs {2,5,7}/{4} vs {3,6}/{4,7} |
| S3 | First-mover initiative (Fugitive acts first each day) | Compare with mirrored variant (Investigator acts first) as a control run only — not a rules proposal |
| S4 | Stakeout pricing | P8 ∈ {2,3,4} × P7 ∈ {1,2} |
| S5 | Hold economy | P6 max ∈ {1,2,3} |
| S6 | Case length | P1 ∈ {7,8,9} × P12 band shifted accordingly |
| S7 | Degenerate strategy probes | I-Aggressive gate-camping; F-Beeline exploitability |

### 4.5 Win-rate targets (acceptance for M2 exit)

- `I-GreedyProbe`/`I-Calendar` vs `F-LeakAware`/`F-Deceptive`: Investigator win-rate within **45–55%** (Wilson CI reported).
- No policy pair shows a >65% win-rate for either side at α=0.05.
- Capture-day distribution: ≥60% of captures in days 4–8 (opening-day coin-flip captures indicate information poverty).
- Stakeout hit-rate must exceed the posterior mass at placement by a margin consistent with skill (if stakeouts hit ≈ chance, prediction is meaningless → retune P8 or reveal schedule).

**Measured at M2 W3** (report §6): calibration PASS; band, dominance, pacing FAIL → W4 retune
list. **Measured at M2 W4** ([`m2/w4-balance-report-v1.md`](../m2/w4-balance-report-v1.md) §1):
the P8 3→4 candidate fixes the dominance line decisively (93.2→65.6, CIs disjoint) but
regresses pacing (1.9→0.6%) — §5 rule NOT met, not adopted. **M2 exit verdict: the band and
pacing lines are parameter-unreachable at scripted competence** (S1 + S4 + W4 agree); the
retune list (report §2) carries the measured candidate (M4 re-evaluation with human data) and
the content lever (day-1 route diversity). G1 closes on the "specific retune list" branch.

## 5. Sensitivity plan (run at M2/M4)

Prioritized sweeps (each ±1 step around v1.0-alpha): P4 (IP) → P8 (stakeout cost) → P9/P10 (reveal schedule) → P3 (SP) → P1 (days) → P6 (Holds). For each: effect size on role win-rate and capture-day distribution; a change is adopted only if it moves ≥2 metrics in the desired direction without regressing a third. Parameter history is recorded in §2 (version bump per adopted change).

**M2 W4 outcome (recorded):** the P8 3→4 candidate was measured CRN-paired against the W3
baseline (1 decisive desired move, 1 directional, 1 regression — pacing 1.9→0.6%) and **not
adopted**; "moves in the desired direction" was scored significance-aware (retuned 95% CI must
exclude the baseline point estimate). The ≤1 pass budget is intact for M4 (10-roadmap M4 task 4
has its own pass); this rejection does not spend it. Full accounting: `m2/w4-results/adoption-check.json`.

## 6. Case-generator constraints (normative for M2)

1. Sample drops (2, ordered, distinct), gate, and safehouse from `map_alpha` pools (**24**/2/2 after the M2 W1 lever — pool 16→24 adopted with a documented 8-node selection, `m2/aud003-constraint-analysis.md` §4).
2. Compute minimal completion days by BFS over (node, stamina, drop-progress) — **reject** any case whose minimum ∉ [5,7] (P12).
3. Require ≥3 distinct minimal-cost first-three-day route prefixes (anti-scripting: prevents cases solvable by one memorized route). **Pinned at M2 W1:** "minimal-cost" = globally minimal SP cost (≤8 days, ≤12 SP); prefix = end-of-day positions on days 1–3; the min-day gloss and a Pareto variant were counted and rejected as gates (`m2/aud003-constraint-analysis.md` §1).
4. Require the gate to be reachable from drop-2 within 3 days at SP remaining after the cheapest drop-2 route (endgame must be a race, not a formality).
5. Record the seed and the feasibility report with every published case.
6. Diversity quota per ladder batch: no district pair may supply >50% of consecutive cases (variety, [design judgment]).

**[computed, updated M2 W1]** Constraint 2 alone admitted 55/480 on the 16-pool; the full conjunction C2∧C3∧C4 admitted only **8/960** under the pinned C3 reading — resolved by the pre-authorized lever (drop-candidate pool 16→24, 8 documented nodes): **115/2208** ordered configurations pass (4.8× the 24-case ladder need). Third-safehouse lever evaluated, not adopted. Full counts, conventions, and the normative generator constraint spec: `m2/aud003-constraint-analysis.md`.

## 7. Human validation (M4 playtest protocol)

- 15–20 participants, 2 weeks, both roles, casual async settings.
- Measures: case completion curve, probes-to-capture trend, post-case survey (fairness, tension, confusion), think-aloud sessions on 6 participants, rage-quit events in telemetry.
- Questions the playtest must answer that simulation cannot: perceived fairness of silent stakeout misses; readability of the reveal rhythm; whether Investigators feel agency vs. the Fugitive; whether the Fugitive feels hunted (vs. playing solitaire).

## 8. Open balance questions (see also 13-open-questions.md)

- Q1: EXPIRY direction (Investigator wins) — confirm or flip via S1 + S7.
- Q2: Are two district reveals + one transit reveal + two drop pins enough information for the 45–55% band? First readout: S2.
- Q3: Should ranked adopt disclosed IP handicaps? Deferred until role win-rates exist.
- Q4: Is the ±2 probes/day cap ever binding in practice? (If never binding, the cap is dead weight; if always binding, it's the real game — either way, know it.)
